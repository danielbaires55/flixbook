package com.flixbook.flixbook_backend.config;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.ExpiredJwtException;
import java.util.Collections;
import java.util.List;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.lang.NonNull;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import java.io.IOException;

@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtUtil jwtUtil;

    public JwtAuthenticationFilter(JwtUtil jwtUtil) {
        this.jwtUtil = jwtUtil;
    }

    @Override
    protected void doFilterInternal(@NonNull HttpServletRequest request,
                                    @NonNull HttpServletResponse response,
                                    @NonNull FilterChain filterChain) throws ServletException, IOException {

        final String authHeader = request.getHeader("Authorization");
        final String jwt;
    // userEmail derivato direttamente dalle claims quando necessario

        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            filterChain.doFilter(request, response);
            return;
        }

        jwt = authHeader.substring(7);
        try {
            Claims claims = jwtUtil.parseClaims(jwt); // può lanciare ExpiredJwtException
            if (SecurityContextHolder.getContext().getAuthentication() == null) {
                String userEmailLocal = claims.getSubject();
                if (userEmailLocal != null) {
                    String role = (String) claims.get("role");
                    Long userId = claims.get("userId", Number.class) == null ? null : claims.get("userId", Number.class).longValue();
                    Long medicoId = claims.get("medicoId", Number.class) == null ? null : claims.get("medicoId", Number.class).longValue();
                    @SuppressWarnings("unchecked") List<Object> managedRaw = (List<Object>) claims.get("managedMedici");
                    List<Long> managed = managedRaw == null ? Collections.emptyList() : managedRaw.stream().map(o -> ((Number) o).longValue()).toList();
                    Long acting = claims.get("actingMedicoId", Number.class) == null ? null : claims.get("actingMedicoId", Number.class).longValue();

                    if (jwtUtil.validateToken(jwt)) { // doppio check: firma ok e non scaduto
                        CustomUserDetails userDetails = new CustomUserDetails(
                                userEmailLocal,
                                "",
                                Collections.singletonList(new SimpleGrantedAuthority(role)),
                                userId,
                                medicoId,
                                managed,
                                acting
                        );
                        UsernamePasswordAuthenticationToken authToken = new UsernamePasswordAuthenticationToken(
                                userDetails,
                                null,
                                userDetails.getAuthorities()
                        );
                        authToken.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                        SecurityContextHolder.getContext().setAuthentication(authToken);
                    }
                }
            }
        } catch (ExpiredJwtException ex) {
            // Risposta JSON uniforme per token scaduto
            response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
            response.setContentType("application/json");
            response.getWriter().write("{\"error\":\"token_expired\",\"message\":\"Il token JWT è scaduto. Effettua di nuovo il login.\"}");
            return; // interrompe la catena
        } catch (Exception ignored) {
            // Token invalido: prosegui senza autenticare (endpoint pubblico o verrà bloccato dopo)
        }
        filterChain.doFilter(request, response);
    }
}