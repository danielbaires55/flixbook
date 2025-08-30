package com.flixbook.flixbook_backend.repository;

import com.flixbook.flixbook_backend.model.AppuntamentoDocumento;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AppuntamentoDocumentoRepository extends JpaRepository<AppuntamentoDocumento, Long> {
    List<AppuntamentoDocumento> findByAppuntamentoId(Long appuntamentoId);
}
