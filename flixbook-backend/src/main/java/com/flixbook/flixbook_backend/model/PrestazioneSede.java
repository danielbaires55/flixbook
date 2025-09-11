package com.flixbook.flixbook_backend.model;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "prestazioni_sedi")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
@IdClass(PrestazioneSedeId.class)
public class PrestazioneSede {

    @Id
    @Column(name = "prestazione_id")
    private Long prestazioneId;

    @Id
    @Column(name = "sede_id")
    private Long sedeId;

    @Column(name = "costo", nullable = false)
    private Double costo;
}