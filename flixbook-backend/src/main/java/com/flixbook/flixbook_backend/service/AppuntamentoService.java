package com.flixbook.flixbook_backend.service;

import com.flixbook.flixbook_backend.model.*;
import com.flixbook.flixbook_backend.repository.AppuntamentoRepository;
import com.flixbook.flixbook_backend.repository.DisponibilitaRepository;
import com.flixbook.flixbook_backend.repository.PazienteRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;

@Service
public class AppuntamentoService {

    @Autowired
    private AppuntamentoRepository appuntamentoRepository;

    @Autowired
    private DisponibilitaRepository disponibilitaRepository;

    @Autowired
    private PazienteRepository pazienteRepository;

    public Appuntamento creaAppuntamento(Long disponibilitaId, String pazienteEmail, TipoAppuntamento tipo) {
        Disponibilita disponibilita = disponibilitaRepository.findById(disponibilitaId)
            .orElseThrow(() -> new IllegalArgumentException("Disponibilità non trovata."));

        if (disponibilita.isPrenotato()) {
            throw new IllegalArgumentException("Questa disponibilità è già prenotata.");
        }

        Paziente paziente = pazienteRepository.findByEmail(pazienteEmail)
            .orElseThrow(() -> new IllegalArgumentException("Paziente non trovato."));
        
        // Imposta la disponibilità come prenotata
        disponibilita.setPrenotato(true);
        disponibilitaRepository.save(disponibilita);

        // Crea il nuovo appuntamento
        Appuntamento appuntamento = new Appuntamento();
        appuntamento.setPaziente(paziente);
        appuntamento.setDisponibilita(disponibilita);
        appuntamento.setDataEOraInizio(LocalDateTime.of(disponibilita.getData(), disponibilita.getOraInizio()));
        appuntamento.setDataEOraFine(LocalDateTime.of(disponibilita.getData(), disponibilita.getOraFine()));
        appuntamento.setTipoAppuntamento(tipo);
        appuntamento.setStato(StatoAppuntamento.confermato);
        appuntamento.setDataPrenotazione(LocalDateTime.now());
        
        // Per ora, il link per la videocall è nullo. Potrebbe essere generato in seguito.
        if (tipo == TipoAppuntamento.virtuale) {
             appuntamento.setLinkVideocall("http://link-virtuale-da-generare.com");
        }
        
        return appuntamentoRepository.save(appuntamento);
    }
}