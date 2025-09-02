package com.flixbook.flixbook_backend.service;

import com.flixbook.flixbook_backend.dto.MedicoWithRatingDTO;
import com.flixbook.flixbook_backend.model.Medico;
import com.flixbook.flixbook_backend.repository.FeedbackRepository;
import com.flixbook.flixbook_backend.repository.MedicoRepository;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.stream.Collectors;

@Service
public class MedicoRatingsService {
    private final MedicoRepository medicoRepository;
    private final FeedbackRepository feedbackRepository;

    public MedicoRatingsService(MedicoRepository medicoRepository, FeedbackRepository feedbackRepository) {
        this.medicoRepository = medicoRepository;
        this.feedbackRepository = feedbackRepository;
    }

    public List<MedicoWithRatingDTO> listAllWithRatings() {
        List<Medico> medici = medicoRepository.findAll();
        Map<Long, double[]> agg = toAggMap(feedbackRepository.findAvgAndCountPerMedico());
        return medici.stream().map(m -> buildDto(m, agg.get(m.getId()))).collect(Collectors.toList());
    }

    public List<MedicoWithRatingDTO> listByPrestazioneWithRatings(Long prestazioneId) {
        List<Medico> medici = medicoRepository.findMediciByPrestazioneId(prestazioneId);
        Map<Long, double[]> agg = toAggMap(feedbackRepository.findAvgAndCountPerMedicoByPrestazione(prestazioneId));
        return medici.stream().map(m -> buildDto(m, agg.get(m.getId()))).collect(Collectors.toList());
    }

    private static Map<Long, double[]> toAggMap(List<Object[]> rows) {
        Map<Long, double[]> map = new HashMap<>();
        if (rows == null) return map;
        for (Object[] r : rows) {
            Long id = (Long) r[0];
            Double avg = r[1] != null ? ((Number) r[1]).doubleValue() : null;
            Long cnt = r[2] != null ? ((Number) r[2]).longValue() : 0L;
            map.put(id, new double[]{ avg == null ? Double.NaN : avg, cnt.doubleValue() });
        }
        return map;
    }

    private static MedicoWithRatingDTO buildDto(Medico m, double[] agg) {
        Double avg = null; Long cnt = 0L;
        if (agg != null) {
            avg = Double.isNaN(agg[0]) ? null : agg[0];
            cnt = (long) agg[1];
        }
        return MedicoWithRatingDTO.builder()
                .id(m.getId())
                .nome(m.getNome())
                .cognome(m.getCognome())
                .imgProfUrl(m.getImgProfUrl())
                .biografia(m.getBiografia())
                .avgRating(avg)
                .ratingCount(cnt)
                .build();
    }
}
