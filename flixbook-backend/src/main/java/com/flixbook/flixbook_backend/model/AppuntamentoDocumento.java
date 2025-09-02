package com.flixbook.flixbook_backend.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "appuntamento_documenti")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class AppuntamentoDocumento {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "appuntamento_id", nullable = false)
    private Appuntamento appuntamento;

    @Column(name = "file_name", nullable = false)
    private String fileName; // nome file interno (unico)

    @Column(name = "original_name", nullable = false)
    private String originalName; // nome file originale

    @Column(name = "mime_type")
    private String mimeType;

    @Column(name = "file_size")
    private Long fileSize;

    @Column(name = "uploader_role", nullable = false)
    private String uploaderRole; // PAZIENTE o MEDICO

    @Column(name = "uploaded_at", nullable = false)
    private LocalDateTime uploadedAt;
}
