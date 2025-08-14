package com.flixbook.flixbook_backend.controller;

import com.flixbook.flixbook_backend.model.Paziente;
import com.flixbook.flixbook_backend.service.PazienteService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import java.util.Optional;

@RestController
@RequestMapping("/api/pazienti")
public class PazienteController {

    @Autowired
    private PazienteService pazienteService;

    @PostMapping("/register")
    public ResponseEntity<?> registerPaziente(@RequestBody Paziente paziente) {
        try {
            Paziente newPaziente = pazienteService.registerPaziente(paziente);
            // Non restituire la password hashata
            newPaziente.setPasswordHash(null); 
            return new ResponseEntity<>(newPaziente, HttpStatus.CREATED);
        } catch (IllegalArgumentException e) {
            // Cattura l'eccezione se l'email esiste già
            return ResponseEntity.status(HttpStatus.CONFLICT).body(e.getMessage());
        }
    }
    
    // Nuovo endpoint per il profilo del paziente
    @GetMapping("/profile")
    public ResponseEntity<Paziente> getPazienteProfile() {
        // Ottiene l'oggetto di autenticazione dall'attuale contesto di sicurezza
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        
        // L'email dell'utente è il "principal" nell'oggetto di autenticazione
        String email = authentication.getName();
        
        // Usa il servizio per trovare il paziente tramite l'email
        Optional<Paziente> pazienteOptional = pazienteService.findPazienteByEmail(email);
        
        if (pazienteOptional.isPresent()) {
            // Se il paziente viene trovato, restituisci i suoi dati
            Paziente paziente = pazienteOptional.get();
            // Evita di esporre la password hashata
            paziente.setPasswordHash(null);
            return ResponseEntity.ok(paziente);
        } else {
            // Se non viene trovato, restituisci un errore 404
            return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
        }
    }
}