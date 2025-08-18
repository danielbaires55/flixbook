// Nel tuo file ReminderService.java
package com.flixbook.flixbook_backend.service;

import com.flixbook.flixbook_backend.model.Appuntamento;
import com.flixbook.flixbook_backend.repository.AppuntamentoRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;

@Service
public class ReminderService {

    @Autowired
    private AppuntamentoRepository appuntamentoRepository;

    @Autowired
    private EmailService emailService;

    // Questo metodo ha l'annotazione @Transactional
    @Transactional
    public void sendRemindersOnStartup() {
        System.out.println("Controllo promemoria all'avvio del server...");

        // ... (il resto del tuo codice è corretto)

        LocalDateTime inizioIntervallo = LocalDateTime.now();
        LocalDateTime fineIntervallo = LocalDateTime.of(LocalDate.now().plusDays(1), LocalTime.of(23, 59, 59));
        List<Appuntamento> appuntamentiDaRicordare = appuntamentoRepository
            .findByDataEOraInizioBetweenAndReminderInviatoIsFalse(inizioIntervallo, fineIntervallo);

        if (!appuntamentiDaRicordare.isEmpty()) {
            for (Appuntamento appuntamento : appuntamentiDaRicordare) {
                // La logica per inviare l'email e aggiornare lo stato
                String destinatario = appuntamento.getPaziente().getEmail();
                String oggetto = "Promemoria appuntamento: " + appuntamento.getDisponibilita().getPrestazione().getNome();
                String corpo = "Gentile " + appuntamento.getPaziente().getNome() + ",\n\n"
                             + "Questo è un promemoria per il tuo prossimo appuntamento su Flixbook.\n"
                             + "Dettagli:\n"
                             + "Medico: Dr. " + appuntamento.getDisponibilita().getMedico().getNome() + " " + appuntamento.getDisponibilita().getMedico().getCognome() + "\n"
                             + "Prestazione: " + appuntamento.getDisponibilita().getPrestazione().getNome() + "\n"
                             + "Data: " + appuntamento.getDataEOraInizio().toLocalDate() + "\n"
                             + "Ora: " + appuntamento.getDataEOraInizio().toLocalTime() + "\n\n"
                             + "Grazie per aver usato Flixbook!";

                emailService.sendEmail(destinatario, oggetto, corpo);

                appuntamento.setReminderInviato(true);
            }
            appuntamentoRepository.saveAll(appuntamentiDaRicordare);
        }

        System.out.println(String.format("Promemoria inviati a %d appuntamenti all'avvio.", appuntamentiDaRicordare.size()));
    }
}