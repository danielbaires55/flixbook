package com.flixbook.flixbook_backend.service;

import com.flixbook.flixbook_backend.config.CustomUserDetails;
import com.flixbook.flixbook_backend.model.Collaboratore;
import com.flixbook.flixbook_backend.model.Medico;
import com.flixbook.flixbook_backend.model.Paziente;
import com.flixbook.flixbook_backend.repository.CollaboratoreRepository;
import com.flixbook.flixbook_backend.repository.MedicoRepository;
import com.flixbook.flixbook_backend.repository.PazienteRepository;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import java.util.Collections;

@Service
public class CustomUserDetailsService implements UserDetailsService {

    private final MedicoRepository medicoRepository;
    private final PazienteRepository pazienteRepository;
    private final CollaboratoreRepository collaboratoreRepository;

    public CustomUserDetailsService(MedicoRepository medicoRepository, PazienteRepository pazienteRepository, CollaboratoreRepository collaboratoreRepository) {
        this.medicoRepository = medicoRepository;
        this.pazienteRepository = pazienteRepository;
        this.collaboratoreRepository = collaboratoreRepository;
    }

    @Override
    public UserDetails loadUserByUsername(String email) throws UsernameNotFoundException {
        // --- Cerca il Medico ---
        Medico medico = medicoRepository.findByEmail(email).orElse(null);
        if (medico != null) {
            // Restituisce il nostro oggetto personalizzato
            return new CustomUserDetails(
                medico.getEmail(),
                medico.getPasswordHash(),
                Collections.singletonList(new SimpleGrantedAuthority("ROLE_MEDICO")),
                medico.getId(),
                medico.getId() // Per un medico, medicoId è il suo stesso ID
            );
        }

        // --- Cerca il Paziente ---
        Paziente paziente = pazienteRepository.findByEmail(email).orElse(null);
        if (paziente != null) {
            // Restituisce il nostro oggetto personalizzato
            return new CustomUserDetails(
                paziente.getEmail(),
                paziente.getPasswordHash(),
                Collections.singletonList(new SimpleGrantedAuthority("ROLE_PAZIENTE")),
                paziente.getId(),
                null // Un paziente non ha un medicoId di riferimento
            );
        }

        // --- Cerca il Collaboratore ---
        Collaboratore collaboratore = collaboratoreRepository.findByEmail(email).orElse(null);
        if (collaboratore != null) {
            // Restituisce il nostro oggetto personalizzato
            return new CustomUserDetails(
                collaboratore.getEmail(),
                collaboratore.getPasswordHash(),
                Collections.singletonList(new SimpleGrantedAuthority("ROLE_COLLABORATORE")),
                collaboratore.getId(),
                collaboratore.getMedico().getId() // Prende l'ID del medico associato
            );
        }

        throw new UsernameNotFoundException("Utente non trovato con email: " + email);
    }
}