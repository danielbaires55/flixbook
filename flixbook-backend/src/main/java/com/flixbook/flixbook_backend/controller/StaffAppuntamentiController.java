package com.flixbook.flixbook_backend.controller;

import com.flixbook.flixbook_backend.model.*;
import com.flixbook.flixbook_backend.repository.*;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/medici")
public class StaffAppuntamentiController {

    private final SlotRepository slotRepository;
    private final PrestazioneRepository prestazioneRepository;
    private final PazienteRepository pazienteRepository;
    private final AppuntamentoRepository appuntamentoRepository;
    private final PasswordEncoder passwordEncoder;

    public StaffAppuntamentiController(SlotRepository slotRepository,
                                       PrestazioneRepository prestazioneRepository,
                                       PazienteRepository pazienteRepository,
                                       AppuntamentoRepository appuntamentoRepository,
                                       PasswordEncoder passwordEncoder) {
        this.slotRepository = slotRepository;
        this.prestazioneRepository = prestazioneRepository;
        this.pazienteRepository = pazienteRepository;
        this.appuntamentoRepository = appuntamentoRepository;
        this.passwordEncoder = passwordEncoder;
    }

    private String trim(String s) { return s == null ? null : s.trim(); }
    private Long parseLong(String s) { try { return s == null ? null : Long.parseLong(s); } catch (Exception e) { return null; } }

    /**
     * Crea appuntamento per conto del paziente (telefonico) lato Medico/Collaboratore.
     * body: { slotId, prestazioneId, pazienteId?, paziente?: { nome,cognome,telefono,email? } }
     */
    @PostMapping("/appuntamenti/staff-create")
    @Transactional
    public ResponseEntity<?> staffCreate(@RequestBody Map<String, Object> body) {
        Long slotId = parseLong(String.valueOf(body.get("slotId")));
        Long prestazioneId = parseLong(String.valueOf(body.get("prestazioneId")));
        Long pazienteId = null;
        Object pazIdObj = body.get("pazienteId");
        if (pazIdObj instanceof Number n) pazienteId = n.longValue();
        else if (pazIdObj instanceof String s) pazienteId = parseLong(s);

        if (slotId == null || prestazioneId == null) return ResponseEntity.badRequest().body(Map.of("error","slotId e prestazioneId sono obbligatori"));

        var slot = slotRepository.findById(slotId).orElse(null);
        if (slot == null) return ResponseEntity.status(404).body(Map.of("error","Slot non trovato"));
        if (slot.getStato() != SlotStato.DISPONIBILE) return ResponseEntity.status(409).body(Map.of("error","Slot non disponibile"));

        var prest = prestazioneRepository.findById(prestazioneId).orElse(null);
        if (prest == null) return ResponseEntity.status(404).body(Map.of("error","Prestazione non trovata"));

        Paziente paziente = null;
        if (pazienteId != null) {
            paziente = pazienteRepository.findById(pazienteId).orElse(null);
            if (paziente == null) return ResponseEntity.status(404).body(Map.of("error","Paziente non trovato"));
        } else {
            @SuppressWarnings("unchecked") Map<String,Object> paz = (Map<String,Object>) body.get("paziente");
            if (paz == null) return ResponseEntity.badRequest().body(Map.of("error","Dati paziente mancanti"));
            String nome = trim((String) paz.get("nome"));
            String cognome = trim((String) paz.get("cognome"));
            String telefono = trim((String) paz.get("telefono"));
            String email = trim((String) paz.get("email"));
            String codiceFiscale = trim((String) paz.get("codiceFiscale"));
            if (nome == null || cognome == null || telefono == null) return ResponseEntity.badRequest().body(Map.of("error","nome, cognome e telefono sono obbligatori"));
            if (email != null && pazienteRepository.existsByEmail(email)) {
                paziente = pazienteRepository.findByEmail(email).orElse(null);
            }
            if (paziente == null) {
                String effectiveEmail = (email != null && !email.isBlank()) ? email : ("noemail+" + System.currentTimeMillis() + "@invalid");
                Paziente pz = new Paziente();
                pz.setNome(nome);
                pz.setCognome(cognome);
                pz.setTelefono(telefono);
                pz.setEmail(effectiveEmail);
                pz.setPasswordHash(passwordEncoder.encode(java.util.UUID.randomUUID().toString()));
                pz.setRuolo("ROLE_PAZIENTE");
                pz.setDataRegistrazione(java.time.LocalDateTime.now());
                if (codiceFiscale != null && !codiceFiscale.isBlank()) {
                    pz.setCodiceFiscale(codiceFiscale);
                }
                paziente = pazienteRepository.save(pz);
            }
        }

        Appuntamento a = Appuntamento.builder()
                .paziente(paziente)
                .medico(slot.getMedico())
                .prestazione(prest)
                .dataEOraInizio(slot.getDataEOraInizio())
                .dataEOraFine(slot.getDataEOraFine())
                .tipoAppuntamento(prest.getTipoPrestazione() == TipoPrestazione.virtuale ? TipoAppuntamento.virtuale : TipoAppuntamento.fisico)
                .stato(StatoAppuntamento.CONFERMATO)
                .dataPrenotazione(java.time.LocalDateTime.now())
                .slot(slot)
                .build();
        a = appuntamentoRepository.save(a);
        slot.setStato(SlotStato.OCCUPATO);
        slotRepository.save(slot);
        return ResponseEntity.ok(Map.of("appuntamentoId", a.getId()));
    }
}
