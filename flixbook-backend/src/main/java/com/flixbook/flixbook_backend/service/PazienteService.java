package com.flixbook.flixbook_backend.service;

import com.flixbook.flixbook_backend.model.Paziente;
import com.flixbook.flixbook_backend.repository.PazienteRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import java.util.Optional; // Importa Optional

@Service
public class PazienteService {

    @Autowired
    private PazienteRepository pazienteRepository;

    public Paziente registerPaziente(Paziente paziente) {
        // Qui potresti aggiungere logica di validazione o criptare la password
        // prima di salvare l'entità.
        return pazienteRepository.save(paziente);
    }
    
    // Nuovo metodo per trovare un paziente tramite email
    public Optional<Paziente> findPazienteByEmail(String email) {
        return pazienteRepository.findByEmail(email);
    }
}