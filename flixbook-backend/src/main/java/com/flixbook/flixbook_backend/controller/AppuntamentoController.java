package com.flixbook.flixbook_backend.controller;

import com.flixbook.flixbook_backend.model.Appuntamento;
import com.flixbook.flixbook_backend.model.TipoAppuntamento;
import com.flixbook.flixbook_backend.service.AppuntamentoService;
import java.util.List;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/appuntamenti")
public class AppuntamentoController {

    @Autowired
    private AppuntamentoService appuntamentoService;

    // Endpoint esistente per la prenotazione da parte del paziente
    @PostMapping("/prenota")
    public ResponseEntity<?> prenotaAppuntamento(
            @RequestParam Long disponibilitaId,
            @RequestParam TipoAppuntamento tipo) {
        try {
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
            String pazienteEmail = authentication.getName();
            Appuntamento appuntamentoCreato = appuntamentoService.creaAppuntamento(disponibilitaId, pazienteEmail, tipo);
            return new ResponseEntity<>(appuntamentoCreato, HttpStatus.CREATED);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(e.getMessage());
        }
    }

    // Endpoint esistente per gli appuntamenti del paziente
    @GetMapping("/paziente")
    public ResponseEntity<List<Appuntamento>> getAppuntamentiByPaziente() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        String pazienteEmail = authentication.getName();
        List<Appuntamento> appuntamenti = appuntamentoService.findAppuntamentiByPazienteEmail(pazienteEmail);
        return ResponseEntity.ok(appuntamenti);
    }
    
    // Endpoint esistente per l'annullamento da parte del paziente
    @PutMapping("/annulla/{appuntamentoId}")
    public ResponseEntity<String> annullaAppuntamento(@PathVariable Long appuntamentoId) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        String pazienteEmail = authentication.getName();
        try {
            appuntamentoService.annullaAppuntamento(appuntamentoId, pazienteEmail);
            return ResponseEntity.ok("Appuntamento annullato con successo.");
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        } catch (SecurityException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(e.getMessage());
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Errore interno durante l'annullamento.");
        }
    }

    // NUOVO: Endpoint per ottenere tutti gli appuntamenti di un medico
    @GetMapping("/medico")
    public ResponseEntity<List<Appuntamento>> getAppuntamentiByMedico() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        String medicoEmail = authentication.getName();
        List<Appuntamento> appuntamenti = appuntamentoService.findAppuntamentiByMedicoEmail(medicoEmail);
        return ResponseEntity.ok(appuntamenti);
    }

    // NUOVO: Endpoint per annullare un appuntamento da parte del medico
    @PutMapping("/medico/annulla/{appuntamentoId}")
    public ResponseEntity<String> annullaAppuntamentoMedico(@PathVariable Long appuntamentoId) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        String medicoEmail = authentication.getName();
        try {
            appuntamentoService.annullaAppuntamentoMedico(appuntamentoId, medicoEmail);
            return ResponseEntity.ok("Appuntamento annullato con successo dal medico.");
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        } catch (SecurityException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(e.getMessage());
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Errore interno durante l'annullamento da parte del medico.");
        }
    }
}