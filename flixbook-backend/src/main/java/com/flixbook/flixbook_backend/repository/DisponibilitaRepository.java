package com.flixbook.flixbook_backend.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.flixbook.flixbook_backend.model.Disponibilita;

import java.time.LocalDate;
import java.util.List;

public interface DisponibilitaRepository extends JpaRepository<Disponibilita, Long> {

    // Trova tutte le disponibilità di un medico specifico
    List<Disponibilita> findByMedicoId(Long medicoId);


    // Disponibilità per prestazione
    List<Disponibilita> findByPrestazioneId(Long prestazioneId);

    // Disponibilità per prestazione e medico
    List<Disponibilita> findByPrestazioneIdAndMedicoId(Long prestazioneId, Long medicoId);

    // Disponibilità future (dopo oggi) per prestazione
    @Query("SELECT d FROM Disponibilita d WHERE d.prestazione.id = :prestazioneId AND d.data >= :dataOggi ORDER BY d.data, d.oraInizio")
    List<Disponibilita> findFutureByPrestazione(@Param("prestazioneId") Long prestazioneId, @Param("dataOggi") LocalDate dataOggi);

    // Disponibilità future per prestazione e medico
    @Query("SELECT d FROM Disponibilita d WHERE d.prestazione.id = :prestazioneId AND d.medico.id = :medicoId AND d.data >= :dataOggi ORDER BY d.data, d.oraInizio")
    List<Disponibilita> findFutureByPrestazioneAndMedico(@Param("prestazioneId") Long prestazioneId, @Param("medicoId") Long medicoId, @Param("dataOggi") LocalDate dataOggi);
}
