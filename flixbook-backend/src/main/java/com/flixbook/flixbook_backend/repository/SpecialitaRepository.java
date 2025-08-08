package com.flixbook.flixbook_backend.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import com.flixbook.flixbook_backend.model.Specialita;

public interface SpecialitaRepository extends JpaRepository<Specialita, Long> {
    // findAll() è già fornito da JpaRepository
}
