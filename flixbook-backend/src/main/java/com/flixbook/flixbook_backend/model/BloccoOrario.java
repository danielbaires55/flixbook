package com.flixbook.flixbook_backend.model;

import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.LocalDateTime;

@Entity
@Table(name = "blocco_orario")
@Data // Aggiunge automaticamente Getter, Setter, costruttori, etc.
public class BloccoOrario {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "medico_id", nullable = false)
    private Medico medico;

    @Column(nullable = false)
    private LocalDate data;

    @Column(name = "ora_inizio", nullable = false)
    private LocalTime oraInizio;

    @Column(name = "ora_fine", nullable = false)
    private LocalTime oraFine;

    // Attribuzione di chi ha creato il blocco
    @Column(name = "created_by_type")
    private String createdByType; // "MEDICO" | "COLLABORATORE"

    @Column(name = "created_by_id")
    private Long createdById;

    @Column(name = "created_by_name")
    private String createdByName; // Nome completo dell'inseritore

    @Column(name = "created_at")
    private LocalDateTime createdAt;
}