package com.flixbook.flixbook_backend.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.data.repository.query.Param;
import com.flixbook.flixbook_backend.model.Disponibilita;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

public interface DisponibilitaRepository extends JpaRepository<Disponibilita, Long> {

        @Query("SELECT d FROM Disponibilita d " +
                        "WHERE d.prestazione.id = :prestazioneId " +
                        "AND d.medico.id = :medicoId " +
                        "AND d.prenotato = false " +
                        "AND (d.data > CURRENT_DATE OR (d.data = CURRENT_DATE AND d.oraInizio > :currentTime))")
        List<Disponibilita> findAvailableSlots(
                        @Param("prestazioneId") Long prestazioneId,
                        @Param("medicoId") Long medicoId,
                        @Param("currentTime") LocalTime currentTime);

        @Transactional
        long deleteByDataBefore(LocalDate data); // Questo metodo eliminerà gli slot con data precedente a quella
                                                 // passata

        List<Disponibilita> findByDataBefore(LocalDate data);

        List<Disponibilita> findByMedicoId(Long medicoId);

        // Metodo per recuperare le disponibilità attive e future di un medico
        @Query("SELECT d FROM Disponibilita d " +
                        "WHERE d.medico.id = :medicoId " +
                        "AND d.prenotato = false " +
                        "AND d.data >= CURRENT_DATE " +
                        "ORDER BY d.data ASC, d.oraInizio ASC")
        List<Disponibilita> findActiveDisponibilitaByMedicoId(@Param("medicoId") Long medicoId);

        List<Disponibilita> findByMedicoIdAndPrenotatoFalse(Long medicoId);

        @Query("SELECT d FROM Disponibilita d WHERE d.prestazione.id = :prestazioneId AND d.medico.id = :medicoId AND d.prenotato = false AND d.data >= CURRENT_DATE")
        List<Disponibilita> findAvailableSlots(@Param("prestazioneId") Long prestazioneId,
                        @Param("medicoId") Long medicoId);

}