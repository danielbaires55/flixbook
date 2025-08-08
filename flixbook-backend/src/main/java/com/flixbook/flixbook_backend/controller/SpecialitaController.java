package com.flixbook.flixbook_backend.controller;

import com.flixbook.flixbook_backend.model.Specialita;
import com.flixbook.flixbook_backend.repository.SpecialitaRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/specialita")
public class SpecialitaController {

    @Autowired
    private SpecialitaRepository specialitaRepository;

    @GetMapping
    public List<Specialita> getAllSpecialita() {
        return specialitaRepository.findAll();
    }
}