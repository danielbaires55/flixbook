package com.flixbook.flixbook_backend.controller;

import com.flixbook.flixbook_backend.model.Disponibilita;
import com.flixbook.flixbook_backend.service.DisponibilitaService;
import com.flixbook.flixbook_backend.service.MedicoService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/api/disponibilita")
public class DisponibilitaController {

    @Autowired
    private DisponibilitaService disponibilitaService;

    @Autowired
    private MedicoService medicoService;
    
    // DTO (Data Transfer Object) per ricevere i dati dal frontend in modo pulito
    private static class DisponibilitaRequest {
        public Long prestazioneId;
        public LocalDate data;
        public LocalTime oraInizio;
        public LocalTime oraFine;
    }

    // Endpoint per la creazione di una disponibilità da parte del medico
    // Richiede l'autenticazione del medico
    @PostMapping("/create")
    public ResponseEntity<Disponibilita> createDisponibilita(@RequestBody DisponibilitaRequest request) {
        try {
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
            String email = authentication.getName();
            Long medicoId = medicoService.findMedicoByEmail(email)
                    .orElseThrow(() -> new IllegalStateException("Medico non trovato"))
                    .getId();
            
            Disponibilita newDisponibilita = disponibilitaService.createDisponibilita(
                medicoId,
                request.prestazioneId,
                request.data,
                request.oraInizio,
                request.oraFine
            );

            return new ResponseEntity<>(newDisponibilita, HttpStatus.CREATED);
        } catch (IllegalStateException e) {
            return new ResponseEntity<>(HttpStatus.FORBIDDEN); // Medico non valido
        } catch (Exception e) {
            return new ResponseEntity<>(HttpStatus.BAD_REQUEST); // Dati non validi
        }
    }

    @GetMapping("/medico")
    public ResponseEntity<List<Disponibilita>> getDisponibilitaByMedico(Authentication authentication) {
        String emailMedico = authentication.getName();
        Optional<Long> medicoIdOptional = medicoService.findMedicoByEmail(emailMedico).map(m -> m.getId());

        if (medicoIdOptional.isEmpty()) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        List<Disponibilita> disponibilita = disponibilitaService.getDisponibilitaByMedicoId(medicoIdOptional.get());
        return ResponseEntity.ok(disponibilita);
    }
    
    // Endpoint per la visualizzazione delle disponibilità che restituisce i dati completi
    // Questo endpoint deve essere protetto tramite Spring Security
    @GetMapping("/available")
    public ResponseEntity<List<Disponibilita>> getAvailableDisponibilita(
            @RequestParam Long prestazioneId,
            @RequestParam(required = false) Long medicoId) {
                
        // Se un medicoID è fornito, usa la logica di filtering esistente
        if (medicoId != null) {
            List<Disponibilita> disponibilita = disponibilitaService.getAvailableSlots(prestazioneId, medicoId);
            return ResponseEntity.ok(disponibilita);
        } else {
            // Qui puoi gestire il caso in cui medicoId non è fornito,
            // ad esempio, restituendo una lista vuota o un errore
            return ResponseEntity.ok(List.of()); 
        }
    }

    @GetMapping("/available-authenticated")
    public ResponseEntity<List<Disponibilita>> getAvailableDisponibilitaAuthenticated(
            @RequestParam Long prestazioneId,
            @RequestParam(required = false) Long medicoId) {

        // Se un medicoID è fornito, usa la logica di filtering esistente
        if (medicoId != null) {
            // Questo metodo del servizio deve restituire i dati completi con il costo
            List<Disponibilita> disponibilita = disponibilitaService.getAvailableSlots(prestazioneId, medicoId);
            return ResponseEntity.ok(disponibilita);
        } else {
            // Qui puoi gestire il caso in cui medicoId non è fornito
            return ResponseEntity.ok(List.of());
        }
    }
}