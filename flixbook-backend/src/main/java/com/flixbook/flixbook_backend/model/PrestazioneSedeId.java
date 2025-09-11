package com.flixbook.flixbook_backend.model;

import lombok.*;
import java.io.Serializable;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor
public class PrestazioneSedeId implements Serializable {
    private Long prestazioneId;
    private Long sedeId;

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        PrestazioneSedeId that = (PrestazioneSedeId) o;
        return java.util.Objects.equals(prestazioneId, that.prestazioneId) && java.util.Objects.equals(sedeId, that.sedeId);
    }

    @Override
    public int hashCode() { return java.util.Objects.hash(prestazioneId, sedeId); }
}