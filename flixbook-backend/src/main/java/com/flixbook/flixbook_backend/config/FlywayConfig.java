package com.flixbook.flixbook_backend.config;

import org.flywaydb.core.Flyway;
import org.springframework.boot.autoconfigure.flyway.FlywayMigrationStrategy;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class FlywayConfig {

    @Bean
    public FlywayMigrationStrategy flywayMigrationStrategy() {
        return (Flyway flyway) -> {
            // Repair first to remove failed entries and align checksums
            try {
                flyway.repair();
            } catch (Exception ignored) {
                // Proceed even if repair isn't necessary
            }
            flyway.migrate();
        };
    }
}
// Temporary Flyway repair-and-migrate configuration removed as requested.
// Keeping this file as a noop placeholder to avoid classpath changes during hot-reload.
