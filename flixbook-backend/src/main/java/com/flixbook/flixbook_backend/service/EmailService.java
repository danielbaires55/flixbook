package com.flixbook.flixbook_backend.service;

import jakarta.mail.internet.InternetAddress;
import jakarta.mail.internet.MimeMessage;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

@Service
public class EmailService {
    private static final Logger log = LoggerFactory.getLogger(EmailService.class);

    @Autowired
    private JavaMailSender mailSender;

    @Value("${app.mail.enabled:true}")
    private boolean mailEnabled;
    @Value("${spring.mail.username:}")
    private String mailFrom;

    @PostConstruct
    public void init() {
        String from = (mailFrom != null && !mailFrom.isBlank()) ? mailFrom : "noreply@localhost";
        String masked = from.length() > 3 ? from.substring(0, 3) + "***" : "***";
        log.info("[EmailService] Mail enabled={} | from={} (masked)", mailEnabled, masked);
    }

    public void sendEmail(String to, String subject, String body) {
        if (!mailEnabled) {
            log.info("[EmailService] Mail disabled, skipping send to {}", to);
            return;
        }
        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setTo(to);
            message.setSubject(subject);
            message.setText(body);
            String from = (mailFrom != null && !mailFrom.isBlank()) ? mailFrom : "noreply@localhost";
            message.setFrom(from);
            mailSender.send(message);
            if (log.isDebugEnabled()) log.debug("[EmailService] Email inviata a {}", to);
        } catch (Exception e) {
            log.warn("[EmailService] Invio email fallito verso {}: {}", to, e.getMessage());
        }
    }

    public void sendEmailWithIcs(String to, String subject, String body, byte[] icsContent) {
        if (!mailEnabled) {
            log.info("[EmailService] Mail disabled, skipping sendWithIcs to {}", to);
            return;
        }
        try {
            MimeMessage mimeMessage = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(mimeMessage, true, "UTF-8");
            helper.setTo(to);
            helper.setSubject(subject);
            String from = (mailFrom != null && !mailFrom.isBlank()) ? mailFrom : "noreply@localhost";
            helper.setFrom(new InternetAddress(from, "Flixbook"));
            helper.setText(body, false);

            if (icsContent != null && icsContent.length > 0) {
                helper.addAttachment("appuntamento.ics", new ByteArrayResource(icsContent) {
                    @Override
                    public String getFilename() { return "appuntamento.ics"; }
                }, "text/calendar; charset=UTF-8; method=REQUEST");
            }
            mailSender.send(mimeMessage);
        } catch (Exception e) {
            log.warn("[EmailService] Invio email con ICS fallito verso {}: {}. Provo fallback testo.", to, e.getMessage());
            // fallback plain (internamente già protetto)
            sendEmail(to, subject, body);
        }
    }
}