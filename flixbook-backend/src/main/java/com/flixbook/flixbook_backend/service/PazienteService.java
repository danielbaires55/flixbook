package com.flixbook.flixbook_backend.service;

import com.flixbook.flixbook_backend.model.Paziente;
import com.flixbook.flixbook_backend.repository.PazienteRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Map;
import java.util.Optional;

@Service
@Transactional
public class PazienteService {

    @Autowired
    private PazienteRepository pazienteRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    public Paziente registerPaziente(Paziente paziente) {
        // Verifica se l'email esiste già
        if (pazienteRepository.existsByEmail(paziente.getEmail())) {
            throw new IllegalArgumentException("L'email è già in uso.");
        }

        // Cripta la password prima di salvare l'entità
        paziente.setPasswordHash(passwordEncoder.encode(paziente.getPasswordHash()));
        paziente.setDataRegistrazione(LocalDateTime.now());

        // Salva il paziente nel database
        return pazienteRepository.save(paziente);
    }
    
    public Optional<Paziente> findPazienteByEmail(String email) {
        return pazienteRepository.findByEmail(email);
    }

    /**
     * Aggiorna i dati del profilo di un paziente usando una Map.
     */
    public Paziente updateProfilo(Long pazienteId, Map<String, Object> datiProfilo) {
        Paziente paziente = pazienteRepository.findById(pazienteId)
                .orElseThrow(() -> new RuntimeException("Paziente non trovato"));
        
        paziente.setNome((String) datiProfilo.get("nome"));
        paziente.setCognome((String) datiProfilo.get("cognome"));
        paziente.setTelefono((String) datiProfilo.get("telefono"));
        // Il campo data arriva come String dal JSON, quindi va convertito
        if (datiProfilo.get("dataNascita") != null && !datiProfilo.get("dataNascita").toString().isEmpty()) {
             paziente.setDataNascita(LocalDate.parse(datiProfilo.get("dataNascita").toString()));
        }
        paziente.setIndirizzo((String) datiProfilo.get("indirizzo"));
        paziente.setCitta((String) datiProfilo.get("citta"));
        paziente.setProvincia((String) datiProfilo.get("provincia"));
        paziente.setCap((String) datiProfilo.get("cap"));
        if (datiProfilo.containsKey("codiceFiscale")) {
            Object cf = datiProfilo.get("codiceFiscale");
            paziente.setCodiceFiscale(cf != null ? cf.toString() : null);
        }
        
        return pazienteRepository.save(paziente);
    }

    /**
     * Cambia la password di un paziente usando una Map.
     */
    public void changePassword(Long pazienteId, Map<String, String> passwordData) {
        Paziente paziente = pazienteRepository.findById(pazienteId)
                .orElseThrow(() -> new RuntimeException("Paziente non trovato"));

        String vecchiaPassword = passwordData.get("vecchiaPassword");
        String nuovaPassword = passwordData.get("nuovaPassword");

        if (vecchiaPassword == null || nuovaPassword == null || !passwordEncoder.matches(vecchiaPassword, paziente.getPasswordHash())) {
            throw new BadCredentialsException("La vecchia password non è corretta.");
        }

        paziente.setPasswordHash(passwordEncoder.encode(nuovaPassword));
        pazienteRepository.save(paziente);
    }
}