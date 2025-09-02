package com.flixbook.flixbook_backend.repository;

import com.flixbook.flixbook_backend.model.MedicoPrestazione;
import com.flixbook.flixbook_backend.model.MedicoPrestazioneId;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface MedicoPrestazioneRepository extends JpaRepository<MedicoPrestazione, MedicoPrestazioneId> {
    List<MedicoPrestazione> findByMedicoId(Long medicoId);

    void deleteByMedicoIdAndPrestazioneIdIn(Long medicoId, List<Long> prestazioneIds);

    void deleteByMedicoId(Long medicoId);
}