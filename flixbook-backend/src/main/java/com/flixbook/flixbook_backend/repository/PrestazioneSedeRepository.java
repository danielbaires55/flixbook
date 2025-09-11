package com.flixbook.flixbook_backend.repository;

import com.flixbook.flixbook_backend.model.PrestazioneSede;
import com.flixbook.flixbook_backend.model.PrestazioneSedeId;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface PrestazioneSedeRepository extends JpaRepository<PrestazioneSede, PrestazioneSedeId> {
    List<PrestazioneSede> findByPrestazioneId(Long prestazioneId);
    List<PrestazioneSede> findBySedeId(Long sedeId);
    List<PrestazioneSede> findByPrestazioneIdIn(List<Long> prestazioneIds);
    void deleteByPrestazioneId(Long prestazioneId);
    void deleteBySedeId(Long sedeId);
}