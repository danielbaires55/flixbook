package com.flixbook.flixbook_backend.service;

import com.flixbook.flixbook_backend.model.*;
import com.flixbook.flixbook_backend.repository.AppuntamentoRepository;
import com.flixbook.flixbook_backend.repository.BloccoOrarioRepository;
import com.flixbook.flixbook_backend.repository.MedicoSedeRepository;
import com.flixbook.flixbook_backend.repository.SedeRepository;
import com.flixbook.flixbook_backend.repository.MedicoRepository;
import com.flixbook.flixbook_backend.repository.PazienteRepository;
import com.flixbook.flixbook_backend.repository.PrestazioneRepository;
import com.flixbook.flixbook_backend.repository.SlotRepository;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.beans.factory.InitializingBean;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;
import java.util.Objects;
import java.util.UUID;

@Service
@Transactional
public class AppuntamentoService implements InitializingBean {
    private static final Logger log = LoggerFactory.getLogger(AppuntamentoService.class);

    private static final String INDIRIZZO_STUDIO = "Via della Spiga, 10 - 20121 Milano (MI)"; // fallback
    private static final String INDIRIZZO_STUDIO_SHORT = "Via della Spiga 10, Milano"; // fallback

    @Autowired
    private AppuntamentoRepository appuntamentoRepository;
    @Autowired
    private PazienteRepository pazienteRepository;
    @Autowired
    private MedicoRepository medicoRepository;
    @Autowired
    private PrestazioneRepository prestazioneRepository;
    @Autowired
    private SlotRepository slotRepository;
    @Autowired
    private EmailService emailService;
    @Autowired
    private SmsService smsService;
    private final CalendarInviteService calendarInviteService = new CalendarInviteService();
    @Autowired
    private BloccoOrarioRepository bloccoOrarioRepository;
    @Autowired
    private MedicoSedeRepository medicoSedeRepository;
    @Autowired
    private SedeRepository sedeRepository;

    @Value("${calendar.ics.enabled:true}")
    private boolean calendarIcsEnabled;
    @Value("${calendar.google.link.enabled:true}")
    private boolean googleLinkEnabled;
    @Value("${app.frontend.base-url:http://localhost:5173}")
    private String frontendBaseUrl;

    /**
     * Crea un nuovo appuntamento dal sistema di slot dinamici, completo di notifiche.
     */
    public Appuntamento creaNuovoAppuntamento(Long pazienteId, Long medicoId, Long prestazioneId, LocalDate data, LocalTime oraInizio, TipoAppuntamento tipo) {
        Paziente paziente = pazienteRepository.findById(pazienteId)
                .orElseThrow(() -> new IllegalArgumentException("Paziente non trovato."));
        
        Medico medico = medicoRepository.findById(medicoId)
                .orElseThrow(() -> new IllegalArgumentException("Medico non trovato."));

        Prestazione prestazione = prestazioneRepository.findById(prestazioneId)
                .orElseThrow(() -> new IllegalArgumentException("Prestazione non trovata."));

        LocalTime oraFine = oraInizio.plusMinutes(prestazione.getDurataMinuti());

        // Guard: vieta prenotazioni nel passato o per slot già iniziati
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime startDateTime = data.atTime(oraInizio);
        if (!startDateTime.isAfter(now)) {
            throw new IllegalStateException("Non è possibile prenotare uno slot già iniziato o nel passato.");
        }
        
    long appuntamentiEsistenti = appuntamentoRepository.countAppuntamentiInBlocco(medicoId, data.atTime(oraInizio), data.atTime(oraFine));
        if (appuntamentiEsistenti > 0) {
            throw new IllegalStateException("Questo slot orario non è più disponibile.");
        }

        // Validazione forte sullo slot persistito: deve esistere DISPONIBILE
        slotRepository.lockByMedicoAndStart(medicoId, data.atTime(oraInizio))
                .ifPresentOrElse(s -> {
                    if (s.getStato() != SlotStato.DISPONIBILE) {
                        throw new IllegalStateException("Lo slot selezionato non è disponibile.");
                    }
                    // Prestazioni-per-blocco: se il blocco limita le prestazioni, la richiesta deve essere compatibile
                    if (s.getBloccoOrario() != null && s.getBloccoOrario().getPrestazioneIds() != null && !s.getBloccoOrario().getPrestazioneIds().isEmpty()) {
                        if (!s.getBloccoOrario().getPrestazioneIds().contains(prestazioneId)) {
                            throw new IllegalStateException("La prestazione selezionata non è disponibile in questo intervallo orario.");
                        }
                    }
                }, () -> {
                    // Se lo schema è migrato e i blocchi generano slot, l'assenza indica indisponibilità reale
                    // Se vuoi permettere prenotazione anche senza slot persistito, rimuovi questo else
                    throw new IllegalStateException("Nessuno slot disponibile per il medico e l'orario indicati.");
                });

    Appuntamento appuntamento = new Appuntamento();
        appuntamento.setPaziente(paziente);
        appuntamento.setMedico(medico);
        appuntamento.setPrestazione(prestazione);
        appuntamento.setDataEOraInizio(data.atTime(oraInizio));
        appuntamento.setDataEOraFine(data.atTime(oraFine));
        appuntamento.setTipoAppuntamento(tipo);
        appuntamento.setStato(StatoAppuntamento.CONFERMATO);
        appuntamento.setDataPrenotazione(LocalDateTime.now());
        
        if (tipo == TipoAppuntamento.virtuale) {
            appuntamento.setLinkVideocall("https://meet.jit.si/" + UUID.randomUUID().toString());
        }
        
    // Se esiste uno Slot persistito matching questo intervallo, legalo e marcane lo stato OCCUPATO
    // Nota: per semplicità cerchiamo per medico+dataInizio
    // In ambienti concorrenti sarebbe meglio bloccare pessimisticamente o usare una check unica
        slotRepository.lockByMedicoAndStart(medicoId, appuntamento.getDataEOraInizio())
                .filter(s -> s.getStato() == SlotStato.DISPONIBILE)
                .ifPresent(s -> {
                    appuntamento.setSlot(s);
                    s.setStato(SlotStato.OCCUPATO);
                });

    Appuntamento appuntamentoSalvato = appuntamentoRepository.save(appuntamento);

        inviaNotificheConferma(paziente, medico, prestazione, appuntamentoSalvato);

        return appuntamentoSalvato;
    }

