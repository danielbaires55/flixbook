package com.flixbook.flixbook_backend.service;

import com.flixbook.flixbook_backend.model.BloccoOrario;
import com.flixbook.flixbook_backend.model.Medico;
import com.flixbook.flixbook_backend.repository.AppuntamentoRepository;
import com.flixbook.flixbook_backend.repository.BloccoOrarioRepository;
import com.flixbook.flixbook_backend.repository.MedicoRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;
import java.util.Objects;

@Service
@Transactional
public class BloccoOrarioService {

    @Autowired
    private BloccoOrarioRepository bloccoOrarioRepository;

    @Autowired
    private MedicoRepository medicoRepository;

    @Autowired
    private AppuntamentoRepository appuntamentoRepository;

    /**
     * Crea un nuovo blocco orario per un medico.
     */
    public BloccoOrario createBloccoOrario(Long medicoId, LocalDate data, String oraInizio, String oraFine) {
        Medico medico = medicoRepository.findById(medicoId)
                .orElseThrow(() -> new IllegalArgumentException("Medico non trovato con ID: " + medicoId));

        // Aggiungi qui eventuali controlli, es. per non creare blocchi sovrapposti.

        BloccoOrario blocco = new BloccoOrario();
        blocco.setMedico(medico);
        blocco.setData(data);
        blocco.setOraInizio(LocalTime.parse(oraInizio));
        blocco.setOraFine(LocalTime.parse(oraFine));

        return bloccoOrarioRepository.save(blocco);
    }

    /**
     * Trova tutti i blocchi orario futuri per un dato medico.
     */
    public List<BloccoOrario> findBlocchiFuturiByMedicoId(Long medicoId) {
        return bloccoOrarioRepository.findByMedicoIdAndDataGreaterThanEqualOrderByDataAsc(medicoId, LocalDate.now());
    }

    /**
     * Cancella un blocco orario, dopo aver verificato i permessi e che non ci siano appuntamenti.
     */
    public void deleteBloccoOrario(Long bloccoId, Long medicoIdDaToken) {
        BloccoOrario blocco = bloccoOrarioRepository.findById(bloccoId)
                .orElseThrow(() -> new IllegalArgumentException("Blocco orario non trovato."));

        // 1. Controllo di sicurezza: l'utente può cancellare solo i propri blocchi.
        if (!Objects.equals(blocco.getMedico().getId(), medicoIdDaToken)) {
            throw new SecurityException("Non sei autorizzato a cancellare questo blocco orario.");
        }

        // 2. Controllo di business: non si può cancellare un blocco se contiene già appuntamenti.
        LocalTime oraInizio = blocco.getOraInizio();
        LocalTime oraFine = blocco.getOraFine();
        LocalDateTime inizioBlocco = LocalDateTime.of(blocco.getData(), oraInizio);
        LocalDateTime fineBlocco = LocalDateTime.of(blocco.getData(), oraFine);
        long appuntamentiEsistenti = appuntamentoRepository.countAppuntamentiInBlocco(medicoIdDaToken, inizioBlocco, fineBlocco);
        
        if (appuntamentiEsistenti > 0) {
            throw new IllegalStateException("Impossibile cancellare un blocco orario che contiene già appuntamenti prenotati.");
        }

        bloccoOrarioRepository.delete(blocco);
    }
}