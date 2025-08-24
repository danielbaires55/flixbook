package com.flixbook.flixbook_backend.service;

import com.flixbook.flixbook_backend.model.*;
import com.flixbook.flixbook_backend.repository.AppuntamentoRepository;
import com.flixbook.flixbook_backend.repository.DisponibilitaRepository;
import com.flixbook.flixbook_backend.repository.PazienteRepository;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Objects;
import java.util.UUID;
import org.springframework.beans.factory.InitializingBean;

@Service
@Transactional
public class AppuntamentoService  {

    @Autowired
    private AppuntamentoRepository appuntamentoRepository;
    @Autowired
    private DisponibilitaRepository disponibilitaRepository;
    @Autowired
    private PazienteRepository pazienteRepository;
    @Autowired
    private EmailService emailService;
    @Autowired
    private SmsService smsService;

    public Appuntamento creaAppuntamento(Long disponibilitaId, String pazienteEmail, TipoAppuntamento tipo) {
        Disponibilita disponibilita = disponibilitaRepository.findById(disponibilitaId)
                .orElseThrow(() -> new IllegalArgumentException("Disponibilità non trovata."));

        if (disponibilita.isPrenotato()) {
            throw new IllegalArgumentException("Questa disponibilità è già prenotata.");
        }

        Paziente paziente = pazienteRepository.findByEmail(pazienteEmail)
                .orElseThrow(() -> new IllegalArgumentException("Paziente non trovato."));

        Appuntamento appuntamento = new Appuntamento();
        appuntamento.setPaziente(paziente);
        appuntamento.setDisponibilita(disponibilita);
        appuntamento.setDataEOraInizio(LocalDateTime.of(disponibilita.getData(), disponibilita.getOraInizio()));
        appuntamento.setDataEOraFine(LocalDateTime.of(disponibilita.getData(), disponibilita.getOraFine()));
        appuntamento.setTipoAppuntamento(tipo);
        appuntamento.setStato(StatoAppuntamento.CONFERMATO);
        appuntamento.setDataPrenotazione(LocalDateTime.now());

        if (tipo == TipoAppuntamento.virtuale) {
            String linkVideocall = "https://meet.jit.si/" + UUID.randomUUID().toString();
            appuntamento.setLinkVideocall(linkVideocall);
        }

        disponibilita.setPrenotato(true);
        disponibilitaRepository.save(disponibilita);
        Appuntamento appuntamentoSalvato = appuntamentoRepository.save(appuntamento);

        // --- Invio mail di conferma ---
        String destinatario = paziente.getEmail();
        String oggetto = "Conferma appuntamento: " + disponibilita.getPrestazione().getNome();
        String corpo = String.format(
            "Gentile %s,\n\nIl suo appuntamento è stato confermato:\n\n- Medico: Dr. %s %s\n- Prestazione: %s\n- Data: %s\n- Ora: %s\n\n",
            paziente.getNome(), disponibilita.getMedico().getNome(), disponibilita.getMedico().getCognome(),
            disponibilita.getPrestazione().getNome(), disponibilita.getData().toString(), disponibilita.getOraInizio().toString()
        );
        if (tipo == TipoAppuntamento.virtuale) {
            corpo += "Link per la videocall:\n" + appuntamentoSalvato.getLinkVideocall() + "\n\n";
        }
        corpo += "Cordiali saluti,\nIl team di Flixbook";
        emailService.sendEmail(destinatario, oggetto, corpo);

        // --- Invio SMS di conferma ---
        String numeroTelefono = paziente.getTelefono();
        if (numeroTelefono != null && !numeroTelefono.trim().isEmpty()) {
            String dettagliSms = String.format(
                "Dr. %s %s, %s, Data: %s, Ora: %s.",
                disponibilita.getMedico().getNome(), disponibilita.getMedico().getCognome(),
                disponibilita.getPrestazione().getNome(), disponibilita.getData().toString(),
                disponibilita.getOraInizio().toString()
            );
            smsService.sendConfirmationSms(numeroTelefono, dettagliSms);
        }

        return appuntamentoSalvato;
    }

    public void annullaAppuntamento(Long appuntamentoId, String pazienteEmail) {
        Appuntamento appuntamento = appuntamentoRepository.findById(appuntamentoId)
                .orElseThrow(() -> new IllegalArgumentException("Appuntamento non trovato."));

        if (!appuntamento.getPaziente().getEmail().equals(pazienteEmail)) {
            throw new SecurityException("Non sei autorizzato ad annullare questo appuntamento.");
        }

        Disponibilita disponibilita = appuntamento.getDisponibilita();
        
        emailService.sendEmail(pazienteEmail, "Conferma annullamento appuntamento",
            "Gentile " + appuntamento.getPaziente().getNome() + ",\n\nLe confermiamo che il suo appuntamento è stato annullato con successo.\n\nCordiali saluti,\nIl team di Flixbook");

        if (disponibilita != null) {
            String destinatarioMedico = disponibilita.getMedico().getEmail();
            String oggettoMedico = "Annullamento Appuntamento da parte di un paziente";
            String corpoMedico = String.format(
                "Gentile Dr. %s,\n\nL'appuntamento con il paziente %s %s per '%s' del %s alle %s è stato annullato.\n\nLo slot è stato liberato.",
                disponibilita.getMedico().getCognome(), appuntamento.getPaziente().getNome(), appuntamento.getPaziente().getCognome(),
                disponibilita.getPrestazione().getNome(), disponibilita.getData().toString(), disponibilita.getOraInizio().toString()
            );
            emailService.sendEmail(destinatarioMedico, oggettoMedico, corpoMedico);
            
            disponibilita.setPrenotato(false);
            disponibilitaRepository.save(disponibilita);
        }

        appuntamento.setStato(StatoAppuntamento.ANNULLATO);
        appuntamento.setDisponibilita(null);
        appuntamentoRepository.save(appuntamento);
    }

