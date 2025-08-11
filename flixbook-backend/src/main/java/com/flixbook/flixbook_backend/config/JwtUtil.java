package com.flixbook.flixbook_backend.config;

import com.flixbook.flixbook_backend.service.CustomUserDetailsService;
import io.jsonwebtoken.*;
import io.jsonwebtoken.security.Keys;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Component;

import java.security.Key;
import java.util.Date;

@Component
public class JwtUtil {
    private final String SECRET = "3ec71e5b3cb84bcb67c6fb14b5b5d7d932a4376cf4d3ad2cc9e5cd6b513e6610";
    private final Key key = Keys.hmacShaKeyFor(SECRET.getBytes());
    private final long JWT_EXPIRATION = 60000;

    private final CustomUserDetailsService customUserDetailsService;

    // Inietta CustomUserDetailsService per poter recuperare il ruolo
    public JwtUtil(CustomUserDetailsService customUserDetailsService) {
        this.customUserDetailsService = customUserDetailsService;
    }

    public String generateToken(String email) {
        // Recupera i dettagli dell'utente per ottenere il ruolo
        UserDetails userDetails = customUserDetailsService.loadUserByUsername(email);
        
        // Estrai il ruolo e rimuovi il prefisso "ROLE_"
        String userRole = userDetails.getAuthorities().stream()
                                    .findFirst()
                                    .map(GrantedAuthority::getAuthority)
                                    .orElse("UNKNOWN_ROLE")
                                    .replace("ROLE_", "");

        return Jwts.builder()
                .setSubject(email)
                // Aggiungi la proprietà 'role' al payload del token
                .claim("role", userRole)
                .setIssuedAt(new Date())
                .setExpiration(new Date(System.currentTimeMillis() + JWT_EXPIRATION))
                .signWith(key, SignatureAlgorithm.HS512)
                .compact();
    }

    // Il resto dei metodi getEmailFromToken e validateToken è corretto
    public String getEmailFromToken(String token) {
        return Jwts.parserBuilder()
                .setSigningKey(key)
                .build()
                .parseClaimsJws(token)
                .getBody()
                .getSubject();
    }

    public boolean validateToken(String token) {
        try {
            Jwts.parserBuilder().setSigningKey(key).build().parseClaimsJws(token);
            return true;
        } catch (Exception e) {
            return false;
        }
    }
}