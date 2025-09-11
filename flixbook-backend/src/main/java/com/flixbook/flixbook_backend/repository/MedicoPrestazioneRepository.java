package com.flixbook.flixbook_backend.repository;

import com.flixbook.flixbook_backend.model.MedicoPrestazione;
import com.flixbook.flixbook_backend.model.MedicoPrestazioneId;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

@Repository
public interface MedicoPrestazioneRepository extends JpaRepository<MedicoPrestazione, MedicoPrestazioneId> {
    List<MedicoPrestazione> findByMedicoId(Long medicoId);

    @Query("SELECT DISTINCT mp.medicoId FROM MedicoPrestazione mp WHERE mp.prestazioneId IN :prestazioneIds")
    List<Long> findDistinctMedicoIdsByPrestazioneIds(@Param("prestazioneIds") List<Long> prestazioneIds);

    void deleteByMedicoIdAndPrestazioneIdIn(Long medicoId, List<Long> prestazioneIds);

    void deleteByMedicoId(Long medicoId);

    void deleteByPrestazioneId(Long prestazioneId);
}