    /**
     * Elimina definitivamente un appuntamento dallo storico (solo medico proprietario).
     * Consentito solo se appuntamento NON è attivo (non CONFERMATO) oppure è passato.
     */
    public void eliminaAppuntamentoStoricoMedico(Long appuntamentoId, Long medicoIdDaToken) {
        Appuntamento appuntamento = appuntamentoRepository.findById(appuntamentoId)
                .orElseThrow(() -> new IllegalArgumentException("Appuntamento non trovato."));

        Medico medico = appuntamento.getMedico();
        if (medico == null || !Objects.equals(medico.getId(), medicoIdDaToken)) {
            throw new SecurityException("Non sei autorizzato a eliminare questo appuntamento.");
        }

        // Blocco eliminazione per appuntamenti ancora attivi nel futuro
        boolean isAttivo = appuntamento.getStato() == StatoAppuntamento.CONFERMATO;
        boolean isNelFuturo = appuntamento.getDataEOraInizio() != null && appuntamento.getDataEOraInizio().isAfter(LocalDateTime.now());
        if (isAttivo && isNelFuturo) {
            throw new IllegalStateException("Non è possibile eliminare un appuntamento ancora attivo.");
        }

        // Non modifichiamo lo stato dello Slot: per ANNULLATO è già libero; per COMPLETATO è passato
        appuntamentoRepository.delete(appuntamento);
    }

    /**
     * Annulla un appuntamento su richiesta del PAZIENTE.
     */
    public void annullaAppuntamento(Long appuntamentoId, String pazienteEmail) {
        Appuntamento appuntamento = appuntamentoRepository.findById(appuntamentoId)
                .orElseThrow(() -> new IllegalArgumentException("Appuntamento non trovato."));

        if (!appuntamento.getPaziente().getEmail().equals(pazienteEmail)) {
            throw new SecurityException("Non sei autorizzato ad annullare questo appuntamento.");
        }

        emailService.sendEmail(pazienteEmail, "Conferma annullamento appuntamento",
            "Gentile " + appuntamento.getPaziente().getNome() + ",\n\nLe confermiamo che il suo appuntamento è stato annullato con successo.\n\nCordiali saluti,\nIl team di Flixbook");

        Medico medico = appuntamento.getMedico();
        Prestazione prestazione = appuntamento.getPrestazione();
        if (medico != null && prestazione != null) {
            String destinatarioMedico = medico.getEmail();
            String oggettoMedico = "Annullamento Appuntamento da parte di un paziente";
            String corpoMedico = String.format(
                "Gentile Dr. %s,\n\nL'appuntamento con il paziente %s %s per '%s' del %s alle %s è stato annullato.",
                medico.getCognome(), appuntamento.getPaziente().getNome(), appuntamento.getPaziente().getCognome(),
                prestazione.getNome(), appuntamento.getDataEOraInizio().toLocalDate().toString(), appuntamento.getDataEOraInizio().toLocalTime().toString()
            );
            emailService.sendEmail(destinatarioMedico, oggettoMedico, corpoMedico);
        }

        appuntamento.setStato(StatoAppuntamento.ANNULLATO);
        // Se legato a uno slot persistito, rimettilo DISPONIBILE e stacca il riferimento
        if (appuntamento.getSlot() != null) {
            appuntamento.getSlot().setStato(SlotStato.DISPONIBILE);
            appuntamento.setSlot(null);
        }
        appuntamentoRepository.save(appuntamento);
    }

