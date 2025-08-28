package com.flixbook.flixbook_backend.controller;

import com.flixbook.flixbook_backend.config.CustomUserDetails;
import com.flixbook.flixbook_backend.model.Prestazione;
import com.flixbook.flixbook_backend.model.MedicoPrestazione;
import com.flixbook.flixbook_backend.repository.PrestazioneRepository;
import com.flixbook.flixbook_backend.repository.MedicoPrestazioneRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/prestazioni")
public class PrestazioneController {

    @Autowired
    private PrestazioneRepository prestazioneRepository;
    

    @Autowired
    private MedicoPrestazioneRepository medicoPrestazioneRepository;

    // Endpoint pubblico (rimane invariato)
    @GetMapping("/bySpecialita/{id}")
    public List<Prestazione> getPrestazioniBySpecialita(@PathVariable Long id) {
        return prestazioneRepository.findBySpecialitaId(id);
    }

    // =================================================================================
    // == ENDPOINT PER MEDICO/COLLABORATORE AGGIORNATO E CORRETTO                     ==
    // =================================================================================
    @GetMapping("/by-medico-loggato")
    public List<Prestazione> getPrestazioniByMedicoLoggato(Authentication authentication) {
        if (authentication == null || authentication.getPrincipal() == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Utente non autenticato");
        }

        // 2. Carica i dettagli completi dell'utente (medico o collaboratore)
    CustomUserDetails userDetails = (CustomUserDetails) authentication.getPrincipal();
        
        // 3. Estrai l'ID del medico di riferimento (funziona per entrambi i ruoli)
        Long medicoId = userDetails.getMedicoId();

        if (medicoId == null) {
             // Questo caso non dovrebbe accadere per un medico o collaboratore, ma è un controllo sicuro
            return Collections.emptyList();
        }

        // La logica seguente per trovare le prestazioni rimane la stessa
        List<MedicoPrestazione> associazioni = medicoPrestazioneRepository.findByMedicoId(medicoId);

        List<Long> prestazioneIds = associazioni.stream()
                .map(MedicoPrestazione::getPrestazioneId)
                .collect(Collectors.toList());

        return prestazioneRepository.findAllById(prestazioneIds);
    }
}