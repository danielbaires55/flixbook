package com.flixbook.flixbook_backend.model;

import jakarta.persistence.*;
import lombok.*;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import java.time.LocalDateTime;
import com.fasterxml.jackson.annotation.JsonIgnore;

@Entity
@Table(name = "appuntamenti")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Appuntamento {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    @JoinColumn(name = "paziente_id", nullable = false)
    private Paziente paziente;

    @ManyToOne(fetch = FetchType.LAZY)
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    @JoinColumn(name = "medico_id", nullable = false)
    private Medico medico;

    @ManyToOne(fetch = FetchType.LAZY)
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    @JoinColumn(name = "prestazione_id", nullable = false)
    private Prestazione prestazione;

    @Column(name = "data_e_ora_inizio", nullable = false)
    private LocalDateTime dataEOraInizio;

    @Column(name = "data_e_ora_fine", nullable = false)
    private LocalDateTime dataEOraFine;

    @Enumerated(EnumType.STRING)
    @Column(name = "tipo_appuntamento", nullable = false)
    private TipoAppuntamento tipoAppuntamento;

    @Column(name = "link_videocall")
    private String linkVideocall;

    // Consenso privacy specifico per documenti allegati dal paziente per questo appuntamento
    @Column(name = "privacy_consenso", nullable = false)
    private boolean privacyConsenso = false;

    @Enumerated(EnumType.STRING)
    @Column(name = "stato", nullable = false)
    private StatoAppuntamento stato;

    @Column(name = "data_prenotazione", nullable = false)
    private LocalDateTime dataPrenotazione;
    
    @Column(name = "reminder_inviato", nullable = false)
    @Builder.Default
    private boolean reminderInviato = false;

    @Column(name = "sms_reminder_inviato", nullable = false)
    @Builder.Default
    private boolean smsReminderInviato = false;

    @Column(name = "feedback_inviato", nullable = false)
    @Builder.Default
    private boolean feedbackInviato = false;

    // Collegamento facoltativo al nuovo Slot persistito (1:1)
    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "slot_id")
    @JsonIgnore
    private Slot slot;

    // ====== Sede info (computed, non persistente) ======
    @Transient
    public Long getSedeId() {
        try {
            if (slot != null && slot.getBloccoOrario() != null && slot.getBloccoOrario().getSede() != null) {
                return slot.getBloccoOrario().getSede().getId();
            }
        } catch (Exception ignored) {}
        return null;
    }

    @Transient
    public String getSedeNome() {
        try {
            if (slot != null && slot.getBloccoOrario() != null && slot.getBloccoOrario().getSede() != null) {
                return slot.getBloccoOrario().getSede().getNome();
            }
        } catch (Exception ignored) {}
        return null;
    }

    @Transient
    public String getSedeIndirizzo() {
        try {
            if (slot != null && slot.getBloccoOrario() != null && slot.getBloccoOrario().getSede() != null) {
                return slot.getBloccoOrario().getSede().getIndirizzo();
            }
        } catch (Exception ignored) {}
        return null;
    }

    @Transient
    public String getSedeCitta() {
        try {
            if (slot != null && slot.getBloccoOrario() != null && slot.getBloccoOrario().getSede() != null) {
                return slot.getBloccoOrario().getSede().getCitta();
            }
        } catch (Exception ignored) {}
        return null;
    }

    @Transient
    public String getSedeProvincia() {
        try {
            if (slot != null && slot.getBloccoOrario() != null && slot.getBloccoOrario().getSede() != null) {
                return slot.getBloccoOrario().getSede().getProvincia();
            }
        } catch (Exception ignored) {}
        return null;
    }

    @Transient
    public String getSedeCap() {
        try {
            if (slot != null && slot.getBloccoOrario() != null && slot.getBloccoOrario().getSede() != null) {
                return slot.getBloccoOrario().getSede().getCap();
            }
        } catch (Exception ignored) {}
        return null;
    }
}