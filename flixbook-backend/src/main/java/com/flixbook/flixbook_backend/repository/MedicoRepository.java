package com.flixbook.flixbook_backend.repository;

import com.flixbook.flixbook_backend.model.Medico;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface MedicoRepository extends JpaRepository<Medico, Long> {
    // Questo metodo cerca un medico per email
    Optional<Medico> findByEmail(String email);
}