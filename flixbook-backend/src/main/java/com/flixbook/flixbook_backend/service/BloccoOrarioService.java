package com.flixbook.flixbook_backend.service;

import com.flixbook.flixbook_backend.model.BloccoOrario;
import com.flixbook.flixbook_backend.model.Appuntamento;
import com.flixbook.flixbook_backend.model.StatoAppuntamento;
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
     * Crea un nuovo blocco orario per un medico, persistendo anche i metadati di creazione.
     */
    public BloccoOrario createBloccoOrario(Long medicoId,
                                           LocalDate data,
                                           String oraInizio,
                                           String oraFine,
                                           String createdByType,
                                           Long createdById,
                                           String createdByName) {
        Medico medico = medicoRepository.findById(medicoId)
                .orElseThrow(() -> new IllegalArgumentException("Medico non trovato con ID: " + medicoId));

        // Evita la creazione di blocchi sovrapposti nello stesso giorno per lo stesso medico
        List<BloccoOrario> esistenti = bloccoOrarioRepository.findByMedicoIdAndData(medicoId, data);
        LocalTime newStart = LocalTime.parse(oraInizio);
        LocalTime newEnd = LocalTime.parse(oraFine);
        boolean overlaps = esistenti.stream().anyMatch(b -> {
            LocalTime existingStart = b.getOraInizio();
            LocalTime existingEnd = b.getOraFine();
            // intervalli [start, end) si sovrappongono se start < otherEnd && end > otherStart
            return newStart.isBefore(existingEnd) && newEnd.isAfter(existingStart);
        });
        if (overlaps) {
            throw new IllegalStateException("Esiste già un blocco orario che si sovrappone a questo intervallo.");
        }

        BloccoOrario blocco = new BloccoOrario();
        blocco.setMedico(medico);
        blocco.setData(data);
    blocco.setOraInizio(newStart);
    blocco.setOraFine(newEnd);
        // Attribuzione di creazione
        blocco.setCreatedByType(createdByType);
        blocco.setCreatedById(createdById);
        blocco.setCreatedByName(createdByName);
        if (blocco.getCreatedAt() == null) blocco.setCreatedAt(LocalDateTime.now());

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
    List<BloccoOrario> blocchi = bloccoOrarioRepository
        .findByMedicoIdAndDataGreaterThanEqualOrderByDataAsc(medicoId, LocalDate.now());

    // Regola di visibilità: mostra solo i blocchi che hanno ancora utilità operativa
    // - Almeno uno slot DISPONIBILE nel futuro; oppure
    // - Almeno un appuntamento ATTIVO (CONFERMATO) nel range del blocco
    LocalDateTime now = LocalDateTime.now();
    return blocchi.stream().filter(blocco -> {
        LocalDateTime inizioBlocco = LocalDateTime.of(blocco.getData(), blocco.getOraInizio());
        LocalDateTime fineBlocco = LocalDateTime.of(blocco.getData(), blocco.getOraFine());

        // 1) Se il blocco contiene appuntamenti confermati futuri o in corso, mantienilo visibile
        long appuntamentiAttivi = appuntamentoRepository.countAppuntamentiInBlocco(
            medicoId, inizioBlocco, fineBlocco);
        if (appuntamentiAttivi > 0) return true;

        // 2) Se esiste almeno uno slot DISPONIBILE con start nel futuro, mantieni visibile
        List<Slot> slots = slotRepository.findByBloccoOrarioIdOrderByDataEOraInizio(blocco.getId());
        if (slots.isEmpty()) {
        // Fallback: per blocchi legacy senza slot persistiti, se il blocco non è ancora finito
        // lo consideriamo ancora utile (gli slot verranno generati on-demand).
        return fineBlocco.isAfter(now);
        }
        boolean haSlotFuturiDisponibili = slots.stream()
            .anyMatch(s -> s.getStato() == SlotStato.DISPONIBILE && s.getDataEOraInizio().isAfter(now));
        return haSlotFuturiDisponibili;
    }).toList();
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
        long appuntamentiAttivi = appuntamentoRepository.countAppuntamentiInBlocco(medicoIdDaToken, inizioBlocco, fineBlocco);
        if (appuntamentiAttivi > 0) {
            // Esistono appuntamenti CONFERMATI nel range: non si può cancellare
            throw new IllegalStateException("Impossibile cancellare un blocco con appuntamenti attivi. Annulla o sposta prima gli appuntamenti confermati.");
        }

        // Se ci sono appuntamenti NON attivi (ANNULLATO o COMPLETATO) che riferiscono agli slot del blocco,
        // stacchiamo il riferimento allo slot per evitare vincoli al delete degli slot
        List<Slot> slotsDelBloccoAll = slotRepository.findByBloccoOrarioIdOrderByDataEOraInizio(bloccoId);
        if (!slotsDelBloccoAll.isEmpty()) {
            List<Long> slotIds = slotsDelBloccoAll.stream().map(Slot::getId).toList();
            List<Appuntamento> collegati = appuntamentoRepository.findBySlot_IdIn(slotIds);
            if (!collegati.isEmpty()) {
                for (Appuntamento a : collegati) {
                    if (a.getStato() != StatoAppuntamento.CONFERMATO) {
                        a.setSlot(null);
                    } else {
                        // Safety: se arriviamo qui con CONFERMATO, blocca comunque
                        throw new IllegalStateException("Blocco non cancellabile: trovato appuntamento attivo collegato.");
                    }
                }
                appuntamentoRepository.saveAll(collegati);
            }
        }

        // Se passati i controlli, rimuovi anche eventuali slot generati per questo blocco
        List<Slot> slotsDelBlocco = slotRepository.findByBloccoOrarioIdOrderByDataEOraInizio(bloccoId);
        if (!slotsDelBlocco.isEmpty()) {
            slotRepository.deleteAll(slotsDelBlocco);
        }
        bloccoOrarioRepository.delete(blocco);
    }
}