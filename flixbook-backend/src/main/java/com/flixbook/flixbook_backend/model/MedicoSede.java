package com.flixbook.flixbook_backend.model;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "medico_sede")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class MedicoSede {
    @EmbeddedId
    private MedicoSedeId id;

    @ManyToOne(fetch = FetchType.LAZY)
    @MapsId("medicoId")
    @JoinColumn(name = "medico_id")
    private Medico medico;

    @ManyToOne(fetch = FetchType.LAZY)
    @MapsId("sedeId")
    @JoinColumn(name = "sede_id")
    private Sede sede;

    @Column(name = "attiva")
    private Boolean attiva = true;
}
