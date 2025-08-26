package com.flixbook.flixbook_backend;

import jakarta.annotation.PostConstruct;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import java.util.TimeZone;

@SpringBootApplication
public class FlixbookBackendApplication {

	public static void main(String[] args) {
		SpringApplication.run(FlixbookBackendApplication.class, args);
	}

	@PostConstruct
	public void init() {
		// FORZA L'INTERA APPLICAZIONE A USARE IL FUSO ORARIO ITALIANO
		TimeZone.setDefault(TimeZone.getTimeZone("Europe/Rome"));
	}
}