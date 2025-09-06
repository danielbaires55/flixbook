package com.flixbook.flixbook_backend.controller;

import com.flixbook.flixbook_backend.model.*;
import com.flixbook.flixbook_backend.repository.*;
import com.flixbook.flixbook_backend.service.EmailService;
import com.flixbook.flixbook_backend.service.AppuntamentoService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import org.springframework.jdbc.core.JdbcTemplate;

@RestController
@RequestMapping("/api/admin")
public class AdminController {

    private final MedicoRepository medicoRepository;
    private final PasswordEncoder passwordEncoder;
    private final SedeRepository sedeRepository;
    private final MedicoSedeRepository medicoSedeRepository;
    private final CollaboratoreRepository collaboratoreRepository;
    private final PrestazioneRepository prestazioneRepository;
    private final SpecialitaRepository specialitaRepository;
    private final MedicoPrestazioneRepository medicoPrestazioneRepository;
    private final AppuntamentoRepository appuntamentoRepository;
    private final SlotRepository slotRepository;
    private final BloccoOrarioRepository bloccoOrarioRepository;
    private final EmailService emailService;
    private final JdbcTemplate jdbcTemplate;
    private final AppuntamentoService appuntamentoService;

    public AdminController(MedicoRepository medicoRepository,
                           PasswordEncoder passwordEncoder,
                           SedeRepository sedeRepository,
                           MedicoSedeRepository medicoSedeRepository,
                           CollaboratoreRepository collaboratoreRepository,
                           PrestazioneRepository prestazioneRepository,
                           SpecialitaRepository specialitaRepository,
                           MedicoPrestazioneRepository medicoPrestazioneRepository,
                           AppuntamentoRepository appuntamentoRepository,
                           SlotRepository slotRepository,
                           BloccoOrarioRepository bloccoOrarioRepository,
                           EmailService emailService,
                           JdbcTemplate jdbcTemplate,
                           AppuntamentoService appuntamentoService) {
        this.medicoRepository = medicoRepository;
        this.passwordEncoder = passwordEncoder;
        this.sedeRepository = sedeRepository;
        this.medicoSedeRepository = medicoSedeRepository;
        this.collaboratoreRepository = collaboratoreRepository;
        this.prestazioneRepository = prestazioneRepository;
        this.specialitaRepository = specialitaRepository;
        this.medicoPrestazioneRepository = medicoPrestazioneRepository;
        this.appuntamentoRepository = appuntamentoRepository;
        this.slotRepository = slotRepository;
        this.bloccoOrarioRepository = bloccoOrarioRepository;
        this.emailService = emailService;
        this.jdbcTemplate = jdbcTemplate;
        this.appuntamentoService = appuntamentoService;
    }

    // -------------------- MEDICI --------------------
    @GetMapping("/medici")
    public List<Medico> listMedici() { return medicoRepository.findAll(); }

