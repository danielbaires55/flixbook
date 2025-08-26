package com.flixbook.flixbook_backend.repository;

import com.flixbook.flixbook_backend.model.Appuntamento;
import com.flixbook.flixbook_backend.model.StatoAppuntamento;

import java.time.LocalDateTime;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface AppuntamentoRepository extends JpaRepository<Appuntamento, Long> {

    @Query("SELECT a FROM Appuntamento a WHERE a.dataEOraFine < :now AND a.stato = :stato")
    List<Appuntamento> findAppointmentsToUpdateStatus(@Param("now") LocalDateTime now, @Param("stato") StatoAppuntamento stato);

    List<Appuntamento> findByPazienteEmail(String email);

    @Query("SELECT a FROM Appuntamento a WHERE a.medico.id = :medicoId")
    List<Appuntamento> findAppuntamentiByMedicoId(@Param("medicoId") Long medicoId);

    @Query("SELECT a FROM Appuntamento a JOIN FETCH a.paziente JOIN FETCH a.medico JOIN FETCH a.prestazione " +
           "WHERE a.stato = com.flixbook.flixbook_backend.model.StatoAppuntamento.CONFERMATO " +
           "AND (a.reminderInviato = false OR a.smsReminderInviato = false) " +
           "AND a.dataEOraInizio BETWEEN :start AND :end")
    List<Appuntamento> findAppuntamentiPerPromemoria(@Param("start") LocalDateTime start, @Param("end") LocalDateTime end);
    
    @Query("SELECT COUNT(a) FROM Appuntamento a WHERE a.medico.id = :medicoId " +
           "AND a.stato = com.flixbook.flixbook_backend.model.StatoAppuntamento.CONFERMATO " +
           "AND a.dataEOraInizio < :fineBlocco AND a.dataEOraFine > :inizioBlocco")
    long countAppuntamentiInBlocco(
            @Param("medicoId") Long medicoId, 
            @Param("inizioBlocco") LocalDateTime inizioBlocco, 
            @Param("fineBlocco") LocalDateTime fineBlocco
    );
    
    @Query("SELECT a FROM Appuntamento a JOIN FETCH a.paziente JOIN FETCH a.medico " +
           "WHERE a.stato = :stato AND a.feedbackInviato = false")
    List<Appuntamento> findByStatoAndFeedbackInviatoIsFalse(@Param("stato") StatoAppuntamento stato);

    /**
     * QUESTO È IL METODO CHE MANCAVA E CHE CAUSAVA L'ERRORE.
     * Trova gli appuntamenti ATTIVI (confermati) di un medico in un dato intervallo di tempo.
     */
    @Query("SELECT a FROM Appuntamento a WHERE a.medico.id = :medicoId " +
           "AND a.stato = com.flixbook.flixbook_backend.model.StatoAppuntamento.CONFERMATO " +
           "AND a.dataEOraInizio BETWEEN :start AND :end")
    List<Appuntamento> findByMedicoIdAndDataEOraInizioBetween(
        @Param("medicoId") Long medicoId, 
        @Param("start") LocalDateTime start, 
        @Param("end") LocalDateTime end
    );
}