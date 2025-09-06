package com.flixbook.flixbook_backend.service;

import com.flixbook.flixbook_backend.dto.SedeDTO;
import com.flixbook.flixbook_backend.model.Sede;
import com.flixbook.flixbook_backend.repository.SedeRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class SedeService {

    private final SedeRepository sedeRepository;

    @Transactional(readOnly = true)
    public List<SedeDTO> listAll() {
        return sedeRepository.findAll().stream()
                .map(SedeDTO::fromEntity)
                .collect(Collectors.toList());
    }

    @Transactional
    public SedeDTO updateCoordinate(Long id, Double lat, Double lng) {
        Sede sede = sedeRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Sede non trovata"));
        sede.setLat(lat);
        sede.setLng(lng);
        // save implicito per dirty checking
        return SedeDTO.fromEntity(sede);
    }
}
