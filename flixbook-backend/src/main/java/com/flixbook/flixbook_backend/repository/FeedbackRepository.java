package com.flixbook.flixbook_backend.repository;

import com.flixbook.flixbook_backend.model.Feedback;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

// import java.util.List;
import java.util.Optional;

@Repository
public interface FeedbackRepository extends JpaRepository<Feedback, Long> {
    Optional<Feedback> findByAppuntamentoId(Long appuntamentoId);

    /**
     * Ritorna medie e conteggi delle valutazioni per ciascun medico.
     * Ogni elemento: Object[]{ Long medicoId, Double avg, Long cnt }
     */
    @Query("""
        SELECT a.medico.id as medicoId, AVG(f.valutazione) as avgVal, COUNT(f.id) as cnt
        FROM Feedback f
        JOIN f.appuntamento a
        GROUP BY a.medico.id
    """)
    List<Object[]> findAvgAndCountPerMedico();

    /**
     * Medie e conteggi limitati ai medici che offrono una certa prestazione.
     */
    @Query("""
        SELECT a.medico.id as medicoId, AVG(f.valutazione) as avgVal, COUNT(f.id) as cnt
        FROM Feedback f
        JOIN f.appuntamento a
        WHERE a.medico.id IN (
            SELECT m.id FROM Medico m JOIN MedicoPrestazione mp ON m.id = mp.medicoId WHERE mp.prestazioneId = :prestazioneId
        )
        GROUP BY a.medico.id
    """)
    List<Object[]> findAvgAndCountPerMedicoByPrestazione(@Param("prestazioneId") Long prestazioneId);
}