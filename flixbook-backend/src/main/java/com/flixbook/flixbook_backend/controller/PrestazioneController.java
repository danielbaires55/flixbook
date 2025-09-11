package com.flixbook.flixbook_backend.controller;

import com.flixbook.flixbook_backend.config.CustomUserDetails;
import com.flixbook.flixbook_backend.model.Prestazione;
import com.flixbook.flixbook_backend.model.MedicoPrestazione;
import com.flixbook.flixbook_backend.repository.PrestazioneRepository;
import com.flixbook.flixbook_backend.repository.PrestazioneSedeRepository;
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
    private PrestazioneSedeRepository prestazioneSedeRepository;
    

    @Autowired
    private MedicoPrestazioneRepository medicoPrestazioneRepository;

    // Endpoint pubblico (rimane invariato)
    @GetMapping("/bySpecialita/{id}")
    public List<java.util.Map<String,Object>> getPrestazioniBySpecialita(@PathVariable Long id) {
        var prestazioni = prestazioneRepository.findBySpecialitaId(id);
        java.util.List<Long> ids = prestazioni.stream().map(Prestazione::getId).toList();
        java.util.Map<Long, java.util.List<com.flixbook.flixbook_backend.model.PrestazioneSede>> pivotMap = new java.util.HashMap<>();
        if (!ids.isEmpty()) {
            var rows = prestazioneSedeRepository.findByPrestazioneIdIn(ids);
            for (var r : rows) {
                pivotMap.computeIfAbsent(r.getPrestazioneId(), k -> new java.util.ArrayList<>()).add(r);
            }
        }
        java.util.List<java.util.Map<String,Object>> out = new java.util.ArrayList<>();
        for (var p : prestazioni) {
            var rows = pivotMap.getOrDefault(p.getId(), java.util.List.of());
            Double min = null;
            if (!rows.isEmpty()) {
                min = rows.stream().map(com.flixbook.flixbook_backend.model.PrestazioneSede::getCosto)
                        .filter(java.util.Objects::nonNull)
                        .min(Double::compareTo).orElse(null);
            }
            if (min == null && p.getCosto() != null) {
                // Fallback legacy costo centrale se non sono stati configurati prezzi per sede
                min = p.getCosto();
            }
            var map = new java.util.LinkedHashMap<String,Object>();
            map.put("id", p.getId());
            map.put("nome", p.getNome());
            map.put("tipoPrestazione", p.getTipoPrestazione());
            map.put("costo", min);
            out.add(map);
        }
        return out;
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