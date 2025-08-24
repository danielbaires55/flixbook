package com.flixbook.flixbook_backend.repository;

import com.flixbook.flixbook_backend.model.Appuntamento;
import com.flixbook.flixbook_backend.model.Disponibilita;
import com.flixbook.flixbook_backend.model.StatoAppuntamento;

import java.time.LocalDateTime;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface AppuntamentoRepository extends JpaRepository<Appuntamento, Long> {

    /**
     * Trova gli appuntamenti confermati la cui data di fine è passata.
     * Usa un parametro Enum per la sicurezza dei tipi, invece di una stringa hardcoded.
     */
    @Query("SELECT a FROM Appuntamento a WHERE a.dataEOraFine < :now AND a.stato = :stato")
    List<Appuntamento> findAppointmentsToUpdateStatus(@Param("now") LocalDateTime now, @Param("stato") StatoAppuntamento stato);

    /**
     * Trova tutti gli appuntamenti di un paziente usando la sua email.
     */
    List<Appuntamento> findByPazienteEmail(String email);

    /**
     * Trova tutti gli appuntamenti di un medico usando l'ID del medico (tramite la Disponibilita).
     */
    @Query("SELECT a FROM Appuntamento a WHERE a.disponibilita.medico.id = :medicoId")
    List<Appuntamento> findAppuntamentiByMedicoId(@Param("medicoId") Long medicoId);

    /**
     * Trova gli appuntamenti per i quali deve essere inviato un promemoria (email O SMS).
     * Cerca appuntamenti confermati, nella finestra temporale corretta,
     * per cui almeno uno dei due promemoria non è ancora stato inviato.
     */
    @Query("SELECT a FROM Appuntamento a WHERE a.stato = com.flixbook.flixbook_backend.model.StatoAppuntamento.CONFERMATO " +
           "AND (a.reminderInviato = false OR a.smsReminderInviato = false) " +
           "AND a.dataEOraInizio BETWEEN :start AND :end")
    List<Appuntamento> findAppuntamentiPerPromemoria(@Param("start") LocalDateTime start, @Param("end") LocalDateTime end);
    List<Appuntamento> findByDataEOraInizioBetweenAndReminderInviatoIsFalseAndSmsReminderInviatoIsFalse(
        LocalDateTime inizioIntervallo, LocalDateTime fineIntervallo
    );
    List<Appuntamento> findByStatoAndFeedbackInviatoIsFalse(StatoAppuntamento stato);
    List<Appuntamento> findByDisponibilita(Disponibilita disponibilita);
}