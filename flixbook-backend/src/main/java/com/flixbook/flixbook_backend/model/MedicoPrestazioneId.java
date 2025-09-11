package com.flixbook.flixbook_backend.model;

import java.io.Serializable;
import lombok.*;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor
public class MedicoPrestazioneId implements Serializable {
    private Long medicoId;
    private Long prestazioneId;

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        MedicoPrestazioneId that = (MedicoPrestazioneId) o;
        return java.util.Objects.equals(medicoId, that.medicoId) && java.util.Objects.equals(prestazioneId, that.prestazioneId);
    }

    @Override
    public int hashCode() {
        return java.util.Objects.hash(medicoId, prestazioneId);
    }
}
