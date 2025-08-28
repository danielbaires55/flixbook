package com.flixbook.flixbook_backend.controller;

import com.flixbook.flixbook_backend.config.CustomUserDetails;
import com.flixbook.flixbook_backend.model.Collaboratore;
import com.flixbook.flixbook_backend.repository.CollaboratoreRepository;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/collaboratori")
public class CollaboratoreController {

    private final CollaboratoreRepository collaboratoreRepository;
    private final PasswordEncoder passwordEncoder;

    public CollaboratoreController(CollaboratoreRepository collaboratoreRepository, PasswordEncoder passwordEncoder) {
        this.collaboratoreRepository = collaboratoreRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @PutMapping("/profilo/password")
    public ResponseEntity<?> changeOwnPassword(@RequestBody Map<String, String> body, Authentication authentication) {
        Object p = authentication.getPrincipal();
        if (!(p instanceof CustomUserDetails)) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        CustomUserDetails user = (CustomUserDetails) p;
        String role = user.getAuthorities().iterator().next().getAuthority();
        if (!"ROLE_COLLABORATORE".equals(role)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Solo i collaboratori possono usare questo endpoint.");
        }
        Long collabId = user.getUserId();
        Collaboratore collab = collaboratoreRepository.findById(collabId)
                .orElseThrow(() -> new RuntimeException("Collaboratore non trovato"));

        String oldPwd = body.get("vecchiaPassword");
        String newPwd = body.get("nuovaPassword");
        if (oldPwd == null || newPwd == null || !passwordEncoder.matches(oldPwd, collab.getPasswordHash())) {
            return ResponseEntity.badRequest().body("La vecchia password non è corretta.");
        }
        collab.setPasswordHash(passwordEncoder.encode(newPwd));
        collaboratoreRepository.save(collab);
        return ResponseEntity.ok("Password aggiornata con successo.");
    }
}
