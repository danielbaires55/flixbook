package com.flixbook.flixbook_backend.controller;

import com.flixbook.flixbook_backend.service.SlotService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/slots")
public class SlotController {

    @Autowired
    private SlotService slotService;

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
}