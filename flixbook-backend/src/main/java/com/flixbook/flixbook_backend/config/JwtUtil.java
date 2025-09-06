package com.flixbook.flixbook_backend.config;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.security.Key;
import java.util.Date;
import java.util.HashMap;
import java.util.Map;
import java.util.List;
import java.util.Collections;
import java.util.stream.Collectors;
import java.util.function.Function;

@Component
public class JwtUtil {

    // It's best practice to put these in application.properties
    @Value("${jwt.secret:94bdd653f4c5a6611ec3457ad7fec93a84ab795ba38bee7d152e31264b4b716c}")
    private String secretKey;

    @Value("${jwt.expiration:36000000}") // 10 hours in milliseconds
    private long expiration;

    private Key key;

    @jakarta.annotation.PostConstruct
    public void init() {
        this.key = Keys.hmacShaKeyFor(secretKey.getBytes());
    }

    public String getEmailFromToken(String token) {
        return extractClaim(token, Claims::getSubject);
    }

    public String getRoleFromToken(String token) {
        return extractClaim(token, claims -> (String) claims.get("role"));
    }

    public Long getUserIdFromToken(String token) {
        return extractClaim(token, claims -> claims.get("userId") == null ? null : ((Number) claims.get("userId")).longValue());
    }

    public Long getMedicoIdFromToken(String token) {
        return extractClaim(token, claims -> claims.get("medicoId") == null ? null : ((Number) claims.get("medicoId")).longValue());
    }

    public List<Long> getManagedMediciFromToken(String token) {
        return extractClaim(token, claims -> {
            Object v = claims.get("managedMedici");
            if (v instanceof List<?> list) {
                return list.stream().map(o -> ((Number) o).longValue()).collect(Collectors.toList());
            }
            return Collections.emptyList();
        });
    }

    public Long getActingMedicoIdFromToken(String token) {
        return extractClaim(token, claims -> claims.get("actingMedicoId") == null ? null : ((Number) claims.get("actingMedicoId")).longValue());
    }
    
    public <T> T extractClaim(String token, Function<Claims, T> claimsResolver) {
        final Claims claims = extractAllClaims(token);
        return claimsResolver.apply(claims);
    }

    public String generateToken(CustomUserDetails userDetails) {
        Map<String, Object> claims = new HashMap<>();
        claims.put("role", userDetails.getAuthorities().iterator().next().getAuthority());
        claims.put("userId", userDetails.getUserId());
        claims.put("medicoId", userDetails.getMedicoId());
    claims.put("managedMedici", userDetails.getManagedMedici());
    claims.put("actingMedicoId", userDetails.getActingMedicoId());
        return createToken(claims, userDetails.getUsername());
    }

    public boolean validateToken(String token) {
        try {
            Jwts.parserBuilder().setSigningKey(key).build().parseClaimsJws(token);
            return !isTokenExpired(token);
        } catch (Exception e) {
            return false;
        }
    }

    // =======================================================================
    // == METODO MANCANTE CHE CAUSAVA L'ERRORE                              ==
    // =======================================================================
    private boolean isTokenExpired(String token) {
        return extractExpiration(token).before(new Date());
    }
    // =======================================================================

    private Date extractExpiration(String token) {
        return extractClaim(token, Claims::getExpiration);
    }

    private Claims extractAllClaims(String token) {
        return Jwts.parserBuilder()
                .setSigningKey(key)
                .build()
                .parseClaimsJws(token)
                .getBody();
    }

    // Espone le claims per uso nel filtro (gestione ExpiredJwtException esterna)
    public Claims parseClaims(String token) {
        return extractAllClaims(token);
    }
    
    private String createToken(Map<String, Object> claims, String subject) {
        return Jwts.builder()
                .setClaims(claims)
                .setSubject(subject)
                .setIssuedAt(new Date(System.currentTimeMillis()))
                .setExpiration(new Date(System.currentTimeMillis() + expiration))
                .signWith(key, SignatureAlgorithm.HS256)
                .compact();
    }
}