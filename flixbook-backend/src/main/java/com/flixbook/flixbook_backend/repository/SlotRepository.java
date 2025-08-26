package com.flixbook.flixbook_backend.repository;

import com.flixbook.flixbook_backend.model.Slot;
import com.flixbook.flixbook_backend.model.SlotStato;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.Lock;
import jakarta.persistence.LockModeType;

public interface SlotRepository extends JpaRepository<Slot, Long> {
    List<Slot> findByBloccoOrarioIdOrderByDataEOraInizio(Long bloccoId);

    List<Slot> findByMedicoIdAndDataEOraInizioBetweenAndStatoOrderByDataEOraInizio(
            Long medicoId, LocalDateTime inizio, LocalDateTime fine, SlotStato stato);

    @Query("select s from Slot s where s.medico.id = :medicoId and date(s.dataEOraInizio) = :data order by s.dataEOraInizio")
    List<Slot> findByMedicoIdAndData(Long medicoId, LocalDate data);

    boolean existsByMedico_IdAndDataEOraInizio(Long medicoId, LocalDateTime dataEOraInizio);

    Optional<Slot> findByMedico_IdAndDataEOraInizio(Long medicoId, LocalDateTime dataEOraInizio);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select s from Slot s where s.medico.id = :medicoId and s.dataEOraInizio = :dataEOraInizio")
    Optional<Slot> lockByMedicoAndStart(Long medicoId, LocalDateTime dataEOraInizio);
}
