package com.flixbook.flixbook_backend.model;

import jakarta.persistence.*;
import lombok.*;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import java.time.LocalDateTime;

@Entity
@Table(name = "appuntamenti")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Appuntamento {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;


    private boolean reminderInviato = false;
    private boolean smsReminderInviato = false;
    private boolean feedbackInviato = false;

    @ManyToOne(fetch = FetchType.LAZY)
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    @JoinColumn(name = "paziente_id", nullable = false)
    private Paziente paziente;

    @ManyToOne(fetch = FetchType.LAZY)
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    @JoinColumn(name = "disponibilita_id", nullable = false)
    private Disponibilita disponibilita;

    @Column(name = "data_e_ora_inizio", nullable = false)
    private LocalDateTime dataEOraInizio;

    @Column(name = "data_e_ora_fine", nullable = false)
    private LocalDateTime dataEOraFine;

    @Enumerated(EnumType.STRING)
    @Column(name = "tipo_appuntamento", nullable = false)
    private TipoAppuntamento tipoAppuntamento;

    @Column(name = "link_videocall")
    private String linkVideocall;

    @Enumerated(EnumType.STRING)
    @Column(name = "stato", nullable = false)
    private StatoAppuntamento stato;

    @Column(name = "data_prenotazione", nullable = false)
    private LocalDateTime dataPrenotazione;
}