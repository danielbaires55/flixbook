package com.flixbook.flixbook_backend.model;

import jakarta.persistence.*;
import lombok.Data;

@Entity
@Table(name = "prestazioni")
@Data
public class Prestazione {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "specialita_id")
    private Specialita specialita;

    private String nome;
    private String descrizione;
    private Double costo;
    private String icon_url;
    @Column(name = "durata_minuti", nullable = false)
    private int durataMinuti;

    @Enumerated(EnumType.STRING)
    @Column(name = "tipo_prestazione", nullable = false)
    private TipoPrestazione tipoPrestazione;
}