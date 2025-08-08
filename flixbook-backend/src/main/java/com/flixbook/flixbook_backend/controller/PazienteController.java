package com.flixbook.flixbook_backend.controller;

import com.flixbook.flixbook_backend.model.Paziente;
import com.flixbook.flixbook_backend.service.PazienteService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/pazienti")
public class PazienteController {

    @Autowired
    private PazienteService pazienteService;

    @PostMapping("/register")
    public ResponseEntity<Paziente> registerPaziente(@RequestBody Paziente paziente) {
        Paziente newPaziente = pazienteService.registerPaziente(paziente);
        return new ResponseEntity<>(newPaziente, HttpStatus.CREATED);
    }
}