    /**
     * Annulla un appuntamento su richiesta del MEDICO o COLLABORATORE.
     */
    public void annullaAppuntamentoMedico(Long appuntamentoId, Long medicoIdDaToken) {
        Appuntamento appuntamento = appuntamentoRepository.findById(appuntamentoId)
                .orElseThrow(() -> new IllegalArgumentException("Appuntamento non trovato."));
        
        Medico medico = appuntamento.getMedico();
        Prestazione prestazione = appuntamento.getPrestazione();

        if (medico == null || prestazione == null || !Objects.equals(medico.getId(), medicoIdDaToken)) {
            throw new SecurityException("Non sei autorizzato ad annullare questo appuntamento.");
        }
        
        appuntamento.setStato(StatoAppuntamento.ANNULLATO);
        // Se presente uno Slot collegato, liberalo rimettendolo DISPONIBILE e stacca il riferimento
        if (appuntamento.getSlot() != null) {
            appuntamento.getSlot().setStato(SlotStato.DISPONIBILE);
            appuntamento.setSlot(null);
        }
        appuntamentoRepository.save(appuntamento);

        Paziente paziente = appuntamento.getPaziente();
        String oggettoPaziente = "Annullamento appuntamento: " + prestazione.getNome();
        String corpoEmailPaziente = String.format(
            "Gentile %s,\n\nLa informiamo che il suo appuntamento è stato annullato dallo studio medico. Dettagli:\n\n- Medico: Dr. %s %s\n- Prestazione: %s\n- Data: %s\n- Ora: %s\n\nCordiali saluti,\nIl team di Flixbook",
            paziente.getNome(), medico.getNome(), medico.getCognome(),
            prestazione.getNome(), appuntamento.getDataEOraInizio().toLocalDate().toString(), 
            appuntamento.getDataEOraInizio().toLocalTime().toString()
        );
        emailService.sendEmail(paziente.getEmail(), oggettoPaziente, corpoEmailPaziente);

        String numeroTelefonoPaziente = paziente.getTelefono();
        if (numeroTelefonoPaziente != null && !numeroTelefonoPaziente.trim().isEmpty()) {
            String dettagli = String.format(
                "Dr. %s %s, %s, %s ore %s.",
                medico.getNome(), medico.getCognome(),
                prestazione.getNome(),
                appuntamento.getDataEOraInizio().toLocalDate().toString(),
                appuntamento.getDataEOraInizio().toLocalTime().toString()
            );
            smsService.sendPatientAppointmentMessage(numeroTelefonoPaziente, "Annullato", dettagli);
        }
    }
    
    public List<Appuntamento> findAppuntamentiByPazienteEmail(String pazienteEmail) {
        return appuntamentoRepository.findByPazienteEmailWithDetails(pazienteEmail);
    }

    public List<Appuntamento> findAppuntamentiByMedicoId(Long medicoId) {
        return appuntamentoRepository.findAppuntamentiByMedicoIdWithDetails(medicoId);
    }

    @Override
    public void afterPropertiesSet() {
        eseguiTaskDiAvvio();
    }
    
    public void eseguiTaskDiAvvio() {
        updateCompletedAppointments();
        inviaPromemoriaDiAvvio();
        inviaRichiesteFeedbackDiAvvio();
    }

    // Scheduler: ogni 10 minuti invia richieste feedback per appuntamenti COMPLETATI senza email inviata
    @Scheduled(fixedDelay = 600000L, initialDelay = 120000L)
    public void inviaRichiesteFeedbackPeriodiche() {
        try {
            inviaRichiesteFeedbackDiAvvio();
        } catch (Exception e) {
            if (log.isDebugEnabled()) log.debug("Errore invio richieste feedback periodiche: {}", e.getMessage());
        }
    }

    private void updateCompletedAppointments() {
        List<Appuntamento> appointmentsToComplete = appuntamentoRepository.findAppointmentsToUpdateStatus(LocalDateTime.now(), StatoAppuntamento.CONFERMATO);
        if (!appointmentsToComplete.isEmpty()) {
            appointmentsToComplete.forEach(app -> app.setStato(StatoAppuntamento.COMPLETATO));
            appuntamentoRepository.saveAll(appointmentsToComplete);
        }
    }

