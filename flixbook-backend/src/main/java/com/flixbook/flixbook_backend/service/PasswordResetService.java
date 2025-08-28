package com.flixbook.flixbook_backend.service;

import com.flixbook.flixbook_backend.model.*;
import com.flixbook.flixbook_backend.repository.*;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;

@Service
public class PasswordResetService {
    private final PasswordResetTokenRepository tokenRepository;
    private final PazienteRepository pazienteRepository;
    private final MedicoRepository medicoRepository;
    private final CollaboratoreRepository collaboratoreRepository;
    private final EmailService emailService;
    private final PasswordEncoder passwordEncoder;

    public PasswordResetService(PasswordResetTokenRepository tokenRepository,
                                PazienteRepository pazienteRepository,
                                MedicoRepository medicoRepository,
                                CollaboratoreRepository collaboratoreRepository,
                                EmailService emailService,
                                PasswordEncoder passwordEncoder) {
        this.tokenRepository = tokenRepository;
        this.pazienteRepository = pazienteRepository;
        this.medicoRepository = medicoRepository;
        this.collaboratoreRepository = collaboratoreRepository;
        this.emailService = emailService;
        this.passwordEncoder = passwordEncoder;
    }

    public void requestReset(String email) {
        // Determine user type by email existence
        String userType = null;
        if (pazienteRepository.findByEmail(email).isPresent()) userType = "PAZIENTE";
        else if (medicoRepository.findByEmail(email).isPresent()) userType = "MEDICO";
        else if (collaboratoreRepository.findByEmail(email).isPresent()) userType = "COLLABORATORE";

        // Always respond success to avoid user enumeration, but only create token if exists
        if (userType != null) {
            String token = UUID.randomUUID().toString();
            PasswordResetToken prt = PasswordResetToken.builder()
                    .token(token)
                    .email(email)
                    .userType(userType)
                    .expiresAt(LocalDateTime.now().plusHours(1))
                    .build();
            tokenRepository.save(prt);
            String link = "http://localhost:5173/reset-password?token=" + token;
            String body = "Hai richiesto il reset della password su Flixbook.\n" +
                    "Usa questo link (valido 1 ora): " + link + "\n" +
                    "Se non hai richiesto tu il reset, ignora questa email.";
            emailService.sendEmail(email, "Recupero password Flixbook", body);
        }
    }

    public boolean resetPassword(String token, String newPassword) {
        Optional<PasswordResetToken> opt = tokenRepository.findByToken(token);
        if (opt.isEmpty()) return false;
        PasswordResetToken prt = opt.get();
    if (prt.isUsed() || prt.getExpiresAt().isBefore(LocalDateTime.now())) return false;

        String encoded = passwordEncoder.encode(newPassword);
        switch (prt.getUserType()) {
            case "PAZIENTE" -> pazienteRepository.findByEmail(prt.getEmail()).ifPresent(p -> {
                p.setPasswordHash(encoded);
                pazienteRepository.save(p);
            });
            case "MEDICO" -> medicoRepository.findByEmail(prt.getEmail()).ifPresent(m -> {
                m.setPasswordHash(encoded);
                medicoRepository.save(m);
            });
            case "COLLABORATORE" -> collaboratoreRepository.findByEmail(prt.getEmail()).ifPresent(c -> {
                c.setPasswordHash(encoded);
                collaboratoreRepository.save(c);
            });
            default -> { return false; }
        }
        prt.setUsed(true);
        tokenRepository.save(prt);
        return true;
    }

    /**
     * Validate a reset token when the user opens the link for the first time.
     * - If token doesn't exist: 404
     * - If expired: 400 and mark as opened (with timestamp)
     * - If already used: 410 Gone
     * - If already opened previously: 409 Conflict (link already opened)
     * - If valid and not opened: mark opened and return 200
     */
    public java.util.Map<String, Object> validateAndOpenToken(String token) {
        Optional<PasswordResetToken> opt = tokenRepository.findByToken(token);
        if (opt.isEmpty()) {
            return java.util.Map.of(
                    "status", 404,
                    "valid", false,
                    "reason", "not_found",
                    "message", "Link non valido. Richiedi un nuovo reset."
            );
        }
        PasswordResetToken prt = opt.get();
        LocalDateTime now = LocalDateTime.now();
        if (prt.getExpiresAt().isBefore(now)) {
            if (!prt.isOpened()) {
                prt.setOpened(true);
                prt.setOpenedAt(now);
                tokenRepository.save(prt);
            }
            return java.util.Map.of(
                    "status", 400,
                    "valid", false,
                    "reason", "expired",
                    "message", "Questo link è scaduto. Richiedi un nuovo reset."
            );
        }
        if (prt.isUsed()) {
            return java.util.Map.of(
                    "status", 410,
                    "valid", false,
                    "reason", "used",
                    "message", "Questo link è già stato utilizzato. Richiedi un nuovo reset se necessario."
            );
        }
        if (prt.isOpened()) {
            return java.util.Map.of(
                    "status", 409,
                    "valid", false,
                    "reason", "already_opened",
                    "message", "Hai già aperto questo link. Per sicurezza richiedi un nuovo reset."
            );
        }

        // Mark as opened on first access
        prt.setOpened(true);
        prt.setOpenedAt(now);
        tokenRepository.save(prt);
        return java.util.Map.of(
                "status", 200,
                "valid", true,
                "reason", "ok",
                "message", "Token valido. Puoi impostare una nuova password."
        );
    }
}
