package com.flixbook.flixbook_backend.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import com.flixbook.flixbook_backend.model.Medico;

public interface MedicoRepository extends JpaRepository<Medico, Long> {
    // per il filtro medico
}
