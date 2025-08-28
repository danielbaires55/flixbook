package com.flixbook.flixbook_backend.controller;

import com.flixbook.flixbook_backend.config.CustomUserDetails;
import com.flixbook.flixbook_backend.config.JwtUtil;
import com.flixbook.flixbook_backend.model.Medico;
import com.flixbook.flixbook_backend.repository.MedicoRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication; // Import this
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import java.util.Map;
import java.util.HashMap;
import java.util.List;
import java.util.Objects;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthenticationManager authenticationManager;
    private final JwtUtil jwtUtil;
    private final MedicoRepository medicoRepository;

    // The dependency on CustomUserDetailsService is no longer needed here!
    private final com.flixbook.flixbook_backend.service.PasswordResetService passwordResetService;

    public AuthController(AuthenticationManager authenticationManager, JwtUtil jwtUtil, MedicoRepository medicoRepository,
                          com.flixbook.flixbook_backend.service.PasswordResetService passwordResetService) {
        this.authenticationManager = authenticationManager;
        this.jwtUtil = jwtUtil;
        this.medicoRepository = medicoRepository;
        this.passwordResetService = passwordResetService;
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody Map<String, String> loginData) {
        try {
            String email = loginData.get("email");
            String password = loginData.get("password");

            // Step 1: Authenticate and get the resulting Authentication object
            Authentication authentication = authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(email, password));

            // Step 2: Get our CustomUserDetails directly from the successful authentication
            final CustomUserDetails userDetails = (CustomUserDetails) authentication.getPrincipal();

            // Step 3: Generate the token using the userDetails object
            final String token = jwtUtil.generateToken(userDetails);

            // --- INIZIO MODIFICA ---
            // Usiamo HashMap invece di Map.of per permettere valori null
            Map<String, Object> responseBody = new HashMap<>();
            responseBody.put("token", token);
            responseBody.put("message", "Login riuscito");
            responseBody.put("role", userDetails.getAuthorities().iterator().next().getAuthority());
            responseBody.put("userId", userDetails.getUserId());
            responseBody.put("medicoId", userDetails.getMedicoId()); // Ora questo può essere null
            responseBody.put("managedMedici", userDetails.getManagedMedici());
            responseBody.put("actingMedicoId", userDetails.getActingMedicoId());

            return ResponseEntity.ok(responseBody);
            // --- FINE MODIFICA ---

        } catch (BadCredentialsException e) {
            return ResponseEntity.status(401).body(Map.of(
                    "error", "Email o password sbagliata"));
        }
    }

    @GetMapping("/managed-medici")
    public ResponseEntity<?> getManagedMedici(@AuthenticationPrincipal CustomUserDetails userDetails) {
        if (userDetails == null) return ResponseEntity.status(401).build();
        String role = userDetails.getAuthorities().iterator().next().getAuthority();
        if (!Objects.equals(role, "ROLE_COLLABORATORE") && !Objects.equals(role, "ROLE_MEDICO")) {
            return ResponseEntity.status(403).body(Map.of("error", "Solo collaboratori o medici"));
        }
    List<Long> ids = userDetails.getManagedMedici();
    List<Medico> medici = (ids == null || ids.isEmpty()) ? List.of() : medicoRepository.findAllById(ids);
        List<Map<String, Object>> details = medici.stream().map(m -> {
        Map<String, Object> map = new HashMap<>();
        map.put("id", m.getId());
        map.put("nome", m.getNome());
        map.put("cognome", m.getCognome());
        map.put("email", m.getEmail());
            map.put("imgProfUrl", m.getImgProfUrl());
            try {
                List<String> specs = medicoRepository.findSpecialitaNomiByMedicoId(m.getId());
                if (specs != null && !specs.isEmpty()) map.put("specialita", specs.getFirst());
            } catch (Exception ignored) {}
        return map;
    }).collect(Collectors.toList());
    return ResponseEntity.ok(Map.of(
        "managedMedici", details,
        "actingMedicoId", userDetails.getActingMedicoId()
    ));
    }

    @PostMapping("/switch-acting-medico")
    public ResponseEntity<?> switchActingMedico(@AuthenticationPrincipal CustomUserDetails userDetails,
                                                @RequestBody Map<String, Long> body) {
        if (userDetails == null) return ResponseEntity.status(401).build();
        Long target = body.get("medicoId");
        List<Long> managed = userDetails.getManagedMedici();
        if (managed == null || target == null || !managed.contains(target)) {
            return ResponseEntity.status(403).body(Map.of("error", "Medico non gestito"));
        }
        // Emittiamo un nuovo token mantenendo stesso user, role e managed list ma cambiando acting/medicoId
        CustomUserDetails refreshed = new CustomUserDetails(
                userDetails.getUsername(),
                "", // password non usata nel token
                userDetails.getAuthorities(),
                userDetails.getUserId(),
                target,
                managed,
                target
        );
        String token = jwtUtil.generateToken(refreshed);
        return ResponseEntity.ok(Map.of(
                "token", token,
                "actingMedicoId", target,
                "managedMedici", managed
        ));
    }

    @PostMapping("/forgot-password")
    public ResponseEntity<?> forgotPassword(@RequestBody Map<String, String> payload) {
        String email = payload.get("email");
        if (email == null || email.isBlank()) return ResponseEntity.badRequest().body(Map.of("error", "Email obbligatoria"));
        passwordResetService.requestReset(email.trim());
        // Always OK to avoid user enumeration
        return ResponseEntity.ok(Map.of("message", "Se l'email esiste, invieremo un link di reset"));
    }

    @PostMapping("/reset-password")
    public ResponseEntity<?> resetPassword(@RequestBody Map<String, String> payload) {
        String token = payload.get("token");
        String newPassword = payload.get("newPassword");
        if (token == null || newPassword == null || newPassword.length() < 6) {
            return ResponseEntity.badRequest().body(Map.of("error", "Token e nuova password (min 6) sono obbligatori"));
        }
        boolean ok = passwordResetService.resetPassword(token, newPassword);
        if (!ok) return ResponseEntity.status(400).body(Map.of("error", "Token non valido o scaduto"));
        return ResponseEntity.ok(Map.of("message", "Password aggiornata"));
    }

    @GetMapping("/reset-password/validate")
    public ResponseEntity<?> validateResetToken(@RequestParam("token") String token) {
    Map<String, Object> res = passwordResetService.validateAndOpenToken(token);
    int status = ((Number) res.getOrDefault("status", 200)).intValue();
    return ResponseEntity.status(status).body(res);
    }
}