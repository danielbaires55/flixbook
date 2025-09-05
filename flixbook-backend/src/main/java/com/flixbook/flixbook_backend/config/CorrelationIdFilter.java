package com.flixbook.flixbook_backend.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.MDC;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.UUID;

/**
 * Adds/propagates a correlation ID for each request.
 * - Reads X-Correlation-Id or X-Request-Id if provided by clients/gateway
 * - Generates a UUID if missing
 * - Puts it in MDC (key: correlationId) for logging
 * - Echoes it in the response header X-Correlation-Id
 */
@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
public class CorrelationIdFilter extends OncePerRequestFilter {

    public static final String HDR_CORRELATION_ID = "X-Correlation-Id";
    public static final String HDR_REQUEST_ID = "X-Request-Id";
    public static final String MDC_KEY = "correlationId";

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        String cid = firstNonEmpty(
                request.getHeader(HDR_CORRELATION_ID),
                request.getHeader(HDR_REQUEST_ID)
        );
        if (cid == null || cid.isBlank()) {
            cid = UUID.randomUUID().toString();
        }

        try {
            MDC.put(MDC_KEY, cid);
            response.setHeader(HDR_CORRELATION_ID, cid);
            filterChain.doFilter(request, response);
        } finally {
            MDC.remove(MDC_KEY);
        }
    }

    private static String firstNonEmpty(String a, String b) {
        if (a != null && !a.isBlank()) return a;
        if (b != null && !b.isBlank()) return b;
        return null;
    }
}
