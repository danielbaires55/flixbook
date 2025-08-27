package com.flixbook.flixbook_backend.service;

import com.flixbook.flixbook_backend.model.Appuntamento;
import com.flixbook.flixbook_backend.model.BloccoOrario;
import com.flixbook.flixbook_backend.model.Medico;
import com.flixbook.flixbook_backend.model.Prestazione;
import com.flixbook.flixbook_backend.model.StatoAppuntamento;
import com.flixbook.flixbook_backend.model.Slot;
import com.flixbook.flixbook_backend.model.SlotStato;
import com.flixbook.flixbook_backend.repository.AppuntamentoRepository;
import com.flixbook.flixbook_backend.repository.BloccoOrarioRepository;
import com.flixbook.flixbook_backend.repository.MedicoRepository;
import com.flixbook.flixbook_backend.repository.PrestazioneRepository;
import com.flixbook.flixbook_backend.repository.SlotRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@Transactional(readOnly = true)
public class SlotService {

    @Autowired
    private BloccoOrarioRepository bloccoOrarioRepository;
    @Autowired
    private AppuntamentoRepository appuntamentoRepository;
    @Autowired
    private PrestazioneRepository prestazioneRepository;
    @Autowired
    private MedicoRepository medicoRepository;
    @Autowired
    private SlotRepository slotRepository;
    @Autowired
    private AppuntamentoRepository appuntamentoRepo;

    @Transactional
    public long cleanupExpiredSlots() {
    // Elimina solo slot DISPONIBILE con data_ora_fine < now che non sono referenziati da appuntamenti
    return slotRepository.deleteUnreferencedByStatoAndDataEOraFineBefore(SlotStato.DISPONIBILE, LocalDateTime.now());
    }

    public List<LocalTime> findAvailableSlots(Long medicoId, Long prestazioneId, LocalDate data) {
        Prestazione prestazione = prestazioneRepository.findById(prestazioneId)
                .orElseThrow(() -> new IllegalArgumentException("Prestazione non trovata."));
        int durata = prestazione.getDurataMinuti();

        // 1) Se esistono Slot persistiti per quel medico e giorno, usali come fonte di verità
        List<Slot> slotsDelGiorno = slotRepository.findByMedicoIdAndData(medicoId, data);
        LocalDateTime inizioGiornata = data.atStartOfDay();
        LocalDateTime fineGiornata = data.atTime(LocalTime.MAX);
        List<Appuntamento> appuntamentiEsistenti = appuntamentoRepository
                .findByMedicoIdAndDataEOraInizioBetween(medicoId, inizioGiornata, fineGiornata);

        if (!slotsDelGiorno.isEmpty()) {
            List<LocalTime> slotDisponibili = new ArrayList<>();
            boolean isOggi = data.equals(LocalDate.now());
            LocalTime oraAdesso = LocalTime.now();
            for (Slot s : slotsDelGiorno) {
                if (s.getStato() != SlotStato.DISPONIBILE) continue; // rispetta DISABILITATO
                // Escludi slot nel passato (per il giorno corrente)
                if (isOggi && s.getDataEOraInizio().toLocalTime().isBefore(oraAdesso)) continue;
                // Escludi slot che si sovrappongono ad appuntamenti confermati
                boolean occupato = false;
                for (Appuntamento app : appuntamentiEsistenti) {
                    if (app.getStato() != StatoAppuntamento.CONFERMATO) continue;
                    if (!s.getDataEOraInizio().isBefore(app.getDataEOraFine()) ||
                        !s.getDataEOraFine().isAfter(app.getDataEOraInizio())) {
                        continue;
                    }
                    occupato = true;
                    break;
                }
                if (!occupato) {
                    slotDisponibili.add(s.getDataEOraInizio().toLocalTime());
                }
            }
            slotDisponibili.sort(LocalTime::compareTo);
            return slotDisponibili;
        }

        // 2) Fallback legacy: non esistono slot persistiti, calcola dagli orari di blocco
        List<BloccoOrario> blocchiDiLavoro = bloccoOrarioRepository.findByMedicoIdAndData(medicoId, data);
        if (blocchiDiLavoro.isEmpty()) {
            return new ArrayList<>();
        }

        blocchiDiLavoro.sort(Comparator.comparing(BloccoOrario::getOraInizio));
        List<LocalTime> slotDisponibili = new ArrayList<>();
        for (BloccoOrario blocco : blocchiDiLavoro) {
            LocalTime potenzialeSlot = blocco.getOraInizio();
            LocalTime fineBlocco = blocco.getOraFine();
            while (!potenzialeSlot.plusMinutes(durata).isAfter(fineBlocco)) {
                // Escludi slot nel passato (per il giorno corrente)
                if (data.equals(LocalDate.now()) && potenzialeSlot.isBefore(LocalTime.now())) {
                    potenzialeSlot = potenzialeSlot.plusMinutes(durata);
                    continue;
                }
                LocalTime finePotenzialeSlot = potenzialeSlot.plusMinutes(durata);
                boolean isOccupato = false;
                for (Appuntamento app : appuntamentiEsistenti) {
                    if (app.getStato() != StatoAppuntamento.CONFERMATO) continue;
                    LocalTime inizioApp = app.getDataEOraInizio().toLocalTime();
                    LocalTime fineApp = app.getDataEOraFine().toLocalTime();
                    if (potenzialeSlot.isBefore(fineApp) && finePotenzialeSlot.isAfter(inizioApp)) {
                        isOccupato = true;
                        break;
                    }
                }
                if (!isOccupato) slotDisponibili.add(potenzialeSlot);
                potenzialeSlot = potenzialeSlot.plusMinutes(durata);
            }
        }
        slotDisponibili.sort(LocalTime::compareTo);
        return slotDisponibili;
    }

