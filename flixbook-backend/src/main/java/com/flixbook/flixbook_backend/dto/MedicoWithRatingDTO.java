package com.flixbook.flixbook_backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MedicoWithRatingDTO {
    private Long id;
    private String nome;
    private String cognome;
    private String imgProfUrl;
    private String biografia;
    private Double avgRating;   // null se nessuna valutazione
    private Long ratingCount;   // 0 se nessuna valutazione
}
