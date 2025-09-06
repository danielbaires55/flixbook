package com.flixbook.flixbook_backend.dto;

import com.flixbook.flixbook_backend.model.Sede;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class SedeDTO {
    private Long id;
    private String nome;
    private String indirizzo;
    private String citta;
    private String provincia;
    private String cap;
    private String telefono;
    private String email;
    private Double lat;
    private Double lng;
    private Boolean attiva;

    public static SedeDTO fromEntity(Sede s) {
        return SedeDTO.builder()
                .id(s.getId())
                .nome(s.getNome())
                .indirizzo(s.getIndirizzo())
                .citta(s.getCitta())
                .provincia(s.getProvincia())
                .cap(s.getCap())
                .telefono(s.getTelefono())
                .email(s.getEmail())
                .lat(s.getLat())
                .lng(s.getLng())
                .attiva(s.getAttiva())
                .build();
    }
}
