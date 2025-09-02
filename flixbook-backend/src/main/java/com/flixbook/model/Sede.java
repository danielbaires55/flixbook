package com.flixbook.model;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "sedi")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
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

    private Boolean attiva;
}
