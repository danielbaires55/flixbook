package com.flixbook.flixbook_backend.controller;

import com.flixbook.flixbook_backend.service.SlotService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

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
}