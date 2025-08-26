package com.flixbook.flixbook_backend.service;

import com.flixbook.flixbook_backend.model.BloccoOrario;
import com.flixbook.flixbook_backend.model.Medico;
import com.flixbook.flixbook_backend.repository.AppuntamentoRepository;
import com.flixbook.flixbook_backend.repository.SlotRepository;
import com.flixbook.flixbook_backend.model.Slot;
import com.flixbook.flixbook_backend.model.SlotStato;
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

    @Autowired
    private SlotRepository slotRepository;

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

        BloccoOrario salvato = bloccoOrarioRepository.save(blocco);

        // Genera gli slot da 30 minuti nel blocco
        LocalDateTime inizio = LocalDateTime.of(data, salvato.getOraInizio());
        LocalDateTime fine = LocalDateTime.of(data, salvato.getOraFine());
        LocalDateTime cursor = inizio;
        while (!cursor.plusMinutes(30).isAfter(fine)) {
            // evita duplicati su riavvii o sovrapposizioni
            if (!slotRepository.existsByMedico_IdAndDataEOraInizio(medicoId, cursor)) {
                Slot s = new Slot();
                s.setMedico(medico);
                s.setBloccoOrario(salvato);
                s.setDataEOraInizio(cursor);
                s.setDataEOraFine(cursor.plusMinutes(30));
                s.setStato(SlotStato.DISPONIBILE);
                slotRepository.save(s);
            }
            cursor = cursor.plusMinutes(30);
        }

        return salvato;
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

        // Se passati i controlli, rimuovi anche eventuali slot generati per questo blocco
        List<Slot> slotsDelBlocco = slotRepository.findByBloccoOrarioIdOrderByDataEOraInizio(bloccoId);
        if (!slotsDelBlocco.isEmpty()) {
            slotRepository.deleteAll(slotsDelBlocco);
        }
        bloccoOrarioRepository.delete(blocco);
    }
}