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
import jakarta.mail.MessagingException;

@Service
public class ReminderService {

    @Autowired
    private AppuntamentoRepository appuntamentoRepository;

    @Autowired
    private EmailService emailService;
    
    @Autowired
    private SmsService smsService;

    @Transactional
    public void sendRemindersOnStartup() {
        System.out.println("Controllo promemoria all'avvio del server...");

        LocalDateTime inizioIntervallo = LocalDateTime.now();
        LocalDateTime fineIntervallo = LocalDateTime.of(LocalDate.now().plusDays(1), LocalTime.of(23, 59, 59));
        
        // Cerca appuntamenti che necessitano di un promemoria (sia email che SMS)
        List<Appuntamento> appuntamentiDaRicordare = appuntamentoRepository
            .findByDataEOraInizioBetweenAndReminderInviatoIsFalseAndSmsReminderInviatoIsFalse(inizioIntervallo, fineIntervallo);

        if (!appuntamentiDaRicordare.isEmpty()) {
            for (Appuntamento appuntamento : appuntamentiDaRicordare) {
                // Logica per inviare il promemoria via EMAIL (nessuna modifica)
                if (!appuntamento.isReminderInviato()) {
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

                // Logica per inviare il promemoria via SMS (modificata)
                if (!appuntamento.isSmsReminderInviato()) {
                    String numeroDestinatario = appuntamento.getPaziente().getTelefono();
                    if (numeroDestinatario != null && !numeroDestinatario.isEmpty()) {
                        // Nuovo messaggio SMS personalizzato
                        String messaggioSms = String.format("Promemoria appuntamento su Flixbook! Medico: Dr. %s %s. Prestazione: %s. Data: %s, Ore: %s.",
                            appuntamento.getDisponibilita().getMedico().getNome(),
                            appuntamento.getDisponibilita().getMedico().getCognome(),
                            appuntamento.getDisponibilita().getPrestazione().getNome(),
                            appuntamento.getDataEOraInizio().toLocalDate(),
                            appuntamento.getDataEOraInizio().toLocalTime());
                            
                        smsService.sendSms(numeroDestinatario, messaggioSms);
                        appuntamento.setSmsReminderInviato(true);
                    }
                }
            }
            appuntamentoRepository.saveAll(appuntamentiDaRicordare);
        }

        System.out.println(String.format("Promemoria inviati a %d appuntamenti all'avvio.", appuntamentiDaRicordare.size()));
    }
}