    private void inviaPromemoriaDiAvvio() {
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime limite24Ore = now.plusHours(24);
        List<Appuntamento> appuntamentiDaRicordare = appuntamentoRepository.findAppuntamentiPerPromemoria(now, limite24Ore);

        for (Appuntamento app : appuntamentiDaRicordare) {
            Paziente paziente = app.getPaziente();
            Medico medico = app.getMedico();
            Prestazione prestazione = app.getPrestazione();
            
            if (paziente == null || medico == null || prestazione == null) continue;
            
            if (!app.isReminderInviato()) {
                String oggetto = "Promemoria appuntamento: " + prestazione.getNome();
                StringBuilder corpoBuilder = new StringBuilder(String.format(
                    "Gentile %s,\n\nLe ricordiamo il suo appuntamento di domani:\n\n- Medico: Dr. %s %s\n- Prestazione: %s\n- Ora: %s\n",
                    paziente.getNome(), medico.getNome(), medico.getCognome(),
                    prestazione.getNome(), app.getDataEOraInizio().toLocalTime().toString()
                ));
                if (app.getTipoAppuntamento() == TipoAppuntamento.virtuale && app.getLinkVideocall() != null) {
                    corpoBuilder.append("- Videocall: ").append(app.getLinkVideocall()).append("\n\n");
                } else if (app.getTipoAppuntamento() == TipoAppuntamento.fisico) {
                    corpoBuilder.append("- Indirizzo: ").append(formatIndirizzo(app, false)).append("\n\n");
                } else {
                    corpoBuilder.append("\n");
                }
                corpoBuilder.append("Cordiali saluti,\nIl team di Flixbook");
                String corpo = corpoBuilder.toString();
                emailService.sendEmail(paziente.getEmail(), oggetto, corpo);
                app.setReminderInviato(true);
            }
            
            if (!app.isSmsReminderInviato()) {
                String numeroTelefono = paziente.getTelefono();
                if (numeroTelefono != null && !numeroTelefono.trim().isEmpty()) {
                    StringBuilder details = new StringBuilder(String.format(
                        "Dr. %s %s, %s, %s ore %s.",
                        medico.getNome(), medico.getCognome(),
                        prestazione.getNome(),
                        app.getDataEOraInizio().toLocalDate().toString(),
                        app.getDataEOraInizio().toLocalTime().toString()
                    ));
                    if (app.getTipoAppuntamento() == TipoAppuntamento.virtuale && app.getLinkVideocall() != null) {
                        details.append(" VC: ").append(app.getLinkVideocall());
                    } else if (app.getTipoAppuntamento() == TipoAppuntamento.fisico) {
                        details.append(" Ind: ").append(formatIndirizzo(app, true));
                    }
                    smsService.sendPatientAppointmentMessage(numeroTelefono, "Promemoria", details.toString());
                    app.setSmsReminderInviato(true);
                }
            }
            appuntamentoRepository.save(app);
        }
    }
    
    public void inviaRichiesteFeedbackDiAvvio() {
        List<Appuntamento> appuntamentiCompletati = appuntamentoRepository.findByStatoAndFeedbackInviatoIsFalse(StatoAppuntamento.COMPLETATO);
        if (log.isInfoEnabled()) log.info("Feedback scan: trovati {} appuntamenti COMPLETATI senza feedback", appuntamentiCompletati.size());
        for (Appuntamento appuntamento : appuntamentiCompletati) {
            Paziente paziente = appuntamento.getPaziente();
            Medico medico = appuntamento.getMedico();
            
            if (paziente == null || medico == null) continue;
            
            String destinatario = paziente.getEmail();
            String oggetto = "Lascia un feedback per il tuo appuntamento";
            String feedbackLink = frontendBaseUrl.replaceAll("/$", "") + "/feedback/" + appuntamento.getId();
            String corpo = String.format(
                "Gentile %s,\n\nIl suo appuntamento con il Dr. %s è stato completato.\nCi aiuti a migliorare lasciando un feedback: %s\n\nGrazie!",
                paziente.getNome(),
                medico.getCognome(),
                feedbackLink
            );
            try {
                emailService.sendEmail(destinatario, oggetto, corpo);
                if (log.isInfoEnabled()) log.info("Feedback email inviata a {} per appuntamento {}", destinatario, appuntamento.getId());
            } catch (Exception e) {
                if (log.isWarnEnabled()) log.warn("Invio feedback fallito per appuntamento {}: {}", appuntamento.getId(), e.getMessage());
                continue;
            }
            appuntamento.setFeedbackInviato(true);
            appuntamentoRepository.save(appuntamento);
        }
    }

