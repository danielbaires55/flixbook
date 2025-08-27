package com.flixbook.flixbook_backend.service;

import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

@Service
public class StartupService {

    @Autowired
    private AppuntamentoService appuntamentoService;

    @Autowired
    private SlotService slotService;

    @PostConstruct
    public void init() {
        // Ora chiamiamo il metodo pubblico dell'altro service.
        // Spring si assicurerà che ci sia una transazione attiva.
        appuntamentoService.eseguiTaskDiAvvio();
    long removed = slotService.cleanupExpiredSlots();
    System.out.println("[Startup] Slot scaduti rimossi: " + removed);
    }
}