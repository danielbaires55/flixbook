package com.flixbook.flixbook_backend.repository;

import com.flixbook.flixbook_backend.model.Paziente;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface PazienteRepository extends JpaRepository<Paziente, Long> {
    Optional<Paziente> findByEmail(String email);

    boolean existsByEmail(String email);
}