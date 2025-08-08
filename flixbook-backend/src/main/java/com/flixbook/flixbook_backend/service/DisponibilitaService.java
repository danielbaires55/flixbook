package com.flixbook.flixbook_backend.service;

import com.flixbook.flixbook_backend.model.Disponibilita;
import com.flixbook.flixbook_backend.model.Medico;
import com.flixbook.flixbook_backend.model.Prestazione;
import com.flixbook.flixbook_backend.repository.DisponibilitaRepository;
import com.flixbook.flixbook_backend.repository.MedicoRepository;
import com.flixbook.flixbook_backend.repository.PrestazioneRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.NoSuchElementException;

@Service
public class DisponibilitaService {

    @Autowired
    private DisponibilitaRepository disponibilitaRepository;

    @Autowired
    private MedicoRepository medicoRepository;

    @Autowired
    private PrestazioneRepository prestazioneRepository;

    public Disponibilita createDisponibilita(Long medicoId, Long prestazioneId, LocalDate data, LocalTime oraInizio, LocalTime oraFine) {
        // Verifica che medico e prestazione esistano
        Medico medico = medicoRepository.findById(medicoId)
                .orElseThrow(() -> new NoSuchElementException("Medico non trovato con ID: " + medicoId));

        Prestazione prestazione = prestazioneRepository.findById(prestazioneId)
                .orElseThrow(() -> new NoSuchElementException("Prestazione non trovata con ID: " + prestazioneId));

        // Crea e salva l'entità Disponibilita
        Disponibilita disponibilita = new Disponibilita();
        disponibilita.setMedico(medico);
        disponibilita.setPrestazione(prestazione);
        disponibilita.setData(data);
        disponibilita.setOraInizio(oraInizio);
        disponibilita.setOraFine(oraFine);
        disponibilita.setPrenotato(false);

        return disponibilitaRepository.save(disponibilita);
    }
}