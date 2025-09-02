package com.flixbook.flixbook_backend.controller;

import com.flixbook.flixbook_backend.config.CustomUserDetails;
import com.flixbook.flixbook_backend.model.Appuntamento;
import com.flixbook.flixbook_backend.model.AppuntamentoDocumento;
import com.flixbook.flixbook_backend.repository.AppuntamentoDocumentoRepository;
import com.flixbook.flixbook_backend.repository.AppuntamentoRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.*;
import java.time.LocalDateTime;
import java.util.List;

@RestController
@RequestMapping("/api/appuntamenti/{appuntamentoId}/documenti")
public class AppuntamentoDocumentoController {

    private final Path storageDir = Paths.get("src/main/resources/static/docs");

    @Autowired
    private AppuntamentoRepository appuntamentoRepository;
    @Autowired
    private AppuntamentoDocumentoRepository documentoRepository;

    @GetMapping
    public ResponseEntity<?> list(@PathVariable Long appuntamentoId, Authentication authentication) {
        Appuntamento app = appuntamentoRepository.findById(appuntamentoId).orElse(null);
        if (app == null) return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Appuntamento non trovato");
        if (!canAccess(authentication, app)) return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Accesso negato");
        List<AppuntamentoDocumento> docs = documentoRepository.findByAppuntamentoId(appuntamentoId);
        return ResponseEntity.ok(docs);
    }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<?> upload(@PathVariable Long appuntamentoId,
                                    @RequestPart("file") MultipartFile file,
                                    @RequestParam(name = "privacyConsenso", required = false) Boolean privacyConsenso,
                                    Authentication authentication) throws IOException {
        Appuntamento app = appuntamentoRepository.findById(appuntamentoId).orElse(null);
        if (app == null) return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Appuntamento non trovato");
        if (!canAccess(authentication, app)) return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Accesso negato");

        // Basic validation: allow only pdf/jpg/jpeg/png; max 10MB is already enforced by Spring config
        String ct = file.getContentType() == null ? "" : file.getContentType().toLowerCase();
        if (!(ct.equals("application/pdf") || ct.equals("image/png") || ct.equals("image/jpg") || ct.equals("image/jpeg"))) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("Tipo file non consentito (solo PDF/PNG/JPG)");
        }

        CustomUserDetails user = (CustomUserDetails) authentication.getPrincipal();
        String role = user.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_MEDICO")) ? "MEDICO" : "PAZIENTE";

        Files.createDirectories(storageDir);
        String safeName = (file.getOriginalFilename() == null ? "documento" : file.getOriginalFilename()).replaceAll("[^a-zA-Z0-9._-]", "_");
        String stored = app.getId() + "_" + System.currentTimeMillis() + "_" + safeName;
        Path target = storageDir.resolve(stored);
        Files.copy(file.getInputStream(), target, StandardCopyOption.REPLACE_EXISTING);

        AppuntamentoDocumento doc = AppuntamentoDocumento.builder()
                .appuntamento(app)
                .fileName(stored)
                .originalName(safeName)
                .mimeType(file.getContentType())
                .fileSize(file.getSize())
                .uploaderRole(role)
                .uploadedAt(LocalDateTime.now())
                .build();
        documentoRepository.save(doc);

        if (privacyConsenso != null && role.equals("PAZIENTE")) {
            app.setPrivacyConsenso(privacyConsenso);
            appuntamentoRepository.save(app);
        }
        return ResponseEntity.ok(doc);
    }

    @GetMapping("/{docId}")
    public ResponseEntity<?> download(@PathVariable Long appuntamentoId, @PathVariable Long docId, Authentication authentication) throws IOException {
        AppuntamentoDocumento doc = documentoRepository.findById(docId).orElse(null);
        if (doc == null || !doc.getAppuntamento().getId().equals(appuntamentoId)) return ResponseEntity.notFound().build();
        if (!canAccess(authentication, doc.getAppuntamento())) return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Accesso negato");
        Path path = storageDir.resolve(doc.getFileName());
        if (!Files.exists(path)) return ResponseEntity.notFound().build();
        byte[] content = Files.readAllBytes(path);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + doc.getOriginalName() + "\"")
                .contentType(MediaType.parseMediaType(doc.getMimeType() != null ? doc.getMimeType() : MediaType.APPLICATION_OCTET_STREAM_VALUE))
                .body(content);
    }

    @DeleteMapping("/{docId}")
    public ResponseEntity<?> delete(@PathVariable Long appuntamentoId, @PathVariable Long docId, Authentication authentication) throws IOException {
        AppuntamentoDocumento doc = documentoRepository.findById(docId).orElse(null);
        if (doc == null || !doc.getAppuntamento().getId().equals(appuntamentoId)) return ResponseEntity.notFound().build();
        if (!canDelete(authentication, doc)) return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Accesso negato");
        Path path = storageDir.resolve(doc.getFileName());
        try { Files.deleteIfExists(path); } catch (Exception ignored) {}
        documentoRepository.delete(doc);
        return ResponseEntity.ok().build();
    }

    private boolean canAccess(Authentication authentication, Appuntamento app) {
        if (authentication == null || !(authentication.getPrincipal() instanceof CustomUserDetails)) return false;
        CustomUserDetails user = (CustomUserDetails) authentication.getPrincipal();
        Long uid = user.getUserId();
        Long medicoId = user.getActingMedicoId() != null ? user.getActingMedicoId() : user.getMedicoId();
        try {
            Long appMedicoId = app.getMedico() != null ? app.getMedico().getId() : null;
            Long appPazienteUserId = app.getPaziente() != null ? app.getPaziente().getId() : null;
            // Accesso consentito se: medico assegnato (o collaboratore che agisce come tale) oppure paziente proprietario
            if (medicoId != null && appMedicoId != null && medicoId.equals(appMedicoId)) return true;
            if (uid != null && appPazienteUserId != null && uid.equals(appPazienteUserId)) return true;
        } catch (Exception ignored) {}
        return false;
    }

    private boolean canDelete(Authentication authentication, AppuntamentoDocumento doc) {
        if (authentication == null || !(authentication.getPrincipal() instanceof CustomUserDetails)) return false;
        CustomUserDetails user = (CustomUserDetails) authentication.getPrincipal();
        boolean isMedico = user.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_MEDICO"));
        // Medico assegnato può sempre cancellare; il paziente può cancellare solo se è il proprietario originario dell'upload
        if (isMedico && canAccess(authentication, doc.getAppuntamento())) return true;
        String role = doc.getUploaderRole();
        if ("PAZIENTE".equals(role) && canAccess(authentication, doc.getAppuntamento())) return true;
        return false;
    }
}
