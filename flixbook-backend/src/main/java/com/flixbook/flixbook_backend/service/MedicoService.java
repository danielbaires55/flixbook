package com.flixbook.flixbook_backend.service;

import com.flixbook.flixbook_backend.model.Medico;
import com.flixbook.flixbook_backend.repository.MedicoRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Service
@Transactional
public class MedicoService {

    // Definisce il percorso dove verranno salvate le immagini del profilo
    private final Path fileStorageLocation = Paths.get("src/main/resources/static/prof_img");

    @Autowired
    private MedicoRepository medicoRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    /**
     * Trova un medico tramite la sua email.
     */
    public Optional<Medico> findMedicoByEmail(String email) {
        return medicoRepository.findByEmail(email);
    }

    /**
     * Salva o aggiorna un medico nel database.
     */
    public Medico save(Medico medico) {
        return medicoRepository.save(medico);
    }

    /**
     * Restituisce tutti i medici presenti nel database.
     */
    public List<Medico> findAll() {
        return medicoRepository.findAll();
    }

    /**
     * Restituisce tutti i medici associati a una prestazione specifica.
     */
    public List<Medico> findMediciByPrestazioneId(Long prestazioneId) {
        return medicoRepository.findMediciByPrestazioneId(prestazioneId);
    }

    /**
     * Trova un medico usando il suo ID.
     */
    public Optional<Medico> findMedicoById(Long id) {
        return medicoRepository.findById(id);
    }

    /**
     * Aggiorna i dati del profilo di un medico (nome, cognome, telefono, biografia).
     */
    public Medico updateProfilo(Long medicoId, Map<String, String> datiProfilo) {
        Medico medico = medicoRepository.findById(medicoId)
                .orElseThrow(() -> new RuntimeException("Medico non trovato con ID: " + medicoId));
        
        medico.setNome(datiProfilo.get("nome"));
        medico.setCognome(datiProfilo.get("cognome"));
        medico.setTelefono(datiProfilo.get("telefono"));
        medico.setBiografia(datiProfilo.get("biografia"));
        
        return medicoRepository.save(medico);
    }

    /**
     * Cambia la password di un medico dopo aver verificato quella vecchia.
     */
    public void changePassword(Long medicoId, Map<String, String> passwordData) {
        Medico medico = medicoRepository.findById(medicoId)
                .orElseThrow(() -> new RuntimeException("Medico non trovato con ID: " + medicoId));

        String vecchiaPassword = passwordData.get("vecchiaPassword");
        String nuovaPassword = passwordData.get("nuovaPassword");

        if (vecchiaPassword == null || nuovaPassword == null || !passwordEncoder.matches(vecchiaPassword, medico.getPasswordHash())) {
            throw new BadCredentialsException("La vecchia password non è corretta.");
        }

        medico.setPasswordHash(passwordEncoder.encode(nuovaPassword));
        medicoRepository.save(medico);
    }

    /**
     * Aggiorna l'immagine del profilo di un medico, salvandola nel file system.
     */
    public Medico updateImmagineProfilo(Long medicoId, MultipartFile file) {
        Medico medico = medicoRepository.findById(medicoId)
                .orElseThrow(() -> new RuntimeException("Medico non trovato con ID: " + medicoId));
        try {
            // Assicura che la cartella di destinazione esista
            Files.createDirectories(this.fileStorageLocation);

            String fileName = "medico_" + medicoId + "_" + System.currentTimeMillis() + ".png";
            Path targetLocation = this.fileStorageLocation.resolve(fileName);
            Files.copy(file.getInputStream(), targetLocation, StandardCopyOption.REPLACE_EXISTING);
            
            String publicPath = "/prof_img/" + fileName;
            medico.setImgProfUrl(publicPath);
            return medicoRepository.save(medico);
            
        } catch (Exception ex) {
            throw new RuntimeException("Impossibile salvare il file. Riprova.", ex);
        }
    }
}