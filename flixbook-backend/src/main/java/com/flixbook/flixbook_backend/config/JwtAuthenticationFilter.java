package com.flixbook.flixbook_backend.config;

//import com.flixbook.flixbook_backend.config.JwtUtil;
import com.flixbook.flixbook_backend.service.CustomUserDetailsService;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import java.io.IOException;

@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtUtil jwtUtil;
    private final CustomUserDetailsService userDetailsService;

    public JwtAuthenticationFilter(JwtUtil jwtUtil, CustomUserDetailsService userDetailsService) {
        this.jwtUtil = jwtUtil;
        this.userDetailsService = userDetailsService;
    }

    @Override
protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain) throws ServletException, IOException {
    final String authHeader = request.getHeader("Authorization");
    String email = null;
    String jwt = null;

    if (authHeader != null && authHeader.startsWith("Bearer ")) {
        jwt = authHeader.substring(7);
        try {
            email = jwtUtil.getEmailFromToken(jwt);
        } catch (Exception e) {
            // Token non valido o scaduto
            System.err.println("Errore nell'estrazione del token: " + e.getMessage());
        }
    }

    if (email != null && SecurityContextHolder.getContext().getAuthentication() == null) {
        // CARICA I NOSTRI CUSTOM USER DETAILS, NON QUELLI GENERICI
        CustomUserDetails userDetails = (CustomUserDetails) this.userDetailsService.loadUserByUsername(email);

        // Validiamo il token con i nostri dettagli utente
        if (jwtUtil.validateToken(jwt)) { // Assicurati che validateToken non richieda il secondo parametro
            UsernamePasswordAuthenticationToken authToken =
                    new UsernamePasswordAuthenticationToken(userDetails, null, userDetails.getAuthorities());
            authToken.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
            SecurityContextHolder.getContext().setAuthentication(authToken);
        }
    }

    filterChain.doFilter(request, response);
}
}