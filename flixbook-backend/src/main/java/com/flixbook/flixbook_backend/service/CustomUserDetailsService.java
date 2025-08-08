package com.flixbook.flixbook_backend.service;

import com.flixbook.flixbook_backend.model.Medico;
import com.flixbook.flixbook_backend.repository.MedicoRepository;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import java.util.Collections;

@Service
public class CustomUserDetailsService implements UserDetailsService {

    private final MedicoRepository medicoRepository;

    public CustomUserDetailsService(MedicoRepository medicoRepository) {
        this.medicoRepository = medicoRepository;
    }

    @Override
    public UserDetails loadUserByUsername(String email) throws UsernameNotFoundException {
        // Cerca il medico per email
        Medico medico = medicoRepository.findByEmail(email)
                .orElseThrow(() -> new UsernameNotFoundException("Medico non trovato: " + email));

        // Crea un UserDetails con email e password hash
        return User.builder()
                .username(medico.getEmail())
                .password(medico.getPasswordHash())
                .authorities(Collections.emptyList())
                .build();
    }
}