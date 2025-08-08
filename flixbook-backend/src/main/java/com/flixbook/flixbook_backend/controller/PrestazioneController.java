package com.flixbook.flixbook_backend.controller;

import com.flixbook.flixbook_backend.model.Prestazione;
import com.flixbook.flixbook_backend.repository.PrestazioneRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/prestazioni")
public class PrestazioneController {

    @Autowired
    private PrestazioneRepository prestazioneRepository;

    @GetMapping("/bySpecialita/{id}")
    public List<Prestazione> getPrestazioniBySpecialita(@PathVariable Long id) {
        return prestazioneRepository.findBySpecialitaId(id);
    }
}