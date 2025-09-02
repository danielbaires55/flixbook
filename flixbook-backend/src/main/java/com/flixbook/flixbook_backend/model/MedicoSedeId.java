package com.flixbook.flixbook_backend.model;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import lombok.AllArgsConstructor;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.io.Serializable;

@Embeddable
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode
public class MedicoSedeId implements Serializable {
    @Column(name = "medico_id")
    private Long medicoId;

    @Column(name = "sede_id")
    private Long sedeId;
}
