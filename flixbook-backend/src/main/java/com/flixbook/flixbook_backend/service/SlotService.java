package com.flixbook.flixbook_backend.service;

import com.flixbook.flixbook_backend.model.Appuntamento;
import com.flixbook.flixbook_backend.model.BloccoOrario;
import com.flixbook.flixbook_backend.model.Medico;
import com.flixbook.flixbook_backend.model.Prestazione;
import com.flixbook.flixbook_backend.model.StatoAppuntamento;
import com.flixbook.flixbook_backend.repository.AppuntamentoRepository;
import com.flixbook.flixbook_backend.repository.BloccoOrarioRepository;
import com.flixbook.flixbook_backend.repository.MedicoRepository;
import com.flixbook.flixbook_backend.repository.PrestazioneRepository;
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

    public List<LocalTime> findAvailableSlots(Long medicoId, Long prestazioneId, LocalDate data) {
        Prestazione prestazione = prestazioneRepository.findById(prestazioneId)
                .orElseThrow(() -> new IllegalArgumentException("Prestazione non trovata."));
        int durata = prestazione.getDurataMinuti();

        List<BloccoOrario> blocchiDiLavoro = bloccoOrarioRepository.findByMedicoIdAndData(medicoId, data);
        if (blocchiDiLavoro.isEmpty()) {
            return new ArrayList<>();
        }

        // ORDINA I BLOCCHI PER ORA DI INIZIO
        blocchiDiLavoro.sort(Comparator.comparing(BloccoOrario::getOraInizio));

        LocalDateTime inizioGiornata = data.atStartOfDay();
        LocalDateTime fineGiornata = data.atTime(LocalTime.MAX);
        List<Appuntamento> appuntamentiEsistenti = appuntamentoRepository.findByMedicoIdAndDataEOraInizioBetween(medicoId, inizioGiornata, fineGiornata);

        List<LocalTime> slotDisponibili = new ArrayList<>();

        for (BloccoOrario blocco : blocchiDiLavoro) {
            LocalTime potenzialeSlot = blocco.getOraInizio();
            LocalTime fineBlocco = blocco.getOraFine();

            while (!potenzialeSlot.plusMinutes(durata).isAfter(fineBlocco)) {
                LocalTime finePotenzialeSlot = potenzialeSlot.plusMinutes(durata);
                boolean isOccupato = false;
                for (Appuntamento app : appuntamentiEsistenti) {
                    if (app.getStato() != StatoAppuntamento.CONFERMATO) {
                        continue;
                    }
                    LocalTime inizioApp = app.getDataEOraInizio().toLocalTime();
                    LocalTime fineApp = app.getDataEOraFine().toLocalTime();
                    if (potenzialeSlot.isBefore(fineApp) && finePotenzialeSlot.isAfter(inizioApp)) {
                        isOccupato = true;
                        break;
                    }
                }
                if (!isOccupato) {
                    slotDisponibili.add(potenzialeSlot);
                }
                potenzialeSlot = potenzialeSlot.plusMinutes(durata);
            }
        }
        
        // ORDINA GLI SLOT PRIMA DI RESTITUIRLI
        slotDisponibili.sort(LocalTime::compareTo);
        return slotDisponibili;
    }

    public List<Map<String, Object>> findProssimiSlotDisponibili(Long prestazioneId, Long medicoId) {
        System.out.println("=== DEBUG findProssimiSlotDisponibili ===");
        System.out.println("prestazioneId: " + prestazioneId + ", medicoId: " + medicoId);
        
        List<Map<String, Object>> tuttiSlot = new ArrayList<>();
        LocalDate oggi = LocalDate.now();
        final int NUMERO_SLOT_DA_RESTITUIRE = 5;
        final int GIORNI_MASSIMI_DI_RICERCA = 14; // Riduci per il debug

        List<Medico> mediciDaControllare;
        if (medicoId != null) {
            mediciDaControllare = Collections.singletonList(medicoRepository.findById(medicoId)
                    .orElseThrow(() -> new IllegalArgumentException("Medico non trovato.")));
        } else {
            mediciDaControllare = medicoRepository.findMediciByPrestazioneId(prestazioneId);
        }

        System.out.println("Medici da controllare: " + mediciDaControllare.size());

        // Raccogli TUTTI gli slot disponibili
        for (int i = 0; i < GIORNI_MASSIMI_DI_RICERCA; i++) {
            LocalDate giornoCorrente = oggi.plusDays(i);
            System.out.println("\n--- Controllo giorno: " + giornoCorrente + " ---");
            
            for (Medico medico : mediciDaControllare) {
                List<LocalTime> slotDelGiorno = findAvailableSlots(medico.getId(), prestazioneId, giornoCorrente);
                System.out.println("Dr. " + medico.getNome() + " " + medico.getCognome() + 
                                 " - Slot trovati: " + slotDelGiorno);
                
                for (LocalTime oraInizio : slotDelGiorno) {
                    Map<String, Object> slotMap = new HashMap<>();
                    slotMap.put("data", giornoCorrente);
                    slotMap.put("oraInizio", oraInizio);
                    slotMap.put("medicoId", medico.getId());
                    slotMap.put("medicoNome", medico.getNome());
                    slotMap.put("medicoCognome", medico.getCognome());
                    tuttiSlot.add(slotMap);
                    
                    System.out.println("Aggiunto slot: " + giornoCorrente + " " + oraInizio + 
                                     " Dr. " + medico.getNome() + " " + medico.getCognome());
                }
            }
        }

        System.out.println("\n=== PRIMA DELL'ORDINAMENTO ===");
        for (int i = 0; i < Math.min(tuttiSlot.size(), 10); i++) {
            Map<String, Object> slot = tuttiSlot.get(i);
            System.out.println("Slot " + i + ": " + slot.get("data") + " " + slot.get("oraInizio") + 
                             " Dr. " + slot.get("medicoNome") + " " + slot.get("medicoCognome"));
        }

        // ORDINA TUTTI gli slot raccolti cronologicamente
        tuttiSlot.sort(Comparator
            .comparing((Map<String, Object> slot) -> (LocalDate) slot.get("data"))
            .thenComparing(slot -> (LocalTime) slot.get("oraInizio")));

        System.out.println("\n=== DOPO L'ORDINAMENTO ===");
        for (int i = 0; i < Math.min(tuttiSlot.size(), 10); i++) {
            Map<String, Object> slot = tuttiSlot.get(i);
            System.out.println("Slot " + i + ": " + slot.get("data") + " " + slot.get("oraInizio") + 
                             " Dr. " + slot.get("medicoNome") + " " + slot.get("medicoCognome"));
        }

        // Restituisci solo i primi 5
        List<Map<String, Object>> risultato = tuttiSlot.size() <= NUMERO_SLOT_DA_RESTITUIRE 
            ? tuttiSlot 
            : tuttiSlot.subList(0, NUMERO_SLOT_DA_RESTITUIRE);

        System.out.println("\n=== RISULTATO FINALE ===");
        for (int i = 0; i < risultato.size(); i++) {
            Map<String, Object> slot = risultato.get(i);
            System.out.println("Risultato " + i + ": " + slot.get("data") + " " + slot.get("oraInizio") + 
                             " Dr. " + slot.get("medicoNome") + " " + slot.get("medicoCognome"));
        }

        return risultato;
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
}