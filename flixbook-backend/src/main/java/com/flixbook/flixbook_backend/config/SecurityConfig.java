package com.flixbook.flixbook_backend.config;

import com.flixbook.flixbook_backend.service.CustomUserDetailsService;

import jakarta.servlet.http.HttpServletResponse;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.access.AccessDeniedHandler; // <-- IMPORT AGGIUNTO
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import java.util.Arrays;
import java.util.List;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    private final CustomUserDetailsService customUserDetailsService;
    private final JwtAuthenticationFilter jwtAuthenticationFilter;

    public SecurityConfig(CustomUserDetailsService customUserDetailsService,
                          JwtAuthenticationFilter jwtAuthenticationFilter) {
        this.customUserDetailsService = customUserDetailsService;
        this.jwtAuthenticationFilter = jwtAuthenticationFilter;
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        
        // =================================================================================
        // == BLOCCO DI DEBUG PER CATTURARE L'ERRORE 403 IN MODO DETTAGLIATO             ==
        // =================================================================================
        AccessDeniedHandler accessDeniedHandler = (request, response, accessDeniedException) -> {
            System.err.println("--- ACCESSO NEGATO (403 FORBIDDEN) ---");
            System.err.println("Endpoint richiesto: " + request.getRequestURI());
            System.err.println("Messaggio di errore: " + accessDeniedException.getMessage());
            System.err.println("Causa principale dell'errore:");
            accessDeniedException.printStackTrace(); // STAMPA L'ERRORE COMPLETO
            
            response.setStatus(HttpServletResponse.SC_FORBIDDEN);
            response.getWriter().write("Accesso negato. Controlla i log del server per i dettagli.");
        };
        // =================================================================================

        http
                .csrf(AbstractHttpConfigurer::disable)
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                
                // =======================================================================
                // == AGGIUNGIAMO IL GESTORE DI ECCEZIONI QUI                         ==
                // =======================================================================
                .exceptionHandling(exceptions -> exceptions
                    .accessDeniedHandler(accessDeniedHandler)
                )
                // =======================================================================

                .authorizeHttpRequests(authorize -> authorize
                        .requestMatchers(
                                "/api/auth/**",
                                "/api/pazienti/register",
                                "/api/specialita/**",
                                "/api/prestazioni/bySpecialita/**",
                                "/api/medici/info/**",
                                "/api/medici/byPrestazione/**",
                                "/api/disponibilita/available"
                        ).permitAll()
                        .requestMatchers(
                                "/api/medici/**",
                                "/api/appuntamenti/medico/**",
                                "/api/disponibilita/medico/**"
                        ).hasAnyAuthority("ROLE_MEDICO", "ROLE_COLLABORATORE")
                        .requestMatchers(
                                "/api/pazienti/**",
                                "/api/appuntamenti/prenota",
                                "/api/appuntamenti/paziente/**",
                                "/api/appuntamenti/annulla/**"
                        ).hasAuthority("ROLE_PAZIENTE")
                        .anyRequest().authenticated()
                )
                .authenticationProvider(authenticationProvider())
                .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        configuration.setAllowedOrigins(List.of("http://localhost:5173", "http://localhost:5174"));
        configuration.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "DELETE", "OPTIONS"));
        configuration.setAllowedHeaders(List.of("*"));
        configuration.setAllowCredentials(true);
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public DaoAuthenticationProvider authenticationProvider() {
        DaoAuthenticationProvider authProvider = new DaoAuthenticationProvider(customUserDetailsService);
        authProvider.setPasswordEncoder(passwordEncoder());
        return authProvider;
    }

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration config) throws Exception {
        return config.getAuthenticationManager();
    }
}