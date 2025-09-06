package com.flixbook.flixbook_backend.model;

import jakarta.persistence.*;
import lombok.*;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import java.util.Collection;
import java.util.Collections;

@Entity
@Table(name = "collaboratori")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Collaboratore implements UserDetails {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String nome;

    @Column(nullable = false)
    private String cognome;

    @Column(nullable = false, unique = true)
    private String email;

    @Column(name = "password_hash", nullable = false)
    private String passwordHash;

    private String telefono;

    // RIMOSSO: legacy relazione singolo medico (medico_id). Gestiamo ora SOLO la many-to-many su tabella collaboratori_medici.
    // (Migrazione V19 rimuove definitivamente la colonna.)

    // Se in futuro servirà navigazione JPA, si può riattivare una mapping ManyToMany qui.

    @Builder.Default
    private String ruolo = "ROLE_COLLABORATORE";

    // --- Metodi di UserDetails per Spring Security ---

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return Collections.singletonList(new SimpleGrantedAuthority(ruolo));
    }

    @Override
    public String getPassword() {
        return passwordHash;
    }

    @Override
    public String getUsername() {
        return email;
    }

    @Override
    public boolean isAccountNonExpired() {
        return true;
    }

    @Override
    public boolean isAccountNonLocked() {
        return true;
    }

    @Override
    public boolean isCredentialsNonExpired() {
        return true;
    }

    @Override
    public boolean isEnabled() {
        return true;
    }
}