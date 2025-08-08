package com.flixbook.flixbook_backend.model;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "feedback")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Feedback {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(optional = false)
    @JoinColumn(name = "appuntamento_id", unique = true, nullable = false)
    private Appuntamento appuntamento;

    @Column(nullable = false)
    private Integer valutazione;  // valida da 1 a 5 - gestione controllo a livello DB

    @Lob
    private String commento;

    @Column(name = "data_feedback", nullable = false)
    private LocalDateTime dataFeedback;
}
