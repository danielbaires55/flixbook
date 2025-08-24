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
     * 
     * @param email L'indirizzo email del medico.
     * @return Un Optional<Medico> che può contenere il medico trovato.
     */
    public Optional<Medico> findMedicoByEmail(String email) {
        // Chiama il repository che già restituisce un Optional
        return medicoRepository.findByEmail(email);
    }

    /**
     * Salva o aggiorna un medico nel database.
     * 
     * @param medico L'oggetto Medico da salvare.
     * @return L'oggetto Medico salvato.
     */
    public Medico save(Medico medico) {
        return medicoRepository.save(medico);
    }

    /**
     * Restituisce tutti i medici presenti nel database.
     * 
     * @return Una lista di tutti i medici.
     */
    public List<Medico> findAll() {
        return medicoRepository.findAll();
    }

    /**
     * Restituisce tutti i medici associati a una prestazione specifica.
     * 
     * @param prestazioneId L'ID della prestazione.
     * @return Una lista di medici associati alla prestazione.
     */
    public List<Medico> findMediciByPrestazioneId(Long prestazioneId) {
        return medicoRepository.findMediciByPrestazioneId(prestazioneId);
    }

    public Optional<Medico> findMedicoById(Long id) {
        // Chiama il metodo standard 'findById' fornito da JpaRepository
        return medicoRepository.findById(id);
    }

}