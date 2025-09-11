package com.flixbook.flixbook_backend.service;

import com.twilio.Twilio;
import com.twilio.exception.ApiException;
import com.twilio.rest.api.v2010.account.Message;
import com.twilio.type.PhoneNumber;
import com.google.i18n.phonenumbers.NumberParseException;
import com.google.i18n.phonenumbers.PhoneNumberUtil;
import com.google.i18n.phonenumbers.Phonenumber;
import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class SmsService {

    private static final Logger log = LoggerFactory.getLogger(SmsService.class);

    @Value("${twilio.enabled:false}")
    private boolean enabled;

    @Value("${twilio.account.sid:}")
    private String accountSid;

    @Value("${twilio.auth.token:}")
    private String authToken;

    @Value("${twilio.phone.number:}")
    private String twilioPhoneNumber;

    // Default region/country for parsing raw numbers like 3331234567 -> +393331234567
    @Value("${twilio.default.country:IT}")
    private String defaultCountry;

    @Value("${twilio.default.countryCode:+39}")
    private String defaultCountryCode;

    @PostConstruct
    public void init() {
        // Initialize Twilio only when explicitly enabled and credentials are present
        if (!enabled) {
            log.debug("[SmsService] Twilio disabled (twilio.enabled=false). Running in no-op mode.");
            return;
        }
    // Defensive trim to avoid invisible whitespace issues from env/properties
    if (accountSid != null) accountSid = accountSid.trim();
    if (authToken != null) authToken = authToken.trim();
    if (twilioPhoneNumber != null) twilioPhoneNumber = twilioPhoneNumber.trim();

    if (isBlank(accountSid) || isBlank(authToken) || isBlank(twilioPhoneNumber)) {
            log.warn("[SmsService] Twilio enabled but credentials missing. No-op mode.");
            enabled = false; // fall back to no-op to avoid startup failure
            return;
        }
        try {
            Twilio.init(accountSid, authToken);
            log.debug("[SmsService] Twilio initialized. From={} (masked)", mask(twilioPhoneNumber));
        } catch (Exception e) {
            log.error("[SmsService] Failed to initialize Twilio: {}", e.getMessage());
            enabled = false;
        }
    }

    public void sendSms(String to, String body) {
        if (!enabled) {
            log.debug("[SmsService] sendSms skipped (disabled): to={}", mask(to));
            return;
        }
        String e164 = normalizeToE164(to);
        try {
            Message.creator(
                new PhoneNumber(e164), // Numero del destinatario
                new PhoneNumber(twilioPhoneNumber), // Numero del mittente Twilio
                body // Corpo del messaggio
            ).create();
            log.debug("[SmsService] SMS inviato: to={}", mask(e164));
        } catch (ApiException e) {
        log.error("[SmsService] Twilio API error sending SMS to {}: code={}, msg={}",
            mask(e164), e.getCode(), e.getMessage());
        } catch (Exception e) {
            log.error("[SmsService] Errore nell'invio dell'SMS a {}: {}", mask(e164), e.getMessage());
        }
    }

    public void sendConfirmationSms(String to, String appuntamentoDettagli) {
        if (!enabled) {
            log.debug("[SmsService] sendConfirmationSms skipped (disabled): to={}", mask(to));
            return;
        }
        String e164 = normalizeToE164(to);
        try {
            String messaggioSms = String.format("Il tuo appuntamento su Flixbook è stato confermato! Dettagli: %s", appuntamentoDettagli);
            Message.creator(
                new PhoneNumber(e164),
                new PhoneNumber(twilioPhoneNumber),
                messaggioSms
            ).create();
            log.debug("[SmsService] SMS di conferma inviato: to={}", mask(e164));
        } catch (ApiException e) {
            log.error("[SmsService] Twilio API error sending confirmation to {}: code={}, msg={}, moreInfo={}",
                    mask(e164), e.getCode(), e.getMessage(), e.getMoreInfo());
        } catch (Exception e) {
            log.error("[SmsService] Errore nell'invio dell'SMS di conferma a {}: {}", mask(e164), e.getMessage());
        }
    }

    /**
     * Unified template for patient messages: Conferma/Annullamento/Spostamento/Promemoria.
     * Example: "Flixbook: Appuntamento Confermato. Dettagli: Dr. Rossi, Visita, 2025-09-01 ore 10:00. VC: <link>"
     */
    public void sendPatientAppointmentMessage(String to, String statoLabel, String dettagli) {
        if (!enabled) {
            log.debug("[SmsService] sendPatientAppointmentMessage skipped (disabled): to={}, stato={}, details={}", mask(to), statoLabel, truncate(dettagli));
            return;
        }
        String e164 = normalizeToE164(to);
        try {
            String text = String.format("Flixbook: Appuntamento %s. Dettagli: %s", statoLabel, dettagli);
            Message message = Message.creator(
                new PhoneNumber(e164),
                new PhoneNumber(twilioPhoneNumber),
                text
            ).create();
            log.info("[SmsService] SMS paziente inviato: sid={}, to={}, stato={}", message.getSid(), mask(e164), statoLabel);
        } catch (ApiException e) {
            log.error("[SmsService] Twilio API error sending patient SMS to {}: code={}, msg={}, moreInfo={}",
                    mask(e164), e.getCode(), e.getMessage(), e.getMoreInfo());
        } catch (Exception e) {
            log.error("[SmsService] Errore nell'invio dell'SMS paziente a {}: {}", mask(e164), e.getMessage());
        }
    }

    private String normalizeToE164(String raw) {
        if (isBlank(raw)) return raw;
        String trimmed = raw.trim().replaceAll("\\s+", "");
        // If already in E.164
        if (trimmed.startsWith("+")) return trimmed;
        // Try libphonenumber using defaultCountry
        try {
            PhoneNumberUtil util = PhoneNumberUtil.getInstance();
            Phonenumber.PhoneNumber number = util.parse(trimmed, defaultCountry);
            if (util.isValidNumber(number)) {
                return util.format(number, PhoneNumberUtil.PhoneNumberFormat.E164);
            }
        } catch (NumberParseException ignored) {}
        // Fallback: prefix default country code if only digits
        if (trimmed.matches("[0-9]{6,15}")) {
            return defaultCountryCode + trimmed.replaceFirst("^0+", "");
        }
        return trimmed;
    }

    private static boolean isBlank(String s) {
        return s == null || s.trim().isEmpty();
    }

    private static String truncate(String s) {
        if (s == null) return "";
        return s.length() > 120 ? s.substring(0, 117) + "..." : s;
    }

    private static String mask(String s) {
        if (s == null || s.length() < 5) return "***";
        int keep = 3;
        return s.substring(0, keep) + "***" + s.substring(s.length() - keep);
    }

    // Lightweight status for diagnostics
    // (Rimossa API di stato; non necessaria in produzione)
}