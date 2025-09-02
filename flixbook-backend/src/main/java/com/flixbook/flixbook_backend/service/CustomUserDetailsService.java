package com.flixbook.flixbook_backend.service;

import com.flixbook.flixbook_backend.config.CustomUserDetails;
import com.flixbook.flixbook_backend.model.Collaboratore;
import com.flixbook.flixbook_backend.model.Admin;
import com.flixbook.flixbook_backend.model.Medico;
import com.flixbook.flixbook_backend.model.Paziente;
import com.flixbook.flixbook_backend.repository.CollaboratoreRepository;
import org.springframework.jdbc.core.JdbcTemplate;
import com.flixbook.flixbook_backend.repository.MedicoRepository;
import com.flixbook.flixbook_backend.repository.PazienteRepository;
import com.flixbook.flixbook_backend.repository.AdminRepository;
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
    private final JdbcTemplate jdbcTemplate;
    private final AdminRepository adminRepository;

    public CustomUserDetailsService(MedicoRepository medicoRepository, PazienteRepository pazienteRepository, CollaboratoreRepository collaboratoreRepository, JdbcTemplate jdbcTemplate, AdminRepository adminRepository) {
        this.medicoRepository = medicoRepository;
        this.pazienteRepository = pazienteRepository;
        this.collaboratoreRepository = collaboratoreRepository;
        this.jdbcTemplate = jdbcTemplate;
        this.adminRepository = adminRepository;
    }

    @Override
    public UserDetails loadUserByUsername(String email) throws UsernameNotFoundException {
        // --- Cerca un Admin ---
        Admin admin = adminRepository.findByEmail(email).orElse(null);
        if (admin != null) {
            return new CustomUserDetails(
                admin.getEmail(),
                admin.getPasswordHash(),
                Collections.singletonList(new SimpleGrantedAuthority("ROLE_ADMIN")),
                admin.getId(),
                null,
                Collections.emptyList(),
                null
            );
        }
        // --- Cerca il Medico ---
        Medico medico = medicoRepository.findByEmail(email).orElse(null);
        if (medico != null) {
            // Restituisce il nostro oggetto personalizzato
            return new CustomUserDetails(
                medico.getEmail(),
                medico.getPasswordHash(),
                Collections.singletonList(new SimpleGrantedAuthority("ROLE_MEDICO")),
                medico.getId(),
                medico.getId(),
                Collections.singletonList(medico.getId()),
                medico.getId()
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
                null,
                Collections.emptyList(),
                null
            );
        }

        // --- Cerca il Collaboratore ---
        Collaboratore collaboratore = collaboratoreRepository.findByEmail(email).orElse(null);
        if (collaboratore != null) {
            // Restituisce il nostro oggetto personalizzato
            // Legge i medici gestiti dal collaboratore dalla join table (se vuota, fallback al legacy)
            var managed = jdbcTemplate.query("SELECT medico_id FROM collaboratori_medici WHERE collaboratore_id = ?",
                    (rs, rowNum) -> rs.getLong(1), collaboratore.getId());
            if (managed == null || managed.isEmpty()) {
                managed = Collections.singletonList(collaboratore.getMedico().getId());
            }
            Long acting = managed.get(0);
            return new CustomUserDetails(
                collaboratore.getEmail(),
                collaboratore.getPasswordHash(),
                Collections.singletonList(new SimpleGrantedAuthority("ROLE_COLLABORATORE")),
                collaboratore.getId(),
                acting, // compat: medicoId come medico attivo
                managed,
                acting
            );
        }

        throw new UsernameNotFoundException("Utente non trovato con email: " + email);
    }
}