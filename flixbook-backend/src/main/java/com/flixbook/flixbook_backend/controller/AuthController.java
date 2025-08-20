package com.flixbook.flixbook_backend.controller;

import com.flixbook.flixbook_backend.config.JwtUtil;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
//import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.web.bind.annotation.*;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthenticationManager authenticationManager;
    private final JwtUtil jwtUtil;

    public AuthController(AuthenticationManager authenticationManager, JwtUtil jwtUtil) {
        this.authenticationManager = authenticationManager;
        this.jwtUtil = jwtUtil;
    }

    @PostMapping("/login")
public ResponseEntity<?> login(@RequestBody Map<String, String> loginData) {
    try {
        String email = loginData.get("email");
        String password = loginData.get("password");
        
        authenticationManager.authenticate(
            new UsernamePasswordAuthenticationToken(email, password)
        );

        String token = jwtUtil.generateToken(email);
        
        return ResponseEntity.ok(Map.of(
            "token", token,
            "message", "Login riuscito"
        ));
        
    } catch (BadCredentialsException e) {
        return ResponseEntity.status(401).body(Map.of(
            "error", "Email o password sbagliata"
        ));
    }
}
}