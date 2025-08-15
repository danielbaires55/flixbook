package com.flixbook.flixbook_backend.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.Data;
import java.util.List;

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
    private Double prezzo;
    private String icon_url;

    @Enumerated(EnumType.STRING)
    @Column(name = "tipo_prestazione", nullable = false)
    private TipoPrestazione tipoPrestazione;
}