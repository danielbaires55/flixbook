package com.flixbook.flixbook_backend.controller;

import com.flixbook.flixbook_backend.model.Appuntamento;
import com.flixbook.flixbook_backend.model.TipoAppuntamento;
import com.flixbook.flixbook_backend.service.AppuntamentoService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/appuntamenti")
public class AppuntamentoController {

    @Autowired
    private AppuntamentoService appuntamentoService;

    @PostMapping("/prenota")
    public ResponseEntity<?> prenotaAppuntamento(
        @RequestParam Long disponibilitaId,
        @RequestParam TipoAppuntamento tipo
    ) {
        try {
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
            String pazienteEmail = authentication.getName();
            
            Appuntamento appuntamentoCreato = appuntamentoService.creaAppuntamento(disponibilitaId, pazienteEmail, tipo);
            return new ResponseEntity<>(appuntamentoCreato, HttpStatus.CREATED);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(e.getMessage());
        }
    }
}