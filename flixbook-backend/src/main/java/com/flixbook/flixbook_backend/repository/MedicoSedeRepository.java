package com.flixbook.flixbook_backend.repository;

import com.flixbook.flixbook_backend.model.MedicoSede;
import com.flixbook.flixbook_backend.model.MedicoSedeId;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface MedicoSedeRepository extends JpaRepository<MedicoSede, MedicoSedeId> {

    boolean existsById(MedicoSedeId id);

    @Query("select count(ms) > 0 from MedicoSede ms where ms.id.medicoId = ?1 and ms.id.sedeId = ?2 and (ms.attiva = true or ms.attiva is null)")
    boolean medicoAssociatoASede(Long medicoId, Long sedeId);

    @Query("select count(ms) from MedicoSede ms where ms.id.sedeId = ?1")
    long countBySedeId(Long sedeId);

    java.util.List<MedicoSede> findByIdMedicoId(Long medicoId);

    void deleteByIdMedicoId(Long medicoId);
}
