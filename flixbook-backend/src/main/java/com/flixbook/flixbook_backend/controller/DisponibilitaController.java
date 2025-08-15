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
            // Ottiene l'ID del medico autenticato dal token
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
            String email = authentication.getName();
            Long medicoId = medicoService.findMedicoByEmail(email)
                                             .orElseThrow(() -> new IllegalStateException("Medico non trovato"))
                                             .getId();
            
            // Chiama il service per creare la disponibilità
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
    
    // Endpoint pubblico per i pazienti per cercare le disponibilità future
    @GetMapping("/available")
    public List<Disponibilita> getAvailableDisponibilita(
            @RequestParam Long prestazioneId,
            @RequestParam(required = false) Long medicoId) {
        
        // Questo è il metodo aggiornato che usa il nostro nuovo service
        // Se medicoId non è fornito, il service dovrà essere modificato per gestirlo
        // L'approccio attuale richiede medicoId, quindi lo manteniamo
        if (medicoId != null) {
            return disponibilitaService.getAvailableSlots(prestazioneId, medicoId);
        } else {
            // Qui puoi gestire il caso in cui medicoId non è fornito,
            // ad esempio, restituendo una lista vuota o un errore
            return List.of(); 
        }
    }
}