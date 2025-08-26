package com.flixbook.flixbook_backend.service;

import com.flixbook.flixbook_backend.model.Appuntamento;
import com.flixbook.flixbook_backend.model.BloccoOrario;
import com.flixbook.flixbook_backend.model.Prestazione;
import com.flixbook.flixbook_backend.repository.AppuntamentoRepository;
import com.flixbook.flixbook_backend.repository.BloccoOrarioRepository;
import com.flixbook.flixbook_backend.repository.PrestazioneRepository;
import com.flixbook.flixbook_backend.model.StatoAppuntamento;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;

@Service
@Transactional(readOnly = true)
public class SlotService {

    @Autowired
    private BloccoOrarioRepository bloccoOrarioRepository;
    @Autowired
    private AppuntamentoRepository appuntamentoRepository;
    @Autowired
    private PrestazioneRepository prestazioneRepository;

    public List<LocalTime> findAvailableSlots(Long medicoId, Long prestazioneId, LocalDate data) {
        Prestazione prestazione = prestazioneRepository.findById(prestazioneId)
                .orElseThrow(() -> new IllegalArgumentException("Prestazione non trovata."));
        int durata = prestazione.getDurataMinuti();

        List<BloccoOrario> blocchiDiLavoro = bloccoOrarioRepository.findByMedicoIdAndData(medicoId, data);
        if (blocchiDiLavoro.isEmpty()) {
            return new ArrayList<>();
        }

        // --- CORREZIONE DEFINITIVA QUI ---
        // Usiamo il metodo corretto che cerca solo gli appuntamenti CONFERMATI
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
                    // Ignora gli appuntamenti non confermati
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
        return slotDisponibili;
    }
}