    public List<Map<String, Object>> findProssimiSlotDisponibili(Long prestazioneId, Long medicoId, Integer limit,
                                                                 LocalDate fromDate, LocalDate toDate,
                                                                 Integer fromHour, Integer toHour) {
        List<Map<String, Object>> tuttiSlot = new ArrayList<>();
        LocalDate oggi = LocalDate.now();
        final int NUMERO_SLOT_DA_RESTITUIRE = (limit != null && limit > 0) ? limit : 15;
        final int GIORNI_MASSIMI_DI_RICERCA = 30; 

        // Normalize range
        LocalDate startDate = (fromDate != null) ? fromDate : oggi;
        LocalDate endDate = (toDate != null && !toDate.isBefore(startDate)) ? toDate : startDate.plusDays(GIORNI_MASSIMI_DI_RICERCA);
        // Clamp endDate to max horizon
        if (endDate.isAfter(oggi.plusDays(GIORNI_MASSIMI_DI_RICERCA))) {
            endDate = oggi.plusDays(GIORNI_MASSIMI_DI_RICERCA);
        }

        List<Medico> mediciDaControllare;
        if (medicoId != null) {
            mediciDaControllare = Collections.singletonList(medicoRepository.findById(medicoId)
                    .orElseThrow(() -> new IllegalArgumentException("Medico non trovato.")));
        } else {
            mediciDaControllare = medicoRepository.findMediciByPrestazioneId(prestazioneId);
        }

        // Raccogli TUTTI gli slot disponibili
    outer:
    for (LocalDate giornoCorrente = startDate; !giornoCorrente.isAfter(endDate); giornoCorrente = giornoCorrente.plusDays(1)) {
            for (Medico medico : mediciDaControllare) {
                if (tuttiSlot.size() >= NUMERO_SLOT_DA_RESTITUIRE) break outer;
                List<LocalTime> slotDelGiorno = findAvailableSlots(medico.getId(), prestazioneId, giornoCorrente);
                
                for (LocalTime oraInizio : slotDelGiorno) {
                    if (tuttiSlot.size() >= NUMERO_SLOT_DA_RESTITUIRE) break outer;
            // Apply hour window if provided
            if (fromHour != null && oraInizio.getHour() < fromHour) continue;
            if (toHour != null && oraInizio.getHour() > toHour) continue;
                    Map<String, Object> slotMap = new HashMap<>();
                    slotMap.put("data", giornoCorrente);
                    slotMap.put("oraInizio", oraInizio);
                    slotMap.put("medicoId", medico.getId());
                    slotMap.put("medicoNome", medico.getNome());
                    slotMap.put("medicoCognome", medico.getCognome());
                    tuttiSlot.add(slotMap);
                }
            }
        }

        // ORDINA TUTTI gli slot raccolti cronologicamente
        tuttiSlot.sort(Comparator
            .comparing((Map<String, Object> slot) -> (LocalDate) slot.get("data"))
            .thenComparing(slot -> (LocalTime) slot.get("oraInizio")));

        // Restituisci solo i primi 5
        return tuttiSlot.size() <= NUMERO_SLOT_DA_RESTITUIRE 
            ? tuttiSlot 
            : tuttiSlot.subList(0, NUMERO_SLOT_DA_RESTITUIRE);
    }

