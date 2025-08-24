package com.flixbook.flixbook_backend.controller;

import com.flixbook.flixbook_backend.config.CustomUserDetails;
import com.flixbook.flixbook_backend.model.Disponibilita;
import com.flixbook.flixbook_backend.service.CustomUserDetailsService;
import com.flixbook.flixbook_backend.service.DisponibilitaService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.Objects;

@RestController
@RequestMapping("/api/disponibilita")
public class DisponibilitaController {

    @Autowired
    private DisponibilitaService disponibilitaService;

    @Autowired
    private CustomUserDetailsService userDetailsService;

    // DTO per la richiesta
    private static class DisponibilitaRequest {
        public Long prestazioneId;
        public LocalDate data;
        public LocalTime oraInizio;
        public LocalTime oraFine;
    }

    @PostMapping("/create")
    public ResponseEntity<Disponibilita> createDisponibilita(@RequestBody DisponibilitaRequest request, Authentication authentication) {
        CustomUserDetails userDetails = (CustomUserDetails) userDetailsService.loadUserByUsername(authentication.getName());
        Long medicoId = userDetails.getMedicoId();
        try {
            Disponibilita newDisponibilita = disponibilitaService.createDisponibilita(
                    medicoId,
                    request.prestazioneId,
                    request.data,
                    request.oraInizio,
                    request.oraFine);
            return new ResponseEntity<>(newDisponibilita, HttpStatus.CREATED);
        } catch (Exception e) {
            return new ResponseEntity<>(HttpStatus.BAD_REQUEST);
        }
    }

    @GetMapping("/medico/{medicoId}")
    public ResponseEntity<List<Disponibilita>> getDisponibilitaByMedico(@PathVariable Long medicoId, Authentication authentication) {
        CustomUserDetails userDetails = (CustomUserDetails) userDetailsService.loadUserByUsername(authentication.getName());
        if (!Objects.equals(userDetails.getMedicoId(), medicoId)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        List<Disponibilita> disponibilita = disponibilitaService.getActiveDisponibilitaByMedicoId(medicoId);
        return ResponseEntity.ok(disponibilita);
    }

    @DeleteMapping("/medico/{disponibilitaId}")
    public ResponseEntity<Void> deleteDisponibilita(@PathVariable Long disponibilitaId, Authentication authentication) {
        CustomUserDetails userDetails = (CustomUserDetails) userDetailsService.loadUserByUsername(authentication.getName());
        Long medicoId = userDetails.getMedicoId();
        try {
            disponibilitaService.deleteDisponibilita(disponibilitaId, medicoId);
            return ResponseEntity.noContent().build();
        } catch (SecurityException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).build();
        }
    }

    @GetMapping("/available")
    public ResponseEntity<List<Disponibilita>> getAvailableDisponibilita(
            @RequestParam Long prestazioneId,
            @RequestParam(required = false) Long medicoId) {
        if (medicoId != null) {
            List<Disponibilita> disponibilita = disponibilitaService.getAvailableSlots(prestazioneId, medicoId);
            return ResponseEntity.ok(disponibilita);
        } else {
            return ResponseEntity.ok(List.of());
        }
    }
}