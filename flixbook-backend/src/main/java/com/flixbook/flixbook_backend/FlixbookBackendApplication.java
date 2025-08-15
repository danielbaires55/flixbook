package com.flixbook.flixbook_backend;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class FlixbookBackendApplication {

	public static void main(String[] args) {
		SpringApplication.run(FlixbookBackendApplication.class, args);
	}

}
