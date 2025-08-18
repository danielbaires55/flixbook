package com.flixbook.flixbook_backend.service;

import com.flixbook.flixbook_backend.model.*;
import com.flixbook.flixbook_backend.repository.AppuntamentoRepository;
import com.flixbook.flixbook_backend.repository.DisponibilitaRepository;
import com.flixbook.flixbook_backend.repository.PazienteRepository;

import jakarta.annotation.PostConstruct;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
public class AppuntamentoService {

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

    @Transactional
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
        appuntamento.setStato(StatoAppuntamento.confermato);
        appuntamento.setDataPrenotazione(LocalDateTime.now());

        if (tipo == TipoAppuntamento.virtuale) {
            String linkVideocall = "https://meet.jit.si/" + UUID.randomUUID().toString();
            appuntamento.setLinkVideocall(linkVideocall);
        }

        disponibilita.setPrenotato(true);
        disponibilitaRepository.save(disponibilita);

        Appuntamento appuntamentoSalvato = appuntamentoRepository.save(appuntamento);

        // --- INIZIO: Personalizzazione dell'email ---
        String destinatario = paziente.getEmail();
        String oggetto = "Conferma appuntamento: " + disponibilita.getPrestazione().getNome();
        
        String corpo = "Gentile " + paziente.getNome() + ",\n\n"
                     + "Il tuo appuntamento su Flixbook è stato confermato con i seguenti dettagli:\n"
                     + "Medico: Dr. " + disponibilita.getMedico().getNome() + " " + disponibilita.getMedico().getCognome() + "\n"
                     + "Prestazione: " + disponibilita.getPrestazione().getNome() + "\n"
                     + "Data: " + disponibilita.getData().toString() + "\n"
                     + "Ora: " + disponibilita.getOraInizio().toString() + "\n"
                     + "Tipo appuntamento: " + tipo.toString() + "\n\n";

        if (tipo == TipoAppuntamento.virtuale) {
            corpo += "Ecco il link per partecipare alla videocall: " + appuntamentoSalvato.getLinkVideocall() + "\n\n";
        }

        corpo += "Ti preghiamo di presentarti in tempo per la visita.\n\n"
               + "Cordiali saluti,\n"
               + "Il team di Flixbook";
        
        emailService.sendEmail(destinatario, oggetto, corpo);
        // --- FINE: Personalizzazione dell'email ---

        // --- INIZIO: Invio SMS di conferma ---
        String numeroTelefono = paziente.getTelefono();
        if (numeroTelefono != null && !numeroTelefono.isEmpty()) {
            String dettagliSms = String.format(
                "Medico: Dr. %s %s, Prestazione: %s, Data: %s, Ora: %s. Link: %s",
                disponibilita.getMedico().getNome(),
                disponibilita.getMedico().getCognome(),
                disponibilita.getPrestazione().getNome(),
                disponibilita.getData().toString(),
                disponibilita.getOraInizio().toString(),
                (tipo == TipoAppuntamento.virtuale) ? appuntamentoSalvato.getLinkVideocall() : "N/A"
            );
            smsService.sendConfirmationSms(numeroTelefono, dettagliSms);
        }
        // --- FINE: Invio SMS di conferma ---

