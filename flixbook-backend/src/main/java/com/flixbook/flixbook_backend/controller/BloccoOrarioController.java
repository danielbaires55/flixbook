package com.flixbook.flixbook_backend.controller;

import com.flixbook.flixbook_backend.config.CustomUserDetails;
import com.flixbook.flixbook_backend.model.BloccoOrario;
import com.flixbook.flixbook_backend.service.BloccoOrarioService;
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


    @PostMapping("/create")
    public ResponseEntity<?> createBloccoOrario(@RequestBody Map<String, Object> payload, Authentication authentication) {
        try {
            CustomUserDetails userDetails = (CustomUserDetails) authentication.getPrincipal();
            Long medicoId = userDetails.getMedicoId();

            // Estraiamo i dati direttamente dalla Map, senza DTO
            LocalDate data = LocalDate.parse(String.valueOf(payload.get("data")));
            String oraInizio = String.valueOf(payload.get("oraInizio"));
            String oraFine = String.valueOf(payload.get("oraFine"));
            Long sedeId = null;
            Object sedeIdObj = payload.get("sedeId");
            if (sedeIdObj != null && !String.valueOf(sedeIdObj).isEmpty()) {
                try { sedeId = Long.parseLong(String.valueOf(sedeIdObj)); } catch (NumberFormatException ignored) {}
            }
            // Optional: prestazioneIds as array
            java.util.List<Long> prestazioneIds = null;
            Object pid = payload.get("prestazioneIds");
            if (pid instanceof java.util.List<?> list) {
                prestazioneIds = new java.util.ArrayList<>();
                for (Object o : list) {
                    try {
                        if (o instanceof Number n) {
                            prestazioneIds.add(n.longValue());
                        } else {
                            String s = String.valueOf(o);
                            if (s.endsWith(".0")) s = s.substring(0, s.length()-2);
                            prestazioneIds.add(Long.parseLong(s));
                        }
                    } catch (Exception ignored) {}
                }
                if (prestazioneIds.isEmpty()) prestazioneIds = null; // treat empty as null => all
            }

        String role = userDetails.getAuthorities().iterator().next().getAuthority();
        String createdByType = "ROLE_COLLABORATORE".equals(role) ? "COLLABORATORE" : "MEDICO";
        Long createdById = userDetails.getUserId();
        String createdByName = userDetails.getUsername();

        BloccoOrario bloccoCreato = bloccoOrarioService.createBloccoOrario(
            medicoId,
            data,
            oraInizio,
            oraFine,
            createdByType,
            createdById,
            createdByName,
            sedeId,
            prestazioneIds
        );
            return new ResponseEntity<>(bloccoCreato, HttpStatus.CREATED);
        } catch (IllegalStateException ise) {
            // Conflitto logico (es. sovrapposizione blocchi)
            return ResponseEntity.status(HttpStatus.CONFLICT).body(ise.getMessage());
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @GetMapping("/medico/{medicoId}")
    public ResponseEntity<List<BloccoOrario>> getBlocchiByMedico(@PathVariable Long medicoId,
                                                                 @RequestParam(value = "sedeId", required = false) Long sedeId,
                                                                 Authentication authentication) {
    CustomUserDetails userDetails = (CustomUserDetails) authentication.getPrincipal();

        if (!Objects.equals(userDetails.getMedicoId(), medicoId)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        List<BloccoOrario> blocchi = (sedeId != null)
            ? bloccoOrarioService.findBlocchiFuturiByMedicoIdAndSede(medicoId, sedeId)
            : bloccoOrarioService.findBlocchiFuturiByMedicoId(medicoId);
        return ResponseEntity.ok(blocchi);
    }

    @DeleteMapping("/{bloccoId}")
    public ResponseEntity<?> deleteBlocco(@PathVariable Long bloccoId, Authentication authentication) {
        try {
            CustomUserDetails userDetails = (CustomUserDetails) authentication.getPrincipal();
            Long medicoId = userDetails.getMedicoId();

            bloccoOrarioService.deleteBloccoOrario(bloccoId, medicoId);
            return ResponseEntity.noContent().build();
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }
}