    public void annullaAppuntamentoMedico(Long appuntamentoId, Long medicoIdDaToken) {
        Appuntamento appuntamento = appuntamentoRepository.findById(appuntamentoId)
                .orElseThrow(() -> new IllegalArgumentException("Appuntamento non trovato."));
        
        Disponibilita disponibilita = appuntamento.getDisponibilita();
        if (disponibilita == null) {
             throw new IllegalStateException("Impossibile annullare un appuntamento già scollegato.");
        }
        if (!Objects.equals(disponibilita.getMedico().getId(), medicoIdDaToken)) {
            throw new SecurityException("Non sei autorizzato ad annullare questo appuntamento.");
        }

        disponibilita.setPrenotato(false);
        disponibilitaRepository.save(disponibilita);

        appuntamento.setStato(StatoAppuntamento.ANNULLATO);
        appuntamento.setDisponibilita(null);
        appuntamentoRepository.save(appuntamento);

        // Invia notifica (Email e SMS) di annullamento al paziente
        Paziente paziente = appuntamento.getPaziente();
        String oggettoPaziente = "Annullamento appuntamento: " + disponibilita.getPrestazione().getNome();
        String corpoEmailPaziente = String.format(
            "Gentile %s,\n\nLa informiamo che il suo appuntamento è stato annullato dallo studio medico. Dettagli:\n\n- Medico: Dr. %s %s\n- Prestazione: %s\n- Data: %s\n- Ora: %s\n\nCordiali saluti,\nIl team di Flixbook",
            paziente.getNome(), disponibilita.getMedico().getNome(), disponibilita.getMedico().getCognome(),
            disponibilita.getPrestazione().getNome(), disponibilita.getData().toString(), disponibilita.getOraInizio().toString()
        );
        emailService.sendEmail(paziente.getEmail(), oggettoPaziente, corpoEmailPaziente);

        String numeroTelefonoPaziente = paziente.getTelefono();
        if (numeroTelefonoPaziente != null && !numeroTelefonoPaziente.trim().isEmpty()) {
            String corpoSms = String.format(
                "Il suo appuntamento con Dr. %s %s del %s alle %s è stato annullato dallo studio medico.",
                disponibilita.getMedico().getNome(), disponibilita.getMedico().getCognome(),
                disponibilita.getData().toString(), disponibilita.getOraInizio().toString()
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
            if (app.getDisponibilita() == null) continue;
            
            Paziente paziente = app.getPaziente();
            Disponibilita disponibilita = app.getDisponibilita();
            
            if (!app.isReminderInviato()) {
                String oggetto = "Promemoria appuntamento: " + disponibilita.getPrestazione().getNome();
                String corpo = String.format(
                    "Gentile %s,\n\nLe ricordiamo il suo appuntamento di domani:\n\n- Medico: Dr. %s %s\n- Prestazione: %s\n- Ora: %s\n\nCordiali saluti,\nIl team di Flixbook",
                    paziente.getNome(), disponibilita.getMedico().getNome(), disponibilita.getMedico().getCognome(),
                    disponibilita.getPrestazione().getNome(), disponibilita.getOraInizio().toString()
                );
                emailService.sendEmail(paziente.getEmail(), oggetto, corpo);
                app.setReminderInviato(true);
            }
            
            if (!app.isSmsReminderInviato()) {
                String numeroTelefono = paziente.getTelefono();
                if (numeroTelefono != null && !numeroTelefono.trim().isEmpty()) {
                    String corpoSms = String.format(
                        "Promemoria appuntamento Flixbook domani con Dr. %s %s alle %s.",
                        disponibilita.getMedico().getCognome(),
                        disponibilita.getPrestazione().getNome(),
                        disponibilita.getOraInizio().toString()
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
            if (appuntamento.getDisponibilita() == null) continue;
            
            String destinatario = appuntamento.getPaziente().getEmail();
            String oggetto = "Lascia un feedback per il tuo appuntamento";
            String feedbackLink = "http://localhost:5173/feedback/" + appuntamento.getId();
            String corpo = String.format(
                "Gentile %s,\n\nIl suo appuntamento con il Dr. %s è stato completato.\nCi aiuti a migliorare lasciando un feedback: %s\n\nGrazie!",
                appuntamento.getPaziente().getNome(),
                appuntamento.getDisponibilita().getMedico().getCognome(),
                feedbackLink
            );
            emailService.sendEmail(destinatario, oggetto, corpo);
            appuntamento.setFeedbackInviato(true);
            appuntamentoRepository.save(appuntamento);
        }
    }
}