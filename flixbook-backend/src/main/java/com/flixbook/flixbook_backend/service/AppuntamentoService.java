package com.flixbook.flixbook_backend.service;

import com.flixbook.flixbook_backend.model.*;
import com.flixbook.flixbook_backend.repository.AppuntamentoRepository;
import com.flixbook.flixbook_backend.repository.DisponibilitaRepository;
import com.flixbook.flixbook_backend.repository.PazienteRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
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
            // String linkVideocall = "https://meet.jit.si/videoconsulto";
            appuntamento.setLinkVideocall(linkVideocall);
        }

        disponibilita.setPrenotato(true);
        disponibilitaRepository.save(disponibilita);

        return appuntamentoRepository.save(appuntamento);
    }

    @Scheduled(cron = "0 0 1 * * ?")
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
    }
}