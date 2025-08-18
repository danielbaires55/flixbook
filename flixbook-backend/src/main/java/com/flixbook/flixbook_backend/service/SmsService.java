package com.flixbook.flixbook_backend.service;

import com.twilio.Twilio;
import com.twilio.rest.api.v2010.account.Message;
import com.twilio.type.PhoneNumber;
import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class SmsService {

    @Value("${twilio.account.sid}")
    private String accountSid;

    @Value("${twilio.auth.token}")
    private String authToken;

    @Value("${twilio.phone.number}")
    private String twilioPhoneNumber;

    @PostConstruct
    public void init() {
        Twilio.init(accountSid, authToken);
    }

    public void sendSms(String to, String body) {
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
}