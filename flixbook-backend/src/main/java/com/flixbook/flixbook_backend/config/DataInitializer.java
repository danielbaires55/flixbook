package com.flixbook.flixbook_backend.config;

import com.flixbook.flixbook_backend.model.Admin;
import com.flixbook.flixbook_backend.repository.AdminRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.core.env.Environment;
import org.springframework.core.io.Resource;
import org.springframework.core.io.ResourceLoader;
import org.springframework.jdbc.core.JdbcTemplate;

import java.nio.charset.StandardCharsets;

@Configuration
public class DataInitializer {
    @Bean
    CommandLineRunner initDefaultAdmin(AdminRepository adminRepository, PasswordEncoder encoder) {
        return args -> {
            String defaultEmail = "admin@flixbook.local";
            if (adminRepository.findByEmail(defaultEmail).isEmpty()) {
                Admin a = new Admin();
                a.setNome("Admin");
                a.setCognome("Flixbook");
                a.setEmail(defaultEmail);
                a.setPasswordHash(encoder.encode("admin123"));
                adminRepository.save(a);
                System.out.println("Seeded default admin: " + defaultEmail + " / admin123");
            }
        };
    }

    // Optional portable seed runner: executes classpath:actdump.sql when app.seed=true (e.g. in dev)
    @Bean
    CommandLineRunner loadDevSeed(Environment env, ResourceLoader resourceLoader, JdbcTemplate jdbcTemplate) {
        return args -> {
            boolean shouldSeed = Boolean.parseBoolean(env.getProperty("app.seed", "false"));
            if (!shouldSeed) return;
            try {
                Resource res = resourceLoader.getResource("classpath:actdump.sql");
                if (!res.exists()) {
                    System.out.println("[seed] actdump.sql not found on classpath; skipping");
                    return;
                }
                String sql = new String(res.getInputStream().readAllBytes(), StandardCharsets.UTF_8);
                // split and execute ONLY DML inserts to avoid outdated DDL (CREATE/DROP/ALTER)
                String[] statements = sql.replace("\r", "\n").split(";\n");
                int count = 0, skipped = 0;
                // Temporarily relax FK checks so the dump doesn't need perfect insert order
                try {
                    jdbcTemplate.execute("SET FOREIGN_KEY_CHECKS=0");
                } catch (Exception fkEx) {
                    System.err.println("[seed] Could not disable FK checks (continuing): " + fkEx.getMessage());
                }
                try {
                    for (String stmt : statements) {
                        String s = stmt.trim();
                        if (s.isEmpty() || s.startsWith("--") || s.startsWith("/*")) { skipped++; continue; }
                        String upper = s.length() > 16 ? s.substring(0, 16).toUpperCase() : s.toUpperCase();
                        // execute only INSERT/REPLACE (ignore CREATE/DROP/ALTER/SET/USE/etc.)
                        if (!(upper.startsWith("INSERT ") || upper.startsWith("INSERT\n") || upper.startsWith("REPLACE ") || upper.startsWith("REPLACE\n"))) {
                            skipped++; continue;
                        }
                        try {
                            jdbcTemplate.execute(s);
                            count++;
                        } catch (Exception ex) {
                            System.err.println("[seed] Failed DML, continuing: " + s.substring(0, Math.min(120, s.length())) + "... -> " + ex.getMessage());
                        }
                    }
                } finally {
                    try {
                        jdbcTemplate.execute("SET FOREIGN_KEY_CHECKS=1");
                    } catch (Exception fkOnEx) {
                        System.err.println("[seed] Could not re-enable FK checks: " + fkOnEx.getMessage());
                    }
                }
                System.out.println("[seed] actdump.sql applied: executed " + count + " DML statements, skipped " + skipped + ".");
            } catch (Exception ex) {
                System.err.println("[seed] Error applying actdump.sql: " + ex.getMessage());
            }
        };
    }
}
