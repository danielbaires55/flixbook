package com.flixbook.flixbook_backend.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.nio.file.Paths;

@Configuration
public class StaticResourceConfig implements WebMvcConfigurer {

    @Value("${app.uploads.dir:uploads}")
    private String uploadsDir;

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
    // Map /prof_img/** to the filesystem directory <uploadsDir>/prof_img
    String fileLocation = Paths.get(uploadsDir, "prof_img")
        .toAbsolutePath()
        .normalize()
        .toUri()
        .toString();
    // Also provide a fallback to classpath bundled images under static/prof_img
    String classpathLocation = "classpath:/static/prof_img/";

    registry.addResourceHandler("/prof_img/**")
        .addResourceLocations(fileLocation, classpathLocation);
    }
}
