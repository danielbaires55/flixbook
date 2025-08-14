package com.flixbook.flixbook_backend.controller;

import com.flixbook.flixbook_backend.model.Prestazione;
import com.flixbook.flixbook_backend.model.MedicoPrestazione;
import com.flixbook.flixbook_backend.repository.PrestazioneRepository;
import com.flixbook.flixbook_backend.repository.MedicoPrestazioneRepository;
import com.flixbook.flixbook_backend.service.MedicoService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable; // <-- Aggiungi questa riga
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/prestazioni")
public class PrestazioneController {

    @Autowired
    private PrestazioneRepository prestazioneRepository;
    
    @Autowired
    private MedicoService medicoService;

    @Autowired
    private MedicoPrestazioneRepository medicoPrestazioneRepository;

    // Endpoint per i pazienti: ottiene le prestazioni filtrate per specialità
    @GetMapping("/bySpecialita/{id}")
    public List<Prestazione> getPrestazioniBySpecialita(@PathVariable Long id) {
        return prestazioneRepository.findBySpecialitaId(id);
    }

    // Endpoint per i medici: ottiene le prestazioni associate al medico loggato
    @GetMapping("/by-medico-loggato")
    public List<Prestazione> getPrestazioniByMedicoLoggato() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        String username = authentication.getName();

        Long medicoId = medicoService.findMedicoByEmail(username)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Medico non trovato"))
                .getId();

        // 1. Trova tutte le associazioni per il medico loggato
        List<MedicoPrestazione> associazioni = medicoPrestazioneRepository.findByMedicoId(medicoId);

        // 2. Estrai gli ID delle prestazioni dalle associazioni
        List<Long> prestazioneIds = associazioni.stream()
                .map(MedicoPrestazione::getPrestazioneId)
                .collect(Collectors.toList());

        // 3. Recupera le entità Prestazione complete usando gli ID
        return prestazioneRepository.findAllById(prestazioneIds);
    }
}