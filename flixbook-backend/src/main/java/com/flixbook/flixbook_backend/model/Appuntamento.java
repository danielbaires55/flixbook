package com.flixbook.flixbook_backend.model;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "appuntamenti")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Appuntamento {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "paziente_id", nullable = false)
    private Paziente paziente;

    @ManyToOne(optional = false)
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
    @Column(nullable = false)
    private StatoAppuntamento stato = StatoAppuntamento.PROGRAMMATO;

    @Column(name = "data_prenotazione", nullable = false)
    private LocalDateTime dataPrenotazione;

    public enum TipoAppuntamento {
        VIRTUALE,
        FISICO
    }

    public enum StatoAppuntamento {
        PROGRAMMATO,
        CONFERMATO,
        COMPLETATO,
        ANNULLATO
    }
}
