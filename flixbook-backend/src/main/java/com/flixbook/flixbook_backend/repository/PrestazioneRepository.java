package com.flixbook.flixbook_backend.repository;

import com.flixbook.flixbook_backend.model.Prestazione;
import com.flixbook.flixbook_backend.model.TipoPrestazione;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface PrestazioneRepository extends JpaRepository<Prestazione, Long> {
    List<Prestazione> findBySpecialitaId(Long specialitaId);
    List<Prestazione> findByTipoPrestazione(TipoPrestazione tipoPrestazione);
}