    private void inviaNotificheConferma(Paziente paziente, Medico medico, Prestazione prestazione, Appuntamento appuntamento) {
        String oggetto = "Conferma appuntamento: " + prestazione.getNome();
        String corpo = String.format(
            "Gentile %s,\n\nIl suo appuntamento è stato confermato:\n\n- Medico: Dr. %s %s\n- Prestazione: %s\n- Data: %s\n- Ora: %s\n\n",
            paziente.getNome(), medico.getNome(), medico.getCognome(),
            prestazione.getNome(), appuntamento.getDataEOraInizio().toLocalDate().toString(), 
            appuntamento.getDataEOraInizio().toLocalTime().toString()
        );
        String location = null;
        if (appuntamento.getTipoAppuntamento() == TipoAppuntamento.virtuale) {
            corpo += "Link per la videocall:\n" + appuntamento.getLinkVideocall() + "\n\n";
        } else if (appuntamento.getTipoAppuntamento() == TipoAppuntamento.fisico) {
            location = formatIndirizzo(appuntamento, false);
            corpo += "Presentarsi in: " + location + "\n\n";
        }
        if (googleLinkEnabled) {
            String gLink = calendarInviteService.buildGoogleCalendarLink(appuntamento, prestazione, medico, location, appuntamento.getLinkVideocall());
            if (gLink != null && !gLink.isBlank()) {
                corpo += "Aggiungi a Google Calendar: " + gLink + "\n\n";
            }
        }
        corpo += "Cordiali saluti,\nIl team di Flixbook";
        if (calendarIcsEnabled) {
            byte[] ics = calendarInviteService.buildIcsFor(appuntamento, prestazione, medico, paziente.getEmail(), location, appuntamento.getLinkVideocall());
            emailService.sendEmailWithIcs(paziente.getEmail(), oggetto, corpo, ics);
        } else {
            emailService.sendEmail(paziente.getEmail(), oggetto, corpo);
        }

        String numeroTelefono = paziente.getTelefono();
        if (numeroTelefono != null && !numeroTelefono.trim().isEmpty()) {
            StringBuilder dettagliSmsBuilder = new StringBuilder(String.format(
                "Dr. %s %s, %s, %s ore %s.",
                medico.getNome(), medico.getCognome(), prestazione.getNome(),
                appuntamento.getDataEOraInizio().toLocalDate().toString(),
                appuntamento.getDataEOraInizio().toLocalTime().toString()
            ));
            if (appuntamento.getTipoAppuntamento() == TipoAppuntamento.virtuale && appuntamento.getLinkVideocall() != null) {
                dettagliSmsBuilder.append(" VC: ").append(appuntamento.getLinkVideocall());
            } else if (appuntamento.getTipoAppuntamento() == TipoAppuntamento.fisico) {
                dettagliSmsBuilder.append(" Ind: ").append(formatIndirizzo(appuntamento, true));
            }
            smsService.sendPatientAppointmentMessage(numeroTelefono, "Confermato", dettagliSmsBuilder.toString());
        }

        // Notifica anche il medico della nuova prenotazione
        try {
            if (medico.getEmail() != null && !medico.getEmail().isBlank()) {
                String oggettoM = "Nuova prenotazione: " + prestazione.getNome();
                StringBuilder corpoM = new StringBuilder(String.format(
                    "Gentile Dr. %s %s,\n\nÈ stata effettuata una nuova prenotazione.\n\n- Paziente: %s %s\n- Prestazione: %s\n- Data: %s\n- Ora: %s\n",
                    medico.getNome(), medico.getCognome(),
                    paziente.getNome(), paziente.getCognome(),
                    prestazione.getNome(),
                    appuntamento.getDataEOraInizio().toLocalDate().toString(),
                    appuntamento.getDataEOraInizio().toLocalTime().toString()
                ));
                if (appuntamento.getTipoAppuntamento() == TipoAppuntamento.virtuale && appuntamento.getLinkVideocall() != null) {
                    corpoM.append("\nVideocall: ").append(appuntamento.getLinkVideocall()).append("\n");
                } else if (appuntamento.getTipoAppuntamento() == TipoAppuntamento.fisico) {
                    corpoM.append("\nLuogo: ").append(formatIndirizzo(appuntamento, false)).append("\n");
                }
                corpoM.append("\nCordiali saluti,\nIl team di Flixbook");
                emailService.sendEmail(medico.getEmail(), oggettoM, corpoM.toString());
            }
        } catch (Exception ignored) {}
    }