        return appuntamentoSalvato;
    }

    @PostConstruct
    @Transactional
    public void updateCompletedAppointments() {
        System.out.println("Avvio del task di aggiornamento appuntamenti completati...");

        List<Appuntamento> appointmentsToComplete = appuntamentoRepository.findCompletedAppointments(LocalDateTime.now());

        if (!appointmentsToComplete.isEmpty()) {
            appointmentsToComplete.forEach(appuntamento -> appuntamento.setStato(StatoAppuntamento.completato));
            appuntamentoRepository.saveAll(appointmentsToComplete);
        }

        System.out.println(String.format("Aggiornati %d appuntamenti a 'completato'.", appointmentsToComplete.size()));
    }

    public List<Appuntamento> findAppuntamentiByPazienteEmail(String pazienteEmail) {
        return appuntamentoRepository.findByPazienteEmail(pazienteEmail);
    }

    // NUOVO: Metodo per trovare tutti gli appuntamenti di un medico
    public List<Appuntamento> findAppuntamentiByMedicoEmail(String medicoEmail) {
        return appuntamentoRepository.findByDisponibilita_Medico_Email(medicoEmail);
    }

    @Transactional
    public void annullaAppuntamento(Long appuntamentoId, String pazienteEmail) {
        Appuntamento appuntamento = appuntamentoRepository.findById(appuntamentoId)
                .orElseThrow(() -> new IllegalArgumentException("Appuntamento non trovato."));

        if (!appuntamento.getPaziente().getEmail().equals(pazienteEmail)) {
            throw new SecurityException("Non sei autorizzato ad annullare questo appuntamento.");
        }

        if (appuntamento.getStato() != StatoAppuntamento.confermato) {
            throw new IllegalArgumentException("L'appuntamento non può essere annullato in questo stato.");
        }

        appuntamento.setStato(StatoAppuntamento.annullato);
        appuntamentoRepository.save(appuntamento);

        Disponibilita disponibilita = appuntamento.getDisponibilita();
        disponibilita.setPrenotato(false);
        disponibilitaRepository.save(disponibilita);

        // --- NUOVA LOGICA: Invio email di annullamento ---
        String destinatario = appuntamento.getPaziente().getEmail();
        String oggetto = "Annullamento appuntamento: " + disponibilita.getPrestazione().getNome();
        String corpo = "Gentile " + appuntamento.getPaziente().getNome() + ",\n\n"
                     + "Il tuo appuntamento su Flixbook per la prestazione '" + disponibilita.getPrestazione().getNome() 
                     + "' del " + disponibilita.getData().toString() + " alle " + disponibilita.getOraInizio().toString() 
                     + " è stato annullato.\n\n"
                     + "Se hai bisogno di un nuovo appuntamento, puoi prenotare nuovamente sulla nostra piattaforma.\n\n"
                     + "Cordiali saluti,\n"
                     + "Il team di Flixbook";

        try {
            emailService.sendEmail(destinatario, oggetto, corpo);
        } catch (Exception e) {
            System.err.println("Errore nell'invio dell'email di annullamento a " + destinatario + ": " + e.getMessage());
        }
    }

    // NUOVO: Metodo per annullare un appuntamento da parte del medico
    @Transactional
    public void annullaAppuntamentoMedico(Long appuntamentoId, String medicoEmail) {
        Appuntamento appuntamento = appuntamentoRepository.findById(appuntamentoId)
                .orElseThrow(() -> new IllegalArgumentException("Appuntamento non trovato."));

        if (!appuntamento.getDisponibilita().getMedico().getEmail().equals(medicoEmail)) {
            throw new SecurityException("Non sei autorizzato ad annullare questo appuntamento.");
        }

        if (appuntamento.getStato() != StatoAppuntamento.confermato) {
            throw new IllegalArgumentException("L'appuntamento non può essere annullato in questo stato.");
        }

        appuntamento.setStato(StatoAppuntamento.annullato);
        appuntamentoRepository.save(appuntamento);

        Disponibilita disponibilita = appuntamento.getDisponibilita();
        disponibilita.setPrenotato(false);
        disponibilitaRepository.save(disponibilita);

        // --- NUOVA LOGICA: Invio email di annullamento ---
        String destinatario = appuntamento.getPaziente().getEmail();
        String oggetto = "Annullamento appuntamento: " + disponibilita.getPrestazione().getNome();
        String corpo = "Gentile " + appuntamento.getPaziente().getNome() + ",\n\n"
                     + "Il tuo appuntamento su Flixbook per la prestazione '" + disponibilita.getPrestazione().getNome() 
                     + "' del " + disponibilita.getData().toString() + " alle " + disponibilita.getOraInizio().toString() 
                     + " è stato annullato.\n\n"
                     + "Se hai bisogno di un nuovo appuntamento, puoi prenotare nuovamente sulla nostra piattaforma.\n\n"
                     + "Cordiali saluti,\n"
                     + "Il team di Flixbook";

        try {
            emailService.sendEmail(destinatario, oggetto, corpo);
        } catch (Exception e) {
            System.err.println("Errore nell'invio dell'email di annullamento a " + destinatario + ": " + e.getMessage());
        }
    }
}