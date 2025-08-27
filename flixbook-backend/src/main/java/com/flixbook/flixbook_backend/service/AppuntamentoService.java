package com.flixbook.flixbook_backend.service;

import com.flixbook.flixbook_backend.model.*;
import com.flixbook.flixbook_backend.repository.AppuntamentoRepository;
import com.flixbook.flixbook_backend.repository.MedicoRepository;
import com.flixbook.flixbook_backend.repository.PazienteRepository;
import com.flixbook.flixbook_backend.repository.PrestazioneRepository;
import com.flixbook.flixbook_backend.repository.SlotRepository;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.beans.factory.InitializingBean;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;
import java.util.Objects;
import java.util.UUID;

@Service
@Transactional
public class AppuntamentoService implements InitializingBean {

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
        // Se legato a uno slot persistito, rimettilo DISPONIBILE
        if (appuntamento.getSlot() != null) {
            appuntamento.getSlot().setStato(SlotStato.DISPONIBILE);
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
        // Se presente uno Slot collegato, liberalo rimettendolo DISPONIBILE
        if (appuntamento.getSlot() != null) {
            appuntamento.getSlot().setStato(SlotStato.DISPONIBILE);
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
            String corpoSms = String.format(
                "Il suo appuntamento con Dr. %s %s del %s alle %s è stato annullato dallo studio medico.",
                medico.getNome(), medico.getCognome(),
                appuntamento.getDataEOraInizio().toLocalDate().toString(),
                appuntamento.getDataEOraInizio().toLocalTime().toString()
            );
            smsService.sendSms(numeroTelefonoPaziente, corpoSms);
        }
    }
    
    public List<Appuntamento> findAppuntamentiByPazienteEmail(String pazienteEmail) {
        return appuntamentoRepository.findByPazienteEmail(pazienteEmail);
    }

    public List<Appuntamento> findAppuntamentiByMedicoId(Long medicoId) {
        return appuntamentoRepository.findAppuntamentiByMedicoId(medicoId);
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
                String corpo = String.format(
                    "Gentile %s,\n\nLe ricordiamo il suo appuntamento di domani:\n\n- Medico: Dr. %s %s\n- Prestazione: %s\n- Ora: %s\n\nCordiali saluti,\nIl team di Flixbook",
                    paziente.getNome(), medico.getNome(), medico.getCognome(),
                    prestazione.getNome(), app.getDataEOraInizio().toLocalTime().toString()
                );
                emailService.sendEmail(paziente.getEmail(), oggetto, corpo);
                app.setReminderInviato(true);
            }
            
            if (!app.isSmsReminderInviato()) {
                String numeroTelefono = paziente.getTelefono();
                if (numeroTelefono != null && !numeroTelefono.trim().isEmpty()) {
                    String corpoSms = String.format(
                        "Promemoria appuntamento Flixbook domani con Dr. %s %s alle %s.",
                        medico.getCognome(),
                        prestazione.getNome(),
                        app.getDataEOraInizio().toLocalTime().toString()
                    );
                    smsService.sendSms(numeroTelefono, corpoSms);
                    app.setSmsReminderInviato(true);
                }
            }
            appuntamentoRepository.save(app);
        }
    }
    
    private void inviaRichiesteFeedbackDiAvvio() {
        List<Appuntamento> appuntamentiCompletati = appuntamentoRepository.findByStatoAndFeedbackInviatoIsFalse(StatoAppuntamento.COMPLETATO);
        for (Appuntamento appuntamento : appuntamentiCompletati) {
            Paziente paziente = appuntamento.getPaziente();
            Medico medico = appuntamento.getMedico();
            
            if (paziente == null || medico == null) continue;
            
            String destinatario = paziente.getEmail();
            String oggetto = "Lascia un feedback per il tuo appuntamento";
            String feedbackLink = "http://localhost:5173/feedback/" + appuntamento.getId();
            String corpo = String.format(
                "Gentile %s,\n\nIl suo appuntamento con il Dr. %s è stato completato.\nCi aiuti a migliorare lasciando un feedback: %s\n\nGrazie!",
                paziente.getNome(),
                medico.getCognome(),
                feedbackLink
            );
            emailService.sendEmail(destinatario, oggetto, corpo);
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
        if (appuntamento.getTipoAppuntamento() == TipoAppuntamento.virtuale) {
            corpo += "Link per la videocall:\n" + appuntamento.getLinkVideocall() + "\n\n";
        }
        corpo += "Cordiali saluti,\nIl team di Flixbook";
        emailService.sendEmail(paziente.getEmail(), oggetto, corpo);

        String numeroTelefono = paziente.getTelefono();
        if (numeroTelefono != null && !numeroTelefono.trim().isEmpty()) {
            String dettagliSms = String.format(
                "Dr. %s %s, %s, Data: %s, Ora: %s.",
                medico.getNome(), medico.getCognome(), prestazione.getNome(),
                appuntamento.getDataEOraInizio().toLocalDate().toString(),
                appuntamento.getDataEOraInizio().toLocalTime().toString()
            );
            smsService.sendConfirmationSms(numeroTelefono, dettagliSms);
        }
    }
}