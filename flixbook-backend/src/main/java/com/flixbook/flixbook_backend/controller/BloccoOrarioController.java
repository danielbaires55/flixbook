package com.flixbook.flixbook_backend.controller;

import com.flixbook.flixbook_backend.config.CustomUserDetails;
import com.flixbook.flixbook_backend.model.BloccoOrario;
import com.flixbook.flixbook_backend.service.BloccoOrarioService;
import com.flixbook.flixbook_backend.service.CustomUserDetailsService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.Objects;

@RestController
@RequestMapping("/api/blocchi-orario")
public class BloccoOrarioController {

    @Autowired
    private BloccoOrarioService bloccoOrarioService;

    @Autowired
    private CustomUserDetailsService userDetailsService;

    @PostMapping("/create")
    public ResponseEntity<?> createBloccoOrario(@RequestBody Map<String, String> payload, Authentication authentication) {
        try {
            CustomUserDetails userDetails = (CustomUserDetails) userDetailsService.loadUserByUsername(authentication.getName());
            Long medicoId = userDetails.getMedicoId();

            // Estraiamo i dati direttamente dalla Map, senza DTO
            LocalDate data = LocalDate.parse(payload.get("data"));
            String oraInizio = payload.get("oraInizio");
            String oraFine = payload.get("oraFine");

            BloccoOrario bloccoCreato = bloccoOrarioService.createBloccoOrario(
                    medicoId,
                    data,
                    oraInizio,
                    oraFine
            );
            return new ResponseEntity<>(bloccoCreato, HttpStatus.CREATED);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @GetMapping("/medico/{medicoId}")
    public ResponseEntity<List<BloccoOrario>> getBlocchiByMedico(@PathVariable Long medicoId, Authentication authentication) {
        CustomUserDetails userDetails = (CustomUserDetails) userDetailsService.loadUserByUsername(authentication.getName());

        if (!Objects.equals(userDetails.getMedicoId(), medicoId)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        List<BloccoOrario> blocchi = bloccoOrarioService.findBlocchiFuturiByMedicoId(medicoId);
        return ResponseEntity.ok(blocchi);
    }

    @DeleteMapping("/{bloccoId}")
    public ResponseEntity<?> deleteBlocco(@PathVariable Long bloccoId, Authentication authentication) {
        try {
            CustomUserDetails userDetails = (CustomUserDetails) userDetailsService.loadUserByUsername(authentication.getName());
            Long medicoId = userDetails.getMedicoId();

            bloccoOrarioService.deleteBloccoOrario(bloccoId, medicoId);
            return ResponseEntity.noContent().build();
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }
}