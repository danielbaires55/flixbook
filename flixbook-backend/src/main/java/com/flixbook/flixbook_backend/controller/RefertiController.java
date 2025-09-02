package com.flixbook.flixbook_backend.controller;

import com.flixbook.flixbook_backend.model.AppuntamentoDocumento;
import com.flixbook.flixbook_backend.repository.AppuntamentoDocumentoRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/pazienti/referti")
public class RefertiController {

    @Autowired
    private AppuntamentoDocumentoRepository documentoRepository;

    public record RefertoDTO(
            Long id,
            String originalName,
            String mimeType,
            Long fileSize,
            LocalDateTime uploadedAt,
            Long appuntamentoId,
            String medicoNome,
            String medicoCognome,
            String prestazioneNome,
            String dataEOraInizio,
            String downloadUrl
    ) {}

    public record PageRefertiDTO(
            List<RefertoDTO> items,
            long total,
            int page,
            int size
    ) {}

    @GetMapping
    public ResponseEntity<?> listReferti(
            Authentication authentication,
            @RequestParam(name = "medicoId", required = false) Long medicoId,
            @RequestParam(name = "prestazioneId", required = false) Long prestazioneId,
            @RequestParam(name = "period", required = false) String period,
            @RequestParam(name = "from", required = false) String from,
            @RequestParam(name = "to", required = false) String to,
            @RequestParam(name = "q", required = false) String q,
            @RequestParam(name = "page", required = false) Integer page,
            @RequestParam(name = "size", required = false) Integer size,
            @RequestParam(name = "paged", required = false, defaultValue = "false") boolean paged
    ) {
        String email = authentication.getName();
        List<AppuntamentoDocumento> docs = documentoRepository.findRefertiByPazienteEmail(email);

        // Filtering
        var stream = docs.stream();
        if (medicoId != null) {
            stream = stream.filter(d -> {
                var a = d.getAppuntamento();
                return a.getMedico() != null && medicoId.equals(a.getMedico().getId());
            });
        }
        if (prestazioneId != null) {
            stream = stream.filter(d -> {
                var a = d.getAppuntamento();
                return a.getPrestazione() != null && prestazioneId.equals(a.getPrestazione().getId());
            });
        }
        LocalDateTime fromDt = null, toDt = null;
        if (from != null && !from.isBlank()) {
            try { fromDt = LocalDateTime.parse(from); } catch (Exception ignored) {}
        }
        if (to != null && !to.isBlank()) {
            try { toDt = LocalDateTime.parse(to); } catch (Exception ignored) {}
        }
        if (period != null && !period.isBlank() && (fromDt == null && toDt == null)) {
            LocalDateTime now = LocalDateTime.now();
            switch (period) {
                case "week" -> fromDt = now.minus(7, ChronoUnit.DAYS);
                case "month" -> fromDt = now.minus(30, ChronoUnit.DAYS);
                case "year" -> fromDt = now.minus(365, ChronoUnit.DAYS);
                default -> {}
            }
        }
        if (fromDt != null) {
            var f = fromDt;
            stream = stream.filter(d -> d.getUploadedAt() != null && !d.getUploadedAt().isBefore(f));
        }
        if (toDt != null) {
            var t = toDt;
            stream = stream.filter(d -> d.getUploadedAt() != null && !d.getUploadedAt().isAfter(t));
        }
        if (q != null && !q.isBlank()) {
            String qq = q.toLowerCase();
            stream = stream.filter(d -> {
                var a = d.getAppuntamento();
                var m = a.getMedico();
                var pr = a.getPrestazione();
                return (d.getOriginalName() != null && d.getOriginalName().toLowerCase().contains(qq)) ||
                        (m != null && ((m.getNome() + " " + m.getCognome()).toLowerCase().contains(qq))) ||
                        (pr != null && pr.getNome() != null && pr.getNome().toLowerCase().contains(qq));
            });
        }

        List<RefertoDTO> mapped = stream.map(d -> {
            var a = d.getAppuntamento();
            var m = a.getMedico();
            var pr = a.getPrestazione();
            String downloadUrl = String.format("/api/appuntamenti/%d/documenti/%d", a.getId(), d.getId());
            return new RefertoDTO(
                    d.getId(),
                    d.getOriginalName(),
                    d.getMimeType(),
                    d.getFileSize(),
                    d.getUploadedAt(),
                    a.getId(),
                    m != null ? m.getNome() : null,
                    m != null ? m.getCognome() : null,
                    pr != null ? pr.getNome() : null,
                    a.getDataEOraInizio() != null ? a.getDataEOraInizio().toString() : null,
                    downloadUrl
            );
        }).collect(Collectors.toList());

        if (!paged) {
            return ResponseEntity.ok(mapped);
        }
        int p = page == null || page < 1 ? 1 : page;
        int s = size == null || size < 1 ? 10 : size;
        int fromIndex = Math.min((p - 1) * s, mapped.size());
        int toIndex = Math.min(fromIndex + s, mapped.size());
        List<RefertoDTO> items = mapped.subList(fromIndex, toIndex);
        return ResponseEntity.ok(new PageRefertiDTO(items, mapped.size(), p, s));
    }
}
