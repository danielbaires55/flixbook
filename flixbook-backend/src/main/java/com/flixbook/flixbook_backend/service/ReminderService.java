package com.flixbook.flixbook_backend.service;

// Nel tuo file ReminderService.java
import com.flixbook.flixbook_backend.model.Appuntamento;
import com.flixbook.flixbook_backend.repository.AppuntamentoRepository;
import com.flixbook.flixbook_backend.repository.FeedbackRepository; // Importa il FeedbackRepository
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;
import jakarta.mail.MessagingException;
import jakarta.annotation.PostConstruct;

@Service
public class ReminderService {

    @Autowired
    private AppuntamentoRepository appuntamentoRepository;

    @Autowired
    private EmailService emailService;
    
    @Autowired
    private SmsService smsService;

    // Aggiungi la dipendenza del FeedbackRepository
    @Autowired
    private FeedbackRepository feedbackRepository;

    @Transactional
    public void sendRemindersOnStartup() {
        System.out.println("Controllo promemoria all'avvio del server...");

        LocalDateTime inizioIntervallo = LocalDateTime.now();
        LocalDateTime fineIntervallo = LocalDateTime.of(LocalDate.now().plusDays(1), LocalTime.of(23, 59, 59));
        
        List<Appuntamento> appuntamentiDaRicordare = appuntamentoRepository
            .findByDataEOraInizioBetweenAndReminderInviatoIsFalseAndSmsReminderInviatoIsFalse(inizioIntervallo, fineIntervallo);

        if (!appuntamentiDaRicordare.isEmpty()) {
            for (Appuntamento appuntamento : appuntamentiDaRicordare) {
                // Logica per inviare il promemoria via EMAIL
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

                // Logica per inviare il promemoria via SMS
                if (!appuntamento.isSmsReminderInviato()) {
                    String numeroDestinatario = appuntamento.getPaziente().getTelefono();
                    if (numeroDestinatario != null && !numeroDestinatario.isEmpty()) {
                        String messaggioSms = String.format("Promemoria appuntamento su Flixbook! Medico: Dr. %s %s. Prestazione: %s. Data: %s, Ore: %s.",
                            appuntamento.getDisponibilita().getMedico().getNome(),
                            appuntamento.getDisponibilita().getMedico().getCognome(),
                            appuntamento.getDisponibilita().getPrestazione().getNome(),
                            appuntamento.getDataEOraInizio().toLocalDate(),
                            appuntamento.getDataEOraInizio().toLocalTime());
                            
                        smsService.sendConfirmationSms(numeroDestinatario, messaggioSms);
                        appuntamento.setSmsReminderInviato(true);
                    }
                }
            }
            appuntamentoRepository.saveAll(appuntamentiDaRicordare);
        }

        System.out.println(String.format("Promemoria inviati a %d appuntamenti all'avvio.", appuntamentiDaRicordare.size()));
    }
}