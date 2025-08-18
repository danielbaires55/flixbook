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

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "appuntamento_id", nullable = false, unique = true)
    private Appuntamento appuntamento;

    private Integer valutazione;

    @Lob // Annota per campi di testo lunghi
    private String commento;

    @Column(name = "data_feedback", nullable = false)
    private LocalDateTime dataFeedback;
}