    public List<Map<String, Object>> findSlotsForDay(Long prestazioneId, Long medicoId, LocalDate data) {
        List<Map<String, Object>> slotTrovati = new ArrayList<>();
        
        List<Medico> mediciDaControllare;
        if (medicoId != null) {
            mediciDaControllare = Collections.singletonList(medicoRepository.findById(medicoId)
                    .orElseThrow(() -> new IllegalArgumentException("Medico non trovato.")));
        } else {
            mediciDaControllare = medicoRepository.findMediciByPrestazioneId(prestazioneId);
        }

        for (Medico medico : mediciDaControllare) {
            List<LocalTime> slotDelGiorno = findAvailableSlots(medico.getId(), prestazioneId, data);
            for (LocalTime oraInizio : slotDelGiorno) {
                Map<String, Object> slotMap = new HashMap<>();
                slotMap.put("data", data);
                slotMap.put("oraInizio", oraInizio);
                slotMap.put("medicoId", medico.getId());
                slotMap.put("medicoNome", medico.getNome());
                slotMap.put("medicoCognome", medico.getCognome());
                slotTrovati.add(slotMap);
            }
        }
        
        // Ordina gli slot trovati per ora di inizio
        slotTrovati.sort(Comparator.comparing(slot -> (LocalTime) slot.get("oraInizio")));
        
        return slotTrovati;
    }

    // ================== ADMIN (MEDICO) SLOT MANAGEMENT ==================
    @Transactional
    public List<Slot> listSlotsByBlocco(Long bloccoId, Long medicoIdOwner) {
        BloccoOrario blocco = bloccoOrarioRepository.findById(bloccoId)
                .orElseThrow(() -> new IllegalArgumentException("Blocco orario non trovato."));
        if (!blocco.getMedico().getId().equals(medicoIdOwner)) {
            throw new SecurityException("Non autorizzato ad accedere a questi slot.");
        }
        List<Slot> esistenti = slotRepository.findByBloccoOrarioIdOrderByDataEOraInizio(bloccoId);
        if (!esistenti.isEmpty()) return esistenti;

        // Se non esistono ancora (vecchi blocchi), generali ora
        List<Slot> creati = new ArrayList<>();
        LocalDateTime inizio = LocalDateTime.of(blocco.getData(), blocco.getOraInizio());
        LocalDateTime fine = LocalDateTime.of(blocco.getData(), blocco.getOraFine());
        LocalDateTime cursor = inizio;
        while (!cursor.plusMinutes(30).isAfter(fine)) {
            if (!slotRepository.existsByMedico_IdAndDataEOraInizio(medicoIdOwner, cursor)) {
                Slot s = new Slot();
                s.setMedico(blocco.getMedico());
                s.setBloccoOrario(blocco);
                s.setDataEOraInizio(cursor);
                s.setDataEOraFine(cursor.plusMinutes(30));
                s.setStato(com.flixbook.flixbook_backend.model.SlotStato.DISPONIBILE);
                creati.add(slotRepository.save(s));
            }
            cursor = cursor.plusMinutes(30);
        }
        return creati;
    }

    @Transactional
    public Slot toggleSlot(Long slotId, Long medicoIdOwner) {
        Slot slot = slotRepository.findById(slotId)
                .orElseThrow(() -> new IllegalArgumentException("Slot non trovato."));
        if (!slot.getMedico().getId().equals(medicoIdOwner)) {
            throw new SecurityException("Non autorizzato a modificare questo slot.");
        }
        // Se lo slot è occupato (c'è un appuntamento confermato che sovrappone), vieta il toggle a DISPONIBILE
        long occupati = appuntamentoRepo.countAppuntamentiInBlocco(
                medicoIdOwner,
                slot.getDataEOraInizio(),
                slot.getDataEOraFine()
        );
        if (occupati > 0) {
            // se è occupato, può solo rimanere DISPONIBILE (non disabilitare per evitare inconsistenza)
            throw new IllegalStateException("Impossibile modificare uno slot già prenotato.");
        }
        slot.setStato(slot.getStato() == SlotStato.DISPONIBILE ? SlotStato.DISABILITATO : SlotStato.DISPONIBILE);
        return slotRepository.save(slot);
    }

    @Transactional
    public void deleteSlot(Long slotId, Long medicoIdOwner) {
        Slot slot = slotRepository.findById(slotId)
                .orElseThrow(() -> new IllegalArgumentException("Slot non trovato."));
        if (!slot.getMedico().getId().equals(medicoIdOwner)) {
            throw new SecurityException("Non autorizzato a cancellare questo slot.");
        }
        long occupati = appuntamentoRepo.countAppuntamentiInBlocco(
                medicoIdOwner,
                slot.getDataEOraInizio(),
                slot.getDataEOraFine()
        );
        if (occupati > 0) {
            throw new IllegalStateException("Impossibile cancellare uno slot prenotato.");
        }
        slotRepository.delete(slot);
    }
}