    private String formatIndirizzo(Appuntamento app, boolean shortForm) {
        try {
            if (app.getSlot() != null && app.getSlot().getBloccoOrario() != null && app.getSlot().getBloccoOrario().getSede() != null) {
                var s = app.getSlot().getBloccoOrario().getSede();
                if (log.isDebugEnabled()) log.debug("formatIndirizzo: using slot->blocco.sede for app={} sedeId={}", app.getId(), s.getId());
                if (shortForm) {
                    StringBuilder sb = new StringBuilder();
                    if (s.getIndirizzo() != null && !s.getIndirizzo().isBlank()) sb.append(s.getIndirizzo());
                    if (s.getCitta() != null && !s.getCitta().isBlank()) {
                        if (!sb.isEmpty()) sb.append(", ");
                        sb.append(s.getCitta());
                    }
                    return sb.isEmpty() ? INDIRIZZO_STUDIO_SHORT : sb.toString();
                } else {
                    String cap = s.getCap();
                    String citta = s.getCitta();
                    String prov = s.getProvincia();
                    String indir = s.getIndirizzo();
                    StringBuilder sb = new StringBuilder();
                    if (indir != null && !indir.isBlank()) sb.append(indir);
                    if (cap != null && !cap.isBlank()) {
                        if (!sb.isEmpty()) sb.append(" - ");
                        sb.append(cap);
                    }
                    if (citta != null && !citta.isBlank()) {
                        if (!sb.isEmpty()) sb.append(" ");
                        sb.append(citta);
                    }
                    if (prov != null && !prov.isBlank()) {
                        if (!sb.isEmpty()) sb.append(" (").append(prov).append(")");
                    }
                    return sb.isEmpty() ? INDIRIZZO_STUDIO : sb.toString();
                }
            }
            // Fallback: nessuna sede sullo slot. Prova a inferire la sede dal blocco orario del medico che copre l'orario dell'appuntamento
        if (app.getMedico() != null && app.getDataEOraInizio() != null) {
                var data = app.getDataEOraInizio().toLocalDate();
                var oraInizio = app.getDataEOraInizio().toLocalTime();
                var blocchi = bloccoOrarioRepository.findByMedicoIdAndData(app.getMedico().getId(), data);
                for (var b : blocchi) {
                    if (b.getSede() == null) continue;
                    // Verifica se l'orario dell'appuntamento cade nel blocco [oraInizio, oraFine)
                    if (!oraInizio.isBefore(b.getOraFine()) || oraInizio.isBefore(b.getOraInizio())) continue;
                    var s = b.getSede();
            if (log.isDebugEnabled()) log.debug("formatIndirizzo: using blocco.sede fallback for app={} sedeId={}", app.getId(), s.getId());
                    if (shortForm) {
                        StringBuilder sb = new StringBuilder();
                        if (s.getIndirizzo() != null && !s.getIndirizzo().isBlank()) sb.append(s.getIndirizzo());
                        if (s.getCitta() != null && !s.getCitta().isBlank()) {
                            if (!sb.isEmpty()) sb.append(", ");
                            sb.append(s.getCitta());
                        }
                        return sb.isEmpty() ? INDIRIZZO_STUDIO_SHORT : sb.toString();
                    } else {
                        String cap = s.getCap();
                        String citta = s.getCitta();
                        String prov = s.getProvincia();
                        String indir = s.getIndirizzo();
                        StringBuilder sb = new StringBuilder();
                        if (indir != null && !indir.isBlank()) sb.append(indir);
                        if (cap != null && !cap.isBlank()) {
                            if (!sb.isEmpty()) sb.append(" - ");
                            sb.append(cap);
                        }
                        if (citta != null && !citta.isBlank()) {
                            if (!sb.isEmpty()) sb.append(" ");
                            sb.append(citta);
                        }
                        if (prov != null && !prov.isBlank()) {
                            if (!sb.isEmpty()) sb.append(" (").append(prov).append(")");
                        }
                        return sb.isEmpty() ? INDIRIZZO_STUDIO : sb.toString();
                    }
                }
            }
            // Fallback 2: nessuna sede deducibile dai blocchi. Prova la prima sede associata al medico
            if (app.getMedico() != null) {
                var assocs = medicoSedeRepository.findByIdMedicoId(app.getMedico().getId());
                if (assocs != null && !assocs.isEmpty()) {
                    var sedeId = assocs.get(0).getId().getSedeId();
                    var sedeOpt = sedeRepository.findById(sedeId);
                    if (sedeOpt.isPresent()) {
                        var s = sedeOpt.get();
                        log.info("formatIndirizzo: using medico->prima sede fallback for app={} sedeId={}", app.getId(), s.getId());
                        if (shortForm) {
                            StringBuilder sb = new StringBuilder();
                            if (s.getIndirizzo() != null && !s.getIndirizzo().isBlank()) sb.append(s.getIndirizzo());
                            if (s.getCitta() != null && !s.getCitta().isBlank()) {
                                if (!sb.isEmpty()) sb.append(", ");
                                sb.append(s.getCitta());
                            }
                            return sb.isEmpty() ? INDIRIZZO_STUDIO_SHORT : sb.toString();
                        } else {
                            String cap = s.getCap();
                            String citta = s.getCitta();
                            String prov = s.getProvincia();
                            String indir = s.getIndirizzo();
                            StringBuilder sb = new StringBuilder();
                            if (indir != null && !indir.isBlank()) sb.append(indir);
                            if (cap != null && !cap.isBlank()) {
                                if (!sb.isEmpty()) sb.append(" - ");
                                sb.append(cap);
                            }
                            if (citta != null && !citta.isBlank()) {
                                if (!sb.isEmpty()) sb.append(" ");
                                sb.append(citta);
                            }
                            if (prov != null && !prov.isBlank()) {
                                if (!sb.isEmpty()) sb.append(" (").append(prov).append(")");
                            }
                            return sb.isEmpty() ? INDIRIZZO_STUDIO : sb.toString();
                        }
                    }
                }
            }
        } catch (Exception ignored) {}
        return shortForm ? INDIRIZZO_STUDIO_SHORT : INDIRIZZO_STUDIO;
    }

