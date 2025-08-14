package com.flixbook.flixbook_backend.service;

import com.flixbook.flixbook_backend.model.Paziente;
import com.flixbook.flixbook_backend.repository.PazienteRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder; // Import the PasswordEncoder
import org.springframework.stereotype.Service;
import java.util.Optional;

@Service
public class PazienteService {

    @Autowired
    private PazienteRepository pazienteRepository;

    @Autowired
    private PasswordEncoder passwordEncoder; // Inietta il PasswordEncoder

    public Paziente registerPaziente(Paziente paziente) {
        // Verifica se l'email esiste già
        if (pazienteRepository.existsByEmail(paziente.getEmail())) {
            throw new IllegalArgumentException("L'email è già in uso.");
        }

        // Cripta la password prima di salvare l'entità
        paziente.setPasswordHash(passwordEncoder.encode(paziente.getPasswordHash()));

        // Salva il paziente nel database
        return pazienteRepository.save(paziente);
    }
    
    // Metodo per trovare un paziente tramite email
    public Optional<Paziente> findPazienteByEmail(String email) {
        return pazienteRepository.findByEmail(email);
    }
}