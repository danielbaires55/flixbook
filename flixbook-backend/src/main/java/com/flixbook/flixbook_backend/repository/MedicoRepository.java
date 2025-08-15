package com.flixbook.flixbook_backend.repository;

import com.flixbook.flixbook_backend.model.Medico;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;
import java.util.List;

public interface MedicoRepository extends JpaRepository<Medico, Long> {
  // Questo metodo cerca un medico per email
  /**
   * Trova un Medico tramite la sua email.
   * Spring Data JPA genera automaticamente la query per questo metodo.
   *
   * @param email L'indirizzo email del medico.
   * @return Un Optional<Medico> che può contenere il medico trovato.
   */
  Optional<Medico> findByEmail(String email);

// MedicoRepository.java
@Query("SELECT m FROM Medico m JOIN MedicoPrestazione mp ON m.id = mp.medicoId WHERE mp.prestazioneId = :prestazioneId")
List<Medico> findMediciByPrestazioneId(@Param("prestazioneId") Long prestazioneId);
}