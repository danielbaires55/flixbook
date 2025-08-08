package com.flixbook.flixbook_backend.controller;

import com.flixbook.flixbook_backend.model.Disponibilita;
import com.flixbook.flixbook_backend.repository.DisponibilitaRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/disponibilita")
public class DisponibilitaController {

    @Autowired
    private DisponibilitaRepository disponibilitaRepository;

    @GetMapping
    public List<Disponibilita> getDisponibilita(@RequestParam Long prestazioneId,
                                                @RequestParam(required = false) Long medicoId) {
        if (medicoId != null) {
            return disponibilitaRepository.findByPrestazioneIdAndMedicoId(prestazioneId, medicoId);
        } else {
            return disponibilitaRepository.findByPrestazioneId(prestazioneId);
        }
    }
}