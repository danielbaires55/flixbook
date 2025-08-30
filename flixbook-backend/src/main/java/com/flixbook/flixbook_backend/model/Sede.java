package com.flixbook.flixbook_backend.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "sedi")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class Sede {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String nome;

    private String indirizzo;

    private String citta;

    private String provincia;

    private String cap;

    private String telefono;

    private String email;

    // Coordinate geografiche (opzionali)
    private Double lat;

    private Double lng;

    private Boolean attiva;
}
