package com.flixbook.flixbook_backend.controller;

import com.flixbook.flixbook_backend.model.Sede;
import com.flixbook.flixbook_backend.repository.SedeRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/sedi")
public class SedeController {

    @Autowired
    private SedeRepository sedeRepository;

    @GetMapping
    public List<Sede> list() {
        return sedeRepository.findAll();
    }
}
