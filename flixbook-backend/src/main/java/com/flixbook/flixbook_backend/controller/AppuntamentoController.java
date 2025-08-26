package com.flixbook.flixbook_backend.controller;

import com.flixbook.flixbook_backend.config.CustomUserDetails;
import com.flixbook.flixbook_backend.model.Appuntamento;
import com.flixbook.flixbook_backend.model.TipoAppuntamento;
import com.flixbook.flixbook_backend.service.AppuntamentoService;
import com.flixbook.flixbook_backend.service.CustomUserDetailsService;
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
@RequestMapping("/api/appuntamenti")
public class AppuntamentoController {

    @Autowired
    private AppuntamentoService appuntamentoService;

    @Autowired
    private CustomUserDetailsService userDetailsService;

    // --- ENDPOINT UNICO E NUOVO PER LA CREAZIONE DA PARTE DEL PAZIENTE ---
    @PostMapping("/create")
    public ResponseEntity<?> createAppuntamento(
            @RequestParam Long pazienteId,
            @RequestParam Long medicoId,
            @RequestParam Long prestazioneId,
            @RequestParam LocalDate data,
            @RequestParam LocalTime oraInizio,
            @RequestParam TipoAppuntamento tipoAppuntamento,
            Authentication authentication) {

        // Controllo di sicurezza
        CustomUserDetails userDetails = (CustomUserDetails) userDetailsService
                .loadUserByUsername(authentication.getName());
        if (!userDetails.getUserId().equals(pazienteId)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Non autorizzato a prenotare per un altro utente.");
        }

        try {
            Appuntamento nuovoAppuntamento = appuntamentoService.creaNuovoAppuntamento(
                    pazienteId, medicoId, prestazioneId, data, oraInizio, tipoAppuntamento);
            return new ResponseEntity<>(nuovoAppuntamento, HttpStatus.CREATED);
        } catch (IllegalArgumentException | IllegalStateException e) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(e.getMessage());
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    // --- ALTRI ENDPOINT PER IL PAZIENTE ---
    @GetMapping("/paziente")
    public ResponseEntity<List<Appuntamento>> getAppuntamentiByPaziente(Authentication authentication) {
        String pazienteEmail = authentication.getName();
        List<Appuntamento> appuntamenti = appuntamentoService.findAppuntamentiByPazienteEmail(pazienteEmail);
        return ResponseEntity.ok(appuntamenti);
    }

    @PutMapping("/annulla/{appuntamentoId}")
    public ResponseEntity<String> annullaAppuntamento(@PathVariable Long appuntamentoId,
            Authentication authentication) {
        String pazienteEmail = authentication.getName();
        try {
            appuntamentoService.annullaAppuntamento(appuntamentoId, pazienteEmail);
            return ResponseEntity.ok("Appuntamento annullato con successo.");
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(e.getMessage());
        }
    }

    @GetMapping("/medico/{medicoId}")
    public ResponseEntity<List<Appuntamento>> getAppuntamentiByMedico(@PathVariable Long medicoId,
            Authentication authentication) {
        // Ora possiamo fare il cast diretto, perché il filtro funziona correttamente
        CustomUserDetails userDetails = (CustomUserDetails) authentication.getPrincipal();

        if (!Objects.equals(userDetails.getMedicoId(), medicoId)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        List<Appuntamento> appuntamenti = appuntamentoService.findAppuntamentiByMedicoId(medicoId);
        return ResponseEntity.ok(appuntamenti);
    }

    @PutMapping("/medico/annulla/{appuntamentoId}")
    public ResponseEntity<String> annullaAppuntamentoMedico(@PathVariable Long appuntamentoId,
            Authentication authentication) {
        CustomUserDetails userDetails = (CustomUserDetails) userDetailsService
                .loadUserByUsername(authentication.getName());
        Long medicoId = userDetails.getMedicoId();
        try {
            appuntamentoService.annullaAppuntamentoMedico(appuntamentoId, medicoId);
            return ResponseEntity.ok("Appuntamento annullato con successo.");
        } catch (SecurityException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(e.getMessage());
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(e.getMessage());
        }
    }
}