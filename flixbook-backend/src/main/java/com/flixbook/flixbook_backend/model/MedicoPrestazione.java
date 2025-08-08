package com.flixbook.flixbook_backend.model;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "medici_prestazioni")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
@IdClass(MedicoPrestazioneId.class)
public class MedicoPrestazione {

    @Id
    @Column(name = "medico_id")
    private Long medicoId;

    @Id
    @Column(name = "prestazione_id")
    private Long prestazioneId;
}