    /**
     * Riprogramma uno appuntamento su un nuovo slot DISPONIBILE.
     * Regole:
     * - Il chiamante deve essere il proprietario (paziente stesso) o il medico/collaboratore del medico dell'appuntamento.
     * - L'appuntamento deve essere CONFERMATO e nel futuro.
     * - Lo slot target deve essere DISPONIBILE e compatibile (stesso medico o medico dell'appuntamento; prestazione ammessa dal blocco, se limitata).
     * Concorrenza: usa lock dello slot e aggiorna vecchio/new in transazione.
     */
    public Appuntamento spostaAppuntamentoSuSlot(Long appuntamentoId, Long callerUserId, String callerEmail, String callerRole,
                                                 Long targetSlotId) {
        Appuntamento appuntamento = appuntamentoRepository.findById(appuntamentoId)
                .orElseThrow(() -> new IllegalArgumentException("Appuntamento non trovato."));

        // Authorization
        boolean isPazienteCaller = callerEmail != null && appuntamento.getPaziente() != null && callerEmail.equals(appuntamento.getPaziente().getEmail());
        boolean isMedicoOrCollab = "ROLE_MEDICO".equals(callerRole) || "ROLE_COLLABORATORE".equals(callerRole) || "ROLE_ADMIN".equals(callerRole);
        if (!(isPazienteCaller || isMedicoOrCollab)) {
            throw new SecurityException("Non autorizzato a spostare questo appuntamento.");
        }

        // Only future confirmed appointments
        if (appuntamento.getStato() != StatoAppuntamento.CONFERMATO) {
            throw new IllegalStateException("Solo appuntamenti confermati possono essere spostati.");
        }
        if (!appuntamento.getDataEOraInizio().isAfter(LocalDateTime.now())) {
            throw new IllegalStateException("Non è possibile spostare appuntamenti nel passato o già iniziati.");
        }

        // Regole lato paziente: massimo 2 spostamenti e non oltre le 24h precedenti all'appuntamento
        if (isPazienteCaller) {
            if (appuntamento.getRescheduleCount() >= 2) {
                throw new IllegalStateException("Hai già spostato questo appuntamento il numero massimo di 2 volte.");
            }
            LocalDateTime cutoff = appuntamento.getDataEOraInizio().minusHours(24);
            if (!LocalDateTime.now().isBefore(cutoff)) {
                throw new IllegalStateException("Non è possibile spostare l'appuntamento nelle 24 ore precedenti all'orario previsto.");
            }
        }

        // Load and validate target slot
        Slot target = slotRepository.findById(targetSlotId)
                .orElseThrow(() -> new IllegalArgumentException("Slot di destinazione non trovato."));
        if (target.getStato() != SlotStato.DISPONIBILE) {
            throw new IllegalStateException("Lo slot selezionato non è disponibile.");
        }
        // Must belong to the same medico of the appointment (v1 constraint)
        if (target.getMedico() == null || appuntamento.getMedico() == null || !Objects.equals(target.getMedico().getId(), appuntamento.getMedico().getId())) {
            throw new IllegalStateException("Lo slot appartiene a un medico diverso.");
        }
        // If the blocco limits prestazioni, ensure compatibility
        if (target.getBloccoOrario() != null && target.getBloccoOrario().getPrestazioneIds() != null && !target.getBloccoOrario().getPrestazioneIds().isEmpty()) {
            if (!target.getBloccoOrario().getPrestazioneIds().contains(appuntamento.getPrestazione().getId())) {
                throw new IllegalStateException("La prestazione non è disponibile in questo slot.");
            }
        }

        // Concurrency-safe flip: free old slot, occupy new
        // Guard: ensure no overlap via unique medico+start constraint and OCCUPATO state
        Slot old = appuntamento.getSlot();
        target.setStato(SlotStato.OCCUPATO);
        appuntamento.setSlot(target);
        appuntamento.setDataEOraInizio(target.getDataEOraInizio());
        appuntamento.setDataEOraFine(target.getDataEOraFine());
        // Reset reminder flags so the system can notify again at the right time
        appuntamento.setReminderInviato(false);
        appuntamento.setSmsReminderInviato(false);

        if (old != null) {
            old.setStato(SlotStato.DISPONIBILE);
        }

        // Incrementa contatore se lo spostamento è partito dal paziente
        if (isPazienteCaller) {
            appuntamento.setRescheduleCount(appuntamento.getRescheduleCount() + 1);
        }
        Appuntamento saved = appuntamentoRepository.save(appuntamento);
        if (old != null) slotRepository.save(old);
        slotRepository.save(target);

        // Notify parties
        try {
            Paziente p = saved.getPaziente();
            Medico m = saved.getMedico();
            Prestazione pr = saved.getPrestazione();
            String dest = p.getEmail();
            String oggetto = "Appuntamento riprogrammato: " + pr.getNome();
            StringBuilder corpoB = new StringBuilder(String.format(
                "Gentile %s,\n\nIl suo appuntamento è stato riprogrammato:\n- Medico: Dr. %s %s\n- Prestazione: %s\n- Nuova data: %s\n- Ora: %s\n",
                p.getNome(), m.getNome(), m.getCognome(), pr.getNome(), saved.getDataEOraInizio().toLocalDate(), saved.getDataEOraInizio().toLocalTime()
            ));
            String location2 = null;
            if (saved.getTipoAppuntamento() == TipoAppuntamento.virtuale && saved.getLinkVideocall() != null) {
                corpoB.append("\nVideocall: ").append(saved.getLinkVideocall()).append("\n");
            } else if (saved.getTipoAppuntamento() == TipoAppuntamento.fisico) {
                location2 = formatIndirizzo(saved, false);
                corpoB.append("\nLuogo: ").append(location2).append("\n");
            }
            if (googleLinkEnabled) {
                String gLink2 = calendarInviteService.buildGoogleCalendarLink(saved, pr, m, location2, saved.getLinkVideocall());
                if (gLink2 != null && !gLink2.isBlank()) corpoB.append("\nAggiungi a Google Calendar: ").append(gLink2).append("\n");
            }
            corpoB.append("\nCordiali saluti,\nIl team di Flixbook");
            if (calendarIcsEnabled) {
                byte[] ics = calendarInviteService.buildIcsFor(saved, pr, m, p.getEmail(), location2, saved.getLinkVideocall());
                emailService.sendEmailWithIcs(dest, oggetto, corpoB.toString(), ics);
            } else {
                emailService.sendEmail(dest, oggetto, corpoB.toString());
            }
            // If the reschedule was initiated by the patient, inform the doctor as well
            if (callerEmail != null && p.getEmail() != null && callerEmail.equals(p.getEmail())) {
                String destMed = m.getEmail();
                if (destMed != null && !destMed.isBlank()) {
                    String oggettoM = "Riprogrammazione appuntamento da parte del paziente";
                    String corpoM = String.format(
                        "Gentile Dr. %s %s,\n\nIl paziente %s %s ha riprogrammato l'appuntamento per: %s.\nNuova data: %s\nOra: %s\n\nCordiali saluti,\nIl team di Flixbook",
                        m.getNome(), m.getCognome(), p.getNome(), p.getCognome(), pr.getNome(),
                        saved.getDataEOraInizio().toLocalDate(), saved.getDataEOraInizio().toLocalTime()
                    );
                    emailService.sendEmail(destMed, oggettoM, corpoM);
                }
            }
            if (p.getTelefono() != null && !p.getTelefono().isBlank()) {
                StringBuilder details = new StringBuilder(String.format("Dr. %s %s, %s, %s ore %s.", m.getNome(), m.getCognome(), pr.getNome(), saved.getDataEOraInizio().toLocalDate(), saved.getDataEOraInizio().toLocalTime()));
                if (saved.getTipoAppuntamento() == TipoAppuntamento.virtuale && saved.getLinkVideocall() != null) {
                    details.append(" VC: ").append(saved.getLinkVideocall());
                } else if (saved.getTipoAppuntamento() == TipoAppuntamento.fisico) {
                    details.append(" Ind: ").append(formatIndirizzo(saved, true));
                }
                smsService.sendPatientAppointmentMessage(p.getTelefono(), "Spostato", details.toString());
            }
        } catch (Exception ignored) {}

        return saved;
    }
}