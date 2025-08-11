package com.flixbook.flixbook_backend.service;

import com.flixbook.flixbook_backend.model.Medico;
import com.flixbook.flixbook_backend.repository.MedicoRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
public class MedicoService {

    @Autowired
    private MedicoRepository medicoRepository;

    /**
     * Trova un medico tramite la sua email.
     * @param email L'indirizzo email del medico.
     * @return Il medico trovato o null se non esiste.
     */
    public Medico findByEmail(String email) {
        return medicoRepository.findByEmail(email).orElse(null);
    }
    
    /**
     * Salva o aggiorna un medico nel database.
     * @param medico L'oggetto Medico da salvare.
     * @return L'oggetto Medico salvato.
     */
    public Medico save(Medico medico) {
        return medicoRepository.save(medico);
    }

    /**
     * Restituisce tutti i medici presenti nel database.
     * @return Una lista di tutti i medici.
     */
    public List<Medico> findAll() {
        return medicoRepository.findAll();
    }
}