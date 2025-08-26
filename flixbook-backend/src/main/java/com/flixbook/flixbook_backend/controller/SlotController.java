package com.flixbook.flixbook_backend.controller;

import com.flixbook.flixbook_backend.service.SlotService;
import com.flixbook.flixbook_backend.config.CustomUserDetails;
import com.flixbook.flixbook_backend.model.Slot;
import com.flixbook.flixbook_backend.service.CustomUserDetailsService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.Map;
import org.springframework.security.core.Authentication;

@RestController
@RequestMapping("/api/slots")
public class SlotController {

    @Autowired
    private SlotService slotService;
    @Autowired
    private CustomUserDetailsService userDetailsService;

    @GetMapping("/available")
    public ResponseEntity<List<LocalTime>> getAvailableSlots(
            @RequestParam Long medicoId,
            @RequestParam Long prestazioneId,
            @RequestParam LocalDate data) {
        List<LocalTime> slots = slotService.findAvailableSlots(medicoId, prestazioneId, data);
        return ResponseEntity.ok(slots);
    }

    @GetMapping("/prossimi-disponibili")
    public ResponseEntity<List<Map<String, Object>>> getProssimiSlot(
            @RequestParam Long prestazioneId,
            @RequestParam(required = false) Long medicoId) {
        List<Map<String, Object>> slots = slotService.findProssimiSlotDisponibili(prestazioneId, medicoId);
        return ResponseEntity.ok(slots);
    }
    
    // --- NUOVO ENDPOINT SENZA DTO ---
    @GetMapping("/available-by-day")
    public ResponseEntity<List<Map<String, Object>>> getSlotsByDay(
            @RequestParam Long prestazioneId,
            @RequestParam LocalDate data,
            @RequestParam(required = false) Long medicoId) {
        List<Map<String, Object>> slots = slotService.findSlotsForDay(prestazioneId, medicoId, data);
        return ResponseEntity.ok(slots);
    }

    // ---- Admin medico endpoints ----
    @GetMapping("/blocchi/{bloccoId}")
    public ResponseEntity<List<Slot>> listSlotsByBlocco(@PathVariable Long bloccoId, Authentication authentication) {
        CustomUserDetails user = (CustomUserDetails) userDetailsService.loadUserByUsername(authentication.getName());
        return ResponseEntity.ok(slotService.listSlotsByBlocco(bloccoId, user.getMedicoId()));
    }

    @PutMapping("/{slotId}/toggle")
    public ResponseEntity<Slot> toggleSlot(@PathVariable Long slotId, Authentication authentication) {
        CustomUserDetails user = (CustomUserDetails) userDetailsService.loadUserByUsername(authentication.getName());
        return ResponseEntity.ok(slotService.toggleSlot(slotId, user.getMedicoId()));
    }

    @DeleteMapping("/{slotId}")
    public ResponseEntity<Void> deleteSlot(@PathVariable Long slotId, Authentication authentication) {
        CustomUserDetails user = (CustomUserDetails) userDetailsService.loadUserByUsername(authentication.getName());
        slotService.deleteSlot(slotId, user.getMedicoId());
        return ResponseEntity.noContent().build();
    }
}