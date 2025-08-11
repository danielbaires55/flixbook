package com.flixbook.flixbook_backend.service;

import com.flixbook.flixbook_backend.model.Medico;
import com.flixbook.flixbook_backend.model.Paziente;
import com.flixbook.flixbook_backend.repository.MedicoRepository;
import com.flixbook.flixbook_backend.repository.PazienteRepository;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

@Service
public class CustomUserDetailsService implements UserDetailsService {

    private final MedicoRepository medicoRepository;
    private final PazienteRepository pazienteRepository;

    public CustomUserDetailsService(MedicoRepository medicoRepository, PazienteRepository pazienteRepository) {
        this.medicoRepository = medicoRepository;
        this.pazienteRepository = pazienteRepository;
    }

    @Override
    public UserDetails loadUserByUsername(String email) throws UsernameNotFoundException {
        Medico medico = medicoRepository.findByEmail(email).orElse(null);
        if (medico != null) {
            return User.builder()
                .username(medico.getEmail())
                .password(medico.getPasswordHash())
                .roles("MEDICO") // The roles method automatically adds the ROLE_ prefix
                .build();
        }

        Paziente paziente = pazienteRepository.findByEmail(email).orElse(null);
        if (paziente != null) {
            return User.builder()
                .username(paziente.getEmail())
                .password(paziente.getPasswordHash())
                .roles("PAZIENTE") // The roles method automatically adds the ROLE_ prefix
                .build();
        }

        throw new UsernameNotFoundException("Utente non trovato con email: " + email);
    }
}