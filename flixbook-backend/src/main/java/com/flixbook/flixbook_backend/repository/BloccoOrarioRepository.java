package com.flixbook.flixbook_backend.repository;

import com.flixbook.flixbook_backend.model.BloccoOrario;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface BloccoOrarioRepository extends JpaRepository<BloccoOrario, Long> {

    /**
     * Trova tutti i blocchi orario per un dato medico in una data specifica.
     * Questo sarà il metodo principale usato per calcolare gli slot disponibili per
     * i pazienti.
     * Spring Data JPA costruisce la query automaticamente dal nome del metodo.
     */
    List<BloccoOrario> findByMedicoIdAndData(Long medicoId, LocalDate data);

    // Aggiungi questo metodo
    List<BloccoOrario> findByMedicoIdAndDataGreaterThanEqualOrderByDataAsc(Long medicoId, LocalDate data);

    List<BloccoOrario> findByMedicoIdAndSede_IdAndDataGreaterThanEqualOrderByDataAsc(Long medicoId, Long sedeId, LocalDate data);

    List<BloccoOrario> findByMedicoIdAndSede_IdAndData(Long medicoId, Long sedeId, LocalDate data);

    long countByMedicoId(Long medicoId);
}