package com.flixbook.flixbook_backend.repository;

import com.flixbook.flixbook_backend.model.AppuntamentoDocumento;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AppuntamentoDocumentoRepository extends JpaRepository<AppuntamentoDocumento, Long> {
    List<AppuntamentoDocumento> findByAppuntamentoId(Long appuntamentoId);

    @Query("SELECT d FROM AppuntamentoDocumento d " +
        "JOIN FETCH d.appuntamento a " +
        "JOIN FETCH a.medico m " +
        "JOIN FETCH a.prestazione pr " +
        "JOIN a.paziente p " +
        "WHERE p.email = :email AND d.uploaderRole = 'MEDICO' " +
        "ORDER BY d.uploadedAt DESC")
    List<AppuntamentoDocumento> findRefertiByPazienteEmail(@Param("email") String email);
}
