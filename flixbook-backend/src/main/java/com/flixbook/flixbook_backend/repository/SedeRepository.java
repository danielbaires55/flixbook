package com.flixbook.flixbook_backend.repository;

import com.flixbook.flixbook_backend.model.Sede;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface SedeRepository extends JpaRepository<Sede, Long> {
    Optional<Sede> findByNome(String nome);
}
