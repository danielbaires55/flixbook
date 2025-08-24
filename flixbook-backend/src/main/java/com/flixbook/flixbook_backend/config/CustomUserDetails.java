package com.flixbook.flixbook_backend.config; // o il package che preferisci

import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.userdetails.User;
import java.util.Collection;

public class CustomUserDetails extends User {

    private final Long userId;
    private final Long medicoId; // Il nostro campo personalizzato!

    public CustomUserDetails(
        String username,
        String password,
        Collection<? extends GrantedAuthority> authorities,
        Long userId,
        Long medicoId
    ) {
        super(username, password, authorities);
        this.userId = userId;
        this.medicoId = medicoId;
    }

    // Getters per accedere ai nostri campi
    public Long getUserId() {
        return userId;
    }

    public Long getMedicoId() {
        return medicoId;
    }
}