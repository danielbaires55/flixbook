// MedicoController.java
package com.flixbook.flixbook_backend.controller;

import com.flixbook.flixbook_backend.model.Medico;
import com.flixbook.flixbook_backend.service.MedicoService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/medici")
public class MedicoController {

    @Autowired
    private MedicoService medicoService;

    @GetMapping("/profile")
    public ResponseEntity<Medico> getMedicoProfile(Authentication authentication) {
        // L'oggetto 'authentication' contiene i dettagli dell'utente autenticato
        UserDetails userDetails = (UserDetails) authentication.getPrincipal();
        String email = userDetails.getUsername();

        // Usa l'email per trovare il medico nel database
        Medico medico = medicoService.findByEmail(email);

        if (medico != null) {
            return ResponseEntity.ok(medico);
        } else {
            return ResponseEntity.notFound().build();
        }
    }
}