    @PostMapping("/medici")
    @Transactional
    public ResponseEntity<?> createMedico(@RequestBody Map<String, Object> body) {
        String nome = trim((String) body.get("nome"));
        String cognome = trim((String) body.get("cognome"));
        String email = trim((String) body.get("email"));
        String telefono = trim((String) body.get("telefono"));
        String password = (String) body.get("password");
        // Accetta sia specialitaId singolo sia lista specialitaIds
        Long specialitaId = parseLong(body.get("specialitaId") instanceof String ? (String) body.get("specialitaId") : null);
        @SuppressWarnings("unchecked")
        List<Integer> specialitaIdsList = (List<Integer>) body.get("specialitaIds");
    // Accetta anche sedi alla creazione: sedeId singolo o lista sedeIds
    Long sedeIdSingola = null;
    Object sedeIdObj = body.get("sedeId");
    if (sedeIdObj instanceof String s) sedeIdSingola = parseLong(s);
    else if (sedeIdObj instanceof Number n) sedeIdSingola = n.longValue();
    @SuppressWarnings("unchecked")
    List<Integer> sedeIdsList = (List<Integer>) body.get("sedeIds");
        if (nome == null || cognome == null || email == null || password == null || password.length() < 6) {
            return ResponseEntity.badRequest().body(Map.of("error", "Nome, cognome, email e password (>=6) sono obbligatori"));
        }
        // Valida: deve esserci almeno una specialità (singola o lista)
        if ((specialitaIdsList == null || specialitaIdsList.isEmpty()) && specialitaId == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "Almeno una specialità è obbligatoria"));
        }
        if (medicoRepository.findByEmail(email).isPresent()) {
            return ResponseEntity.status(409).body(Map.of("error", "Email già in uso"));
        }
        Medico m = new Medico();
        m.setNome(nome);
        m.setCognome(cognome);
        m.setEmail(email);
        m.setTelefono(telefono);
        m.setPasswordHash(passwordEncoder.encode(password));
        m.setRuolo("ROLE_MEDICO");
    medicoRepository.save(m);

        // Costruisci l'insieme di specialità da usare
        java.util.Set<Long> allSpecialita = new java.util.HashSet<>();
        if (specialitaId != null) allSpecialita.add(specialitaId);
        if (specialitaIdsList != null) {
            for (Integer sid : specialitaIdsList) if (sid != null) allSpecialita.add(sid.longValue());
        }
        // Valida che esistano
        for (Long sid : allSpecialita) {
            if (specialitaRepository.findById(sid).isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("error", "Specialità non trovata: " + sid));
            }
        }
        // Auto-assegna tutte le prestazioni per ogni specialità
        java.util.Set<Long> prestazioniAssegnate = new java.util.HashSet<>();
        for (Long sid : allSpecialita) {
            var prestazioni = prestazioneRepository.findBySpecialitaId(sid);
            for (var p : prestazioni) {
                if (prestazioniAssegnate.add(p.getId())) {
                    MedicoPrestazione mp = MedicoPrestazione.builder()
                            .medicoId(m.getId())
                            .prestazioneId(p.getId())
                            .build();
                    medicoPrestazioneRepository.save(mp);
                }
            }
        }

        // Assegna le sedi richieste (se fornite)
        java.util.Set<Long> sediDaAssociare = new java.util.HashSet<>();
        if (sedeIdSingola != null) sediDaAssociare.add(sedeIdSingola);
        if (sedeIdsList != null) {
            for (Integer sid : sedeIdsList) if (sid != null) sediDaAssociare.add(sid.longValue());
        }
        for (Long sId : sediDaAssociare) {
            var sedeOpt = sedeRepository.findById(sId);
            if (sedeOpt.isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("error", "Sede non trovata: " + sId));
            }
            MedicoSedeId id = new MedicoSedeId(m.getId(), sId);
            if (!medicoSedeRepository.existsById(id)) {
                MedicoSede ms = new MedicoSede();
                ms.setId(id);
                ms.setMedico(m);
                ms.setSede(sedeOpt.get());
                ms.setAttiva(true);
                medicoSedeRepository.save(ms);
            }
        }
        // Invia email di benvenuto con password temporanea e link di primo accesso
        try {
            String linkPrimoAccesso = "http://localhost:5173/login";
            String emailBody = "Ciao " + m.getNome() + ",\n" +
                    "il tuo account medico su Flixbook è stato creato.\n" +
                    "Email: " + m.getEmail() + "\n" +
                    "Password temporanea: " + password + "\n\n" +
                    "Per effettuare il primo accesso vai qui: " + linkPrimoAccesso + "\n" +
                    "Per sicurezza, cambia la password al primo login dal tuo profilo.";
            emailService.sendEmail(m.getEmail(), "Benvenuto su Flixbook - Credenziali temporanee", emailBody);
        } catch (Exception ex) {
            // Log soft-fail, ma non bloccare la creazione
            System.err.println("Invio email benvenuto fallito: " + ex.getMessage());
        }
        return ResponseEntity.ok(m);
    }

    @DeleteMapping("/medici/{medicoId}")
    @Transactional
    public ResponseEntity<?> deleteMedico(@PathVariable Long medicoId) {
        if (!medicoRepository.existsById(medicoId)) return ResponseEntity.notFound().build();

        // Blocca eliminazione solo se esistono appuntamenti attivi nel futuro
        long attiviFuturi = appuntamentoRepository.countAttiviFuturiByMedicoId(medicoId, java.time.LocalDateTime.now());
        if (attiviFuturi > 0) {
            return ResponseEntity.status(409).body(Map.of(
                "error", "Impossibile eliminare: il medico ha appuntamenti attivi nel futuro",
                "attiviFuturi", attiviFuturi
            ));
        }

    // Raccogli conteggi prima della cancellazione
    long totApp = appuntamentoRepository.countByMedico_Id(medicoId);
    long totSlot = slotRepository.countByMedico_Id(medicoId);
    long totBlocchi = bloccoOrarioRepository.countByMedicoId(medicoId);
    int totAssocPrest = medicoPrestazioneRepository.findByMedicoId(medicoId).size();
    int totAssocSedi = medicoSedeRepository.findByIdMedicoId(medicoId).size();
    // Calcola collaboratori associati SOLO dalla join table (legacy colonna rimossa)
    Integer totCollab = jdbcTemplate.queryForObject(
        "SELECT COUNT(*) FROM collaboratori_medici WHERE medico_id = ?", Integer.class, medicoId);
    var appIds = appuntamentoRepository.findIdsByMedicoId(medicoId);
    long totFeedback = 0L;
    if (appIds != null && !appIds.isEmpty()) {
        String qs = appIds.stream().map(id -> "?").reduce((a,b) -> a+","+b).orElse("?");
        Long count = jdbcTemplate.queryForObject(
            "SELECT COUNT(*) FROM feedback WHERE appuntamento_id IN (" + qs + ")",
            Long.class,
            appIds.toArray()
        );
        totFeedback = count != null ? count : 0L;
    }

    // 1) Pulisci associazioni many-to-many
    medicoPrestazioneRepository.deleteByMedicoId(medicoId);
    medicoSedeRepository.deleteByIdMedicoId(medicoId);
    jdbcTemplate.update("DELETE FROM collaboratori_medici WHERE medico_id = ?", medicoId);

    // 2) Rimuovi collaboratori collegati a questo medico
    // Elimina collaboratori associati (via join) se necessario (business rule precedente conservata)
    var collabIds = jdbcTemplate.query("SELECT collaboratore_id FROM collaboratori_medici WHERE medico_id = ?",
        (rs, rn) -> rs.getLong(1), medicoId);
    for (Long cid : collabIds) {
        collaboratoreRepository.deleteById(cid);
    }

    // 3) Cancella appuntamenti e relativi feedback
    if (appIds != null && !appIds.isEmpty()) {
        String qs = appIds.stream().map(id -> "?").reduce((a,b) -> a+","+b).orElse("?");
        jdbcTemplate.update(
            "DELETE FROM feedback WHERE appuntamento_id IN (" + qs + ")",
            appIds.toArray()
        );
        appuntamentoRepository.deleteAllById(appIds);
    }

    // 4) Cancella slot e blocchi orario del medico
    slotRepository.deleteByMedico_Id(medicoId);
    bloccoOrarioRepository.deleteByMedicoId(medicoId);

    // 5) Elimina il medico
    medicoRepository.deleteById(medicoId);

    return ResponseEntity.ok(Map.of(
        "removedAppuntamenti", totApp,
        "removedFeedback", totFeedback,
        "removedSlot", totSlot,
        "removedBlocchiOrario", totBlocchi,
        "removedAssociazioniPrestazioni", totAssocPrest,
        "removedAssociazioniSedi", totAssocSedi,
        "removedCollaboratori", totCollab
    ));
    }

    // -------------------- MANUAL TASKS (ADMIN) --------------------
    /**
     * Trigger manuale dell'invio richieste feedback per appuntamenti COMPLETATI con feedbackInviato=false.
     * Ritorna conteggi prima/dopo per diagnosi rapida. Solo ADMIN.
     */
    @PostMapping("/feedback/scan")
    @Transactional
    public ResponseEntity<?> triggerFeedbackScan() {
    int before = appuntamentoRepository
        .findByStatoAndFeedbackInviatoIsFalse(StatoAppuntamento.COMPLETATO)
        .size();
    appuntamentoService.inviaRichiesteFeedbackDiAvvio();
    int after = appuntamentoRepository
        .findByStatoAndFeedbackInviatoIsFalse(StatoAppuntamento.COMPLETATO)
        .size();
    int sent = Math.max(0, before - after);
    return ResponseEntity.ok(Map.of(
        "trovatiPrima", before,
        "rimanenti", after,
        "inviati", sent
    ));
    }

    // -------------------- ASSOCIAZIONI SPECIALITÀ ↔ MEDICO (prestazioni auto) --------------------
    @PostMapping("/medici/{medicoId}/specialita/{specialitaId}")
    @Transactional
    public ResponseEntity<?> assegnaSpecialita(@PathVariable Long medicoId, @PathVariable Long specialitaId) {
        var medico = medicoRepository.findById(medicoId).orElse(null);
        if (medico == null) return ResponseEntity.notFound().build();
        if (specialitaRepository.findById(specialitaId).isEmpty()) return ResponseEntity.badRequest().body(Map.of("error", "Specialità non trovata"));
        var prestazioni = prestazioneRepository.findBySpecialitaId(specialitaId);
        for (var p : prestazioni) {
            MedicoPrestazione mp = MedicoPrestazione.builder().medicoId(medicoId).prestazioneId(p.getId()).build();
            // evita duplicati: usa save che su PK dup lancia; meglio controllare prima
            if (!medicoPrestazioneRepository.existsById(new MedicoPrestazioneId(medicoId, p.getId()))) {
                medicoPrestazioneRepository.save(mp);
            }
        }
        return ResponseEntity.ok().build();
    }

    @DeleteMapping("/medici/{medicoId}/specialita/{specialitaId}")
    @Transactional
    public ResponseEntity<?> rimuoviSpecialita(@PathVariable Long medicoId, @PathVariable Long specialitaId) {
        if (!medicoRepository.existsById(medicoId)) return ResponseEntity.notFound().build();
        if (specialitaRepository.findById(specialitaId).isEmpty()) return ResponseEntity.badRequest().body(Map.of("error", "Specialità non trovata"));
        var prestazioni = prestazioneRepository.findBySpecialitaId(specialitaId);
        var ids = prestazioni.stream().map(Prestazione::getId).toList();
        if (!ids.isEmpty()) medicoPrestazioneRepository.deleteByMedicoIdAndPrestazioneIdIn(medicoId, ids);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/medici/{medicoId}/specialita")
    public ResponseEntity<?> getSpecialitaAssegnate(@PathVariable Long medicoId) {
        var medico = medicoRepository.findById(medicoId).orElse(null);
        if (medico == null) return ResponseEntity.notFound().build();
        var assoc = medicoPrestazioneRepository.findByMedicoId(medicoId);
        if (assoc.isEmpty()) return ResponseEntity.ok(List.of());
        var prestIds = assoc.stream().map(MedicoPrestazione::getPrestazioneId).toList();
        var prest = prestazioneRepository.findAllById(prestIds);
        // Distinct Specialità by ID, maintain a simple order by name
        var map = new java.util.LinkedHashMap<Long, Specialita>();
        prest.stream().map(Prestazione::getSpecialita).filter(java.util.Objects::nonNull)
                .sorted(java.util.Comparator.comparing(Specialita::getNome, java.text.Collator.getInstance(java.util.Locale.ITALIAN)))
                .forEach(sp -> map.putIfAbsent(sp.getId(), sp));
        return ResponseEntity.ok(map.values());
    }

    // -------------------- SEDI --------------------
    @GetMapping("/sedi")
    public List<Sede> listSedi() { return sedeRepository.findAll(); }

    @PostMapping("/sedi")
    public ResponseEntity<?> createSede(@RequestBody Sede sede) {
        if (sede.getNome() == null || sede.getNome().trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Il nome della sede è obbligatorio"));
        }
        if (sedeRepository.findByNome(sede.getNome()).isPresent()) {
            return ResponseEntity.status(409).body(Map.of("error", "Esiste già una sede con questo nome"));
        }
        sede.setId(null);
        if (sede.getAttiva() == null) sede.setAttiva(true);
        return ResponseEntity.ok(sedeRepository.save(sede));
    }

    @PutMapping("/sedi/{id}")
    public ResponseEntity<?> updateSede(@PathVariable Long id, @RequestBody Sede body) {
        return sedeRepository.findById(id)
                .map(s -> {
                    s.setNome(body.getNome() != null ? body.getNome() : s.getNome());
                    s.setIndirizzo(body.getIndirizzo());
                    s.setCitta(body.getCitta());
                    s.setProvincia(body.getProvincia());
                    s.setCap(body.getCap());
                    s.setTelefono(body.getTelefono());
                    s.setEmail(body.getEmail());
                    s.setLat(body.getLat());
                    s.setLng(body.getLng());
                    s.setAttiva(body.getAttiva() == null ? s.getAttiva() : body.getAttiva());
                    return ResponseEntity.ok(sedeRepository.save(s));
                })
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @DeleteMapping("/sedi/{id}")
    public ResponseEntity<?> deleteSede(@PathVariable Long id) {
    if (!sedeRepository.existsById(id)) return ResponseEntity.notFound().build();
    long assoc = medicoSedeRepository.countBySedeId(id);
    if (assoc > 0) {
        return ResponseEntity.status(409).body(Map.of(
            "error", "Impossibile eliminare la sede: ci sono ancora " + assoc + " medico/i associati",
            "associations", assoc
        ));
    }
    sedeRepository.deleteById(id);
    return ResponseEntity.noContent().build();
    }

    // -------------------- MEDICO-SEDE --------------------
    @GetMapping("/medici/{medicoId}/sedi")
    public ResponseEntity<?> getSediByMedico(@PathVariable Long medicoId) {
        if (!medicoRepository.existsById(medicoId)) return ResponseEntity.notFound().build();
        var all = sedeRepository.findAll();
        // naive: return only assigned by filtering join table loaded lazily via repository method
        var assigned = all.stream().filter(s -> medicoSedeRepository.medicoAssociatoASede(medicoId, s.getId())).toList();
        return ResponseEntity.ok(assigned);
    }

    @PostMapping("/medici/{medicoId}/sedi/{sedeId}")
    public ResponseEntity<?> assignSedeToMedico(@PathVariable Long medicoId, @PathVariable Long sedeId) {
        Medico medico = medicoRepository.findById(medicoId).orElse(null);
        Sede sede = sedeRepository.findById(sedeId).orElse(null);
        if (medico == null || sede == null) return ResponseEntity.notFound().build();
        MedicoSedeId id = new MedicoSedeId(medicoId, sedeId);
        if (medicoSedeRepository.existsById(id)) return ResponseEntity.ok().build();
        MedicoSede ms = new MedicoSede();
        ms.setId(id);
        ms.setMedico(medico);
        ms.setSede(sede);
        ms.setAttiva(true);
        medicoSedeRepository.save(ms);
        return ResponseEntity.ok().build();
    }

    @DeleteMapping("/medici/{medicoId}/sedi/{sedeId}")
    public ResponseEntity<?> unassignSedeFromMedico(@PathVariable Long medicoId, @PathVariable Long sedeId) {
        MedicoSedeId id = new MedicoSedeId(medicoId, sedeId);
        if (!medicoSedeRepository.existsById(id)) return ResponseEntity.notFound().build();
        medicoSedeRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }

    // -------------------- COLLABORATORI --------------------
    @GetMapping("/collaboratori")
    public List<Collaboratore> listCollaboratori(@RequestParam(required = false) Long medicoId) {
        if (medicoId == null) return collaboratoreRepository.findAll();
        // Ritorna i collaboratori associati tramite join table
        var ids = jdbcTemplate.query("SELECT collaboratore_id FROM collaboratori_medici WHERE medico_id = ?",
            (rs, rn) -> rs.getLong(1), medicoId);
        if (ids.isEmpty()) return List.of();
        return collaboratoreRepository.findAllById(ids);
    }

    @PostMapping("/collaboratori")
    @Transactional
    public ResponseEntity<?> createCollaboratore(@RequestBody Map<String, String> body) {
        Long medicoId = parseLong(body.get("medicoId"));
        String nome = trim(body.get("nome"));
        String cognome = trim(body.get("cognome"));
        String email = trim(body.get("email"));
        String telefono = trim(body.get("telefono"));
        String password = body.get("password");
        if (medicoId == null || nome == null || cognome == null || email == null || password == null || password.length() < 6) {
            return ResponseEntity.badRequest().body(Map.of("error", "medicoId, nome, cognome, email e password (>=6) sono obbligatori"));
        }
    if (!medicoRepository.existsById(medicoId)) return ResponseEntity.badRequest().body(Map.of("error", "Medico non trovato"));
        if (collaboratoreRepository.findByEmail(email).isPresent()) {
            return ResponseEntity.status(409).body(Map.of("error", "Email collaboratore già in uso"));
        }
    Collaboratore c = Collaboratore.builder()
        .nome(nome)
        .cognome(cognome)
        .email(email)
        .telefono(telefono)
        .passwordHash(passwordEncoder.encode(password))
        .build();
    c = collaboratoreRepository.save(c);
    // Crea associazione nella join table
    jdbcTemplate.update("INSERT INTO collaboratori_medici(collaboratore_id, medico_id) VALUES (?, ?)", c.getId(), medicoId);
    return ResponseEntity.ok(c);
    }

    @PutMapping("/collaboratori/{id}")
    public ResponseEntity<?> updateCollaboratore(@PathVariable Long id, @RequestBody Map<String, String> body) {
        return collaboratoreRepository.findById(id)
                .map(c -> {
                    if (body.containsKey("nome")) c.setNome(trim(body.get("nome")));
                    if (body.containsKey("cognome")) c.setCognome(trim(body.get("cognome")));
                    if (body.containsKey("telefono")) c.setTelefono(trim(body.get("telefono")));
                    if (body.containsKey("newPassword")) {
                        String p = body.get("newPassword");
                        if (p != null && p.length() >= 6) c.setPasswordHash(passwordEncoder.encode(p));
                    }
                    return ResponseEntity.ok(collaboratoreRepository.save(c));
                })
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @DeleteMapping("/collaboratori/{id}")
    public ResponseEntity<?> deleteCollaboratore(@PathVariable Long id) {
        if (!collaboratoreRepository.existsById(id)) return ResponseEntity.notFound().build();
        // Pulisci relazioni many-to-many prima di cancellare il collaboratore
        jdbcTemplate.update("DELETE FROM collaboratori_medici WHERE collaboratore_id = ?", id);
        collaboratoreRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }

    // -------------------- COLLABORATORE ↔ MEDICO (many-to-many aggiuntivo) --------------------
    @GetMapping("/medici/{medicoId}/collaboratori")
    public ResponseEntity<?> listCollaboratoriAssegnati(@PathVariable Long medicoId) {
        if (!medicoRepository.existsById(medicoId)) return ResponseEntity.notFound().build();
        var joinIds = jdbcTemplate.query("SELECT collaboratore_id FROM collaboratori_medici WHERE medico_id = ?",
            (rs, rowNum) -> rs.getLong(1), medicoId);
        if (joinIds.isEmpty()) return ResponseEntity.ok(List.of());
        return ResponseEntity.ok(collaboratoreRepository.findAllById(joinIds));
    }

    @PostMapping("/medici/{medicoId}/collaboratori/{collaboratoreId}")
    public ResponseEntity<?> assegnaCollaboratoreEsistente(@PathVariable Long medicoId, @PathVariable Long collaboratoreId) {
        var medico = medicoRepository.findById(medicoId).orElse(null);
        var collab = collaboratoreRepository.findById(collaboratoreId).orElse(null);
    if (medico == null || collab == null) return ResponseEntity.notFound().build();
    // Inserisci se non esiste già nella join
        Integer count = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM collaboratori_medici WHERE collaboratore_id = ? AND medico_id = ?",
                Integer.class, collaboratoreId, medicoId);
        if (count == null || count == 0) {
            jdbcTemplate.update("INSERT INTO collaboratori_medici(collaboratore_id, medico_id) VALUES (?, ?)", collaboratoreId, medicoId);
        }
        return ResponseEntity.ok().build();
    }

    @DeleteMapping("/medici/{medicoId}/collaboratori/{collaboratoreId}")
    public ResponseEntity<?> rimuoviCollaboratoreDaMedico(@PathVariable Long medicoId, @PathVariable Long collaboratoreId) {
        if (!medicoRepository.existsById(medicoId) || !collaboratoreRepository.existsById(collaboratoreId)) {
            return ResponseEntity.notFound().build();
        }
    jdbcTemplate.update("DELETE FROM collaboratori_medici WHERE collaboratore_id = ? AND medico_id = ?", collaboratoreId, medicoId);
        return ResponseEntity.noContent().build();
    }

    private String trim(String s) { return s == null ? null : s.trim(); }
    private Long parseLong(String s) { try { return s == null ? null : Long.parseLong(s); } catch (Exception e) { return null; } }
}
