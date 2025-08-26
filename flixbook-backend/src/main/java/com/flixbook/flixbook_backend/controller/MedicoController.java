// MedicoController.java
package com.flixbook.flixbook_backend.controller;

import com.flixbook.flixbook_backend.config.CustomUserDetails; // <-- 1. IMPORTA CUSTOMUSERDETAILS
import com.flixbook.flixbook_backend.model.Medico;
import com.flixbook.flixbook_backend.service.MedicoService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/medici")
public class MedicoController {

    @Autowired
    private MedicoService medicoService;

    @Autowired
    private org.springframework.security.core.userdetails.UserDetailsService userDetailsService;

    // =======================================================================
    // == METODO /profile AGGIORNATO E CORRETTO                           ==
    // =======================================================================
    @GetMapping("/profile")
    public ResponseEntity<Medico> getMedicoProfile(Authentication authentication) {
        // 2. Otteniamo il nostro oggetto CustomUserDetails dal contesto di sicurezza
        Object principal = authentication.getPrincipal();
        if (!(principal instanceof CustomUserDetails)) {
            // Questo non dovrebbe mai accadere se il login funziona, ma è un controllo sicuro
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        
        CustomUserDetails userDetails = (CustomUserDetails) principal;

        // 3. Prendiamo il medicoId, che è corretto sia per il medico che per il collaboratore
        Long medicoId = userDetails.getMedicoId();
        if (medicoId == null) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).build();
        }

        // 4. Usiamo l'ID per trovare il profilo del medico corretto
        Optional<Medico> medicoOptional = medicoService.findMedicoById(medicoId);

        // Restituiamo il medico se trovato, altrimenti 404
        return medicoOptional
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }
    // =======================================================================

    @GetMapping("/byPrestazione/{prestazioneId}")
    public ResponseEntity<List<Medico>> getMediciByPrestazione(@PathVariable Long prestazioneId) {
        List<Medico> medici = medicoService.findMediciByPrestazioneId(prestazioneId);
        return ResponseEntity.ok(medici);
    }

    @GetMapping
    public List<Medico> getAllMedici() {
        return medicoService.findAll();
    }
    
   @PutMapping("/profilo")
    public ResponseEntity<Medico> updateProfilo(@RequestBody Map<String, String> datiProfilo, Authentication authentication) {
        CustomUserDetails userDetails = (CustomUserDetails) userDetailsService.loadUserByUsername(authentication.getName());
        Long medicoId = userDetails.getMedicoId();
        
        Medico medicoAggiornato = medicoService.updateProfilo(medicoId, datiProfilo);
        return ResponseEntity.ok(medicoAggiornato);
    }

    @PutMapping("/profilo/password")
    public ResponseEntity<?> changePassword(@RequestBody Map<String, String> passwordData, Authentication authentication) {
        try {
            CustomUserDetails userDetails = (CustomUserDetails) userDetailsService.loadUserByUsername(authentication.getName());
            Long medicoId = userDetails.getMedicoId();
            
            medicoService.changePassword(medicoId, passwordData);
            return ResponseEntity.ok("Password aggiornata con successo.");
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PostMapping("/profilo/immagine")
    public ResponseEntity<Medico> updateImmagineProfilo(@RequestParam("file") MultipartFile file, Authentication authentication) {
        CustomUserDetails userDetails = (CustomUserDetails) userDetailsService.loadUserByUsername(authentication.getName());
        Long medicoId = userDetails.getMedicoId();

        Medico medicoAggiornato = medicoService.updateImmagineProfilo(medicoId, file);
        return ResponseEntity.ok(medicoAggiornato);
    }
}