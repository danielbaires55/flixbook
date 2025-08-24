package com.flixbook.flixbook_backend.repository;

import com.flixbook.flixbook_backend.model.Collaboratore;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface CollaboratoreRepository extends JpaRepository<Collaboratore, Long> {
    Optional<Collaboratore> findByEmail(String email);
}