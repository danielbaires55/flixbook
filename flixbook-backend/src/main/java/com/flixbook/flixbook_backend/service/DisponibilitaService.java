// src/main/java/com/flixbook/flixbook_backend/service/DisponibilitaService.java
package com.flixbook.flixbook_backend.service;

import com.flixbook.flixbook_backend.model.Disponibilita;
import com.flixbook.flixbook_backend.model.Medico;
import com.flixbook.flixbook_backend.model.Prestazione;
import com.flixbook.flixbook_backend.repository.DisponibilitaRepository;
import com.flixbook.flixbook_backend.repository.MedicoRepository;
import com.flixbook.flixbook_backend.repository.PrestazioneRepository;

import jakarta.transaction.Transactional;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.Objects;

@Service
public class DisponibilitaService {

    @Autowired
    private DisponibilitaRepository disponibilitaRepository;

    @Autowired
    private MedicoRepository medicoRepository;

    @Autowired
    private PrestazioneRepository prestazioneRepository;

    /**
     * Crea una nuova disponibilità.
     * Riceve il medicoId direttamente dal controller, che lo ha estratto dal token.
     */
    public Disponibilita createDisponibilita(
            Long medicoId,
            Long prestazioneId,
            LocalDate data,
            LocalTime oraInizio,
            LocalTime oraFine) {

        Medico medico = medicoRepository.findById(medicoId)
                .orElseThrow(() -> new IllegalArgumentException("Medico non trovato con ID: " + medicoId));
        Prestazione prestazione = prestazioneRepository.findById(prestazioneId)
                .orElseThrow(() -> new IllegalArgumentException("Prestazione non trovata con ID: " + prestazioneId));

        Disponibilita nuovaDisponibilita = new Disponibilita();
        nuovaDisponibilita.setMedico(medico);
        nuovaDisponibilita.setPrestazione(prestazione);
        nuovaDisponibilita.setData(data);
        nuovaDisponibilita.setOraInizio(oraInizio);
        nuovaDisponibilita.setOraFine(oraFine);
        nuovaDisponibilita.setPrenotato(false);

        return disponibilitaRepository.save(nuovaDisponibilita);
    }

    /**
     * Restituisce le disponibilità attive (non prenotate) per un dato medico.
     */
    public List<Disponibilita> getActiveDisponibilitaByMedicoId(Long medicoId) {
        return disponibilitaRepository.findByMedicoIdAndPrenotatoFalse(medicoId);
    }

    /**
     * Cancella una disponibilità, verificando prima i permessi.
     * Riceve il medicoId dell'utente autenticato per il controllo di sicurezza.
     */
    @Transactional
    public void deleteDisponibilita(Long disponibilitaId, Long medicoIdDaToken) {
        Disponibilita disponibilita = disponibilitaRepository.findById(disponibilitaId)
                .orElseThrow(() -> new IllegalArgumentException("Disponibilità non trovata."));

        // Controllo di sicurezza: l'utente può cancellare solo le disponibilità del medico a cui è associato.
        if (!Objects.equals(disponibilita.getMedico().getId(), medicoIdDaToken)) {
            throw new SecurityException("Non sei autorizzato a cancellare questa disponibilità.");
        }

        // Controllo di business: non si può cancellare una disponibilità già prenotata.
        if (disponibilita.isPrenotato()) {
            throw new IllegalStateException("Impossibile cancellare una disponibilità che ha già un appuntamento associato.");
        }

        disponibilitaRepository.delete(disponibilita);
    }

    public List<Disponibilita> getAvailableSlots(Long prestazioneId, Long medicoId) {
        return disponibilitaRepository.findAvailableSlots(prestazioneId, medicoId);
    }
}