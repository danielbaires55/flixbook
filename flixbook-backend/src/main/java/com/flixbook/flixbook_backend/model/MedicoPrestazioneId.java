package com.flixbook.flixbook_backend.model;

import java.io.Serializable;
import lombok.*;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor
public class MedicoPrestazioneId implements Serializable {
    private Long medicoId;
    private Long prestazioneId;
}
