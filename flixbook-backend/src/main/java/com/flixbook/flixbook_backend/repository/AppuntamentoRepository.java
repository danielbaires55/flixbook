package com.flixbook.flixbook_backend.repository;

import com.flixbook.flixbook_backend.model.Appuntamento;

import java.time.LocalDateTime;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface AppuntamentoRepository extends JpaRepository<Appuntamento, Long> {
    @Query("SELECT a FROM Appuntamento a " +
            "WHERE (a.dataEOraInizio < :now) " +
            "AND a.stato = 'confermato'")
    List<Appuntamento> findCompletedAppointments(@Param("now") LocalDateTime now);

    @Query("SELECT a FROM Appuntamento a WHERE a.paziente.email = :email")
    List<Appuntamento> findByPazienteEmail(@Param("email") String email);

    // Nuovo metodo per trovare gli appuntamenti in base all'email del medico
    List<Appuntamento> findByDisponibilita_Medico_Email(String medicoEmail);
}