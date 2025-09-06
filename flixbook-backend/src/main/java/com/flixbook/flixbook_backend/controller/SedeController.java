package com.flixbook.flixbook_backend.controller;

import com.flixbook.flixbook_backend.dto.SedeDTO;
import com.flixbook.flixbook_backend.service.SedeService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/sedi")
public class SedeController {

    @Autowired
    private SedeService sedeService;

    @GetMapping
    public List<SedeDTO> list() {
        return sedeService.listAll();
    }

    // DTO per aggiornare solo coordinate (es: dopo geocoding frontend o batch)
    public record UpdateCoordinateRequest(Double lat, Double lng) {}

    @PutMapping("/{id}/coordinate")
    public ResponseEntity<SedeDTO> updateCoordinate(@PathVariable Long id,
                                                     @RequestBody UpdateCoordinateRequest body) {
        if (body.lat() == null || body.lng() == null) {
            return ResponseEntity.badRequest().build();
        }
        SedeDTO dto = sedeService.updateCoordinate(id, body.lat(), body.lng());
        return ResponseEntity.ok(dto);
    }
}
