package com.flixbook.flixbook_backend.repository;

import com.flixbook.flixbook_backend.model.Medico;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

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
}