package com.flixbook.flixbook_backend.controller;

import com.flixbook.flixbook_backend.config.CustomUserDetails;
import com.flixbook.flixbook_backend.config.JwtUtil;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication; // Import this
import org.springframework.web.bind.annotation.*;
import java.util.Map;
import java.util.HashMap;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthenticationManager authenticationManager;
    private final JwtUtil jwtUtil;

    // The dependency on CustomUserDetailsService is no longer needed here!
    public AuthController(AuthenticationManager authenticationManager, JwtUtil jwtUtil) {
        this.authenticationManager = authenticationManager;
        this.jwtUtil = jwtUtil;
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

            return ResponseEntity.ok(responseBody);
            // --- FINE MODIFICA ---

        } catch (BadCredentialsException e) {
            return ResponseEntity.status(401).body(Map.of(
                    "error", "Email o password sbagliata"));
        }
    }
}