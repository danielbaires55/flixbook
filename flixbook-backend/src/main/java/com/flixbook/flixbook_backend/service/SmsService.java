package com.flixbook.flixbook_backend.service;

import com.twilio.Twilio;
import com.twilio.rest.api.v2010.account.Message;
import com.twilio.type.PhoneNumber;
import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class SmsService {

    @Value("${twilio.enabled:false}")
    private boolean enabled;

    @Value("${twilio.account.sid:}")
    private String accountSid;

    @Value("${twilio.auth.token:}")
    private String authToken;

    @Value("${twilio.phone.number:}")
    private String twilioPhoneNumber;

    @PostConstruct
    public void init() {
        // Initialize Twilio only when explicitly enabled and credentials are present
        if (!enabled) {
            System.out.println("[SmsService] Twilio disabled (twilio.enabled=false). Running in no-op mode.");
            return;
        }
        if (isBlank(accountSid) || isBlank(authToken) || isBlank(twilioPhoneNumber)) {
            System.out.println("[SmsService] Twilio enabled but one or more credentials are missing. Switching to no-op mode.");
            enabled = false; // fall back to no-op to avoid startup failure
            return;
        }
        Twilio.init(accountSid, authToken);
    }

    public void sendSms(String to, String body) {
        if (!enabled) {
            System.out.println("[SmsService] sendSms skipped (Twilio disabled): to=" + to + ", body=" + truncate(body));
            return;
        }
        try {
            Message message = Message.creator(
                new PhoneNumber(to), // Numero del destinatario
                new PhoneNumber(twilioPhoneNumber), // Numero del mittente Twilio
                body // Corpo del messaggio
            ).create();
            System.out.println("SMS inviato con SID: " + message.getSid());
        } catch (Exception e) {
            System.err.println("Errore nell'invio dell'SMS a " + to + ": " + e.getMessage());
        }
    }

    public void sendConfirmationSms(String to, String appuntamentoDettagli) {
        if (!enabled) {
            System.out.println("[SmsService] sendConfirmationSms skipped (Twilio disabled): to=" + to + ", details=" + truncate(appuntamentoDettagli));
            return;
        }
        try {
            String messaggioSms = String.format("Il tuo appuntamento su Flixbook è stato confermato! Dettagli: %s", appuntamentoDettagli);
            Message message = Message.creator(
                new PhoneNumber(to),
                new PhoneNumber(twilioPhoneNumber),
                messaggioSms
            ).create();
            System.out.println("SMS di conferma inviato con SID: " + message.getSid());
        } catch (Exception e) {
            System.err.println("Errore nell'invio dell'SMS di conferma a " + to + ": " + e.getMessage());
        }
    }

    /**
     * Unified template for patient messages: Conferma/Annullamento/Spostamento.
     * Example: "Flixbook: Appuntamento Confermato. Dettagli: Dr. Rossi, Visita, 2025-09-01 ore 10:00. VC: <link>"
     */
    public void sendPatientAppointmentMessage(String to, String statoLabel, String dettagli) {
        if (!enabled) {
            System.out.println("[SmsService] sendPatientAppointmentMessage skipped (Twilio disabled): to=" + to + ", stato=" + statoLabel + ", details=" + truncate(dettagli));
            return;
        }
        try {
            String text = String.format("Flixbook: Appuntamento %s. Dettagli: %s", statoLabel, dettagli);
            Message message = Message.creator(
                new PhoneNumber(to),
                new PhoneNumber(twilioPhoneNumber),
                text
            ).create();
            System.out.println("SMS paziente inviato con SID: " + message.getSid());
        } catch (Exception e) {
            System.err.println("Errore nell'invio dell'SMS paziente a " + to + ": " + e.getMessage());
        }
    }

    private static boolean isBlank(String s) {
        return s == null || s.trim().isEmpty();
    }

    private static String truncate(String s) {
        if (s == null) return "";
        return s.length() > 120 ? s.substring(0, 117) + "..." : s;
    }
}