package com.flixbook.flixbook_backend.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import com.flixbook.flixbook_backend.model.Disponibilita;
import java.util.List;

public interface DisponibilitaRepository extends JpaRepository<Disponibilita, Long> {

    @Query("SELECT d FROM Disponibilita d " +
           "WHERE d.prestazione.id = :prestazioneId " +
           "AND d.medico.id = :medicoId " +
           "AND d.data >= CURRENT_DATE " +
           "AND d.prenotato = false")
    List<Disponibilita> findAvailableSlots(
        @Param("prestazioneId") Long prestazioneId,
        @Param("medicoId") Long medicoId);
}