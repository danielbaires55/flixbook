package com.flixbook.flixbook_backend.config;

import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.userdetails.User;
import java.util.Collection;
import java.util.List;

public class CustomUserDetails extends User {

    private final Long userId;
    private final Long medicoId; // Compat: usato dai controller esistenti come medico attivo
    private final List<Long> managedMedici; // Lista di medici gestiti (per collaboratori o medici)
    private final Long actingMedicoId; // Medico attivo corrente

    public CustomUserDetails(
        String username,
        String password,
        Collection<? extends GrantedAuthority> authorities,
    Long userId,
    Long medicoId,
    List<Long> managedMedici,
    Long actingMedicoId
    ) {
        super(username, password, authorities);
        this.userId = userId;
    this.medicoId = medicoId;
    this.managedMedici = managedMedici;
    this.actingMedicoId = actingMedicoId;
    }

    // Getters per accedere ai nostri campi
    public Long getUserId() {
        return userId;
    }

    public Long getMedicoId() {
        return medicoId;
    }

    public List<Long> getManagedMedici() {
        return managedMedici;
    }

    public Long getActingMedicoId() {
        return actingMedicoId;
    }
}