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
import java.util.List;
import java.util.NoSuchElementException;
import java.util.Optional;

@Service
public class DisponibilitaService {

    @Autowired
    private DisponibilitaRepository disponibilitaRepository;

    @Autowired
    private MedicoRepository medicoRepository;

    @Autowired
    private PrestazioneRepository prestazioneRepository;

    public Disponibilita createDisponibilita(Long medicoId, Long prestazioneId, LocalDate data, LocalTime oraInizio, LocalTime oraFine) {
        Medico medico = medicoRepository.findById(medicoId)
                .orElseThrow(() -> new NoSuchElementException("Medico non trovato con ID: " + medicoId));

        Prestazione prestazione = prestazioneRepository.findById(prestazioneId)
                .orElseThrow(() -> new NoSuchElementException("Prestazione non trovata con ID: " + prestazioneId));

        Disponibilita disponibilita = new Disponibilita();
        disponibilita.setMedico(medico);
        disponibilita.setPrestazione(prestazione);
        disponibilita.setData(data);
        disponibilita.setOraInizio(oraInizio);
        disponibilita.setOraFine(oraFine);
        disponibilita.setPrenotato(false);

        return disponibilitaRepository.save(disponibilita);
    }
    
    // --- Metodi per il recupero delle disponibilità ---

    // Questo è il metodo che mancava!
    public List<Disponibilita> getDisponibilitaByMedicoId(Long medicoId) {
        return disponibilitaRepository.findByMedicoId(medicoId);
    }

    public List<Disponibilita> getDisponibilitaByPrestazione(Long prestazioneId) {
        return disponibilitaRepository.findByPrestazioneId(prestazioneId);
    }

    public List<Disponibilita> getDisponibilitaByPrestazioneAndMedico(Long prestazioneId, Long medicoId) {
        return disponibilitaRepository.findByPrestazioneIdAndMedicoId(prestazioneId, medicoId);
    }

    public List<Disponibilita> getFutureDisponibilitaByPrestazione(Long prestazioneId) {
        return disponibilitaRepository.findFutureByPrestazione(prestazioneId, LocalDate.now());
    }

    public List<Disponibilita> getFutureDisponibilitaByPrestazioneAndMedico(Long prestazioneId, Long medicoId) {
        return disponibilitaRepository.findFutureByPrestazioneAndMedico(prestazioneId, medicoId, LocalDate.now());
    }
}