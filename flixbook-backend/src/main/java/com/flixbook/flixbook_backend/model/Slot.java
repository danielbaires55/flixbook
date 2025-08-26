package com.flixbook.flixbook_backend.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Entity
@Table(name = "slot",
       uniqueConstraints = {
           @UniqueConstraint(name = "uq_slot_medico_start", columnNames = {"medico_id", "data_ora_inizio"})
       })
@Getter
@Setter
@NoArgsConstructor
public class Slot {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "medico_id", nullable = false)
    private Medico medico;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "blocco_orario_id", nullable = false)
    private BloccoOrario bloccoOrario;

    @Column(name = "data_ora_inizio", nullable = false)
    private LocalDateTime dataEOraInizio;

    @Column(name = "data_ora_fine", nullable = false)
    private LocalDateTime dataEOraFine;

    @Enumerated(EnumType.STRING)
    @Column(name = "stato", nullable = false)
    private SlotStato stato = SlotStato.DISPONIBILE;
}
