package com.flixbook.flixbook_backend.repository;

import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.List;

// Simple repository to read associations from the join table without defining an entity
@Repository
public interface CollaboratoreMedicoRepository {

    // Native query to fetch medico IDs managed by the given collaboratore
    @Query(value = "SELECT medico_id FROM collaboratori_medici WHERE collaboratore_id = :collaboratoreId", nativeQuery = true)
    List<Long> findMedicoIdsByCollaboratoreId(@Param("collaboratoreId") Long collaboratoreId);

}
