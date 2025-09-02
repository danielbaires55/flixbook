package com.flixbook.flixbook_backend.service;

import jakarta.activation.DataHandler;
import jakarta.activation.DataSource;
import jakarta.mail.MessagingException;
import jakarta.mail.internet.InternetAddress;
import jakarta.mail.internet.MimeBodyPart;
import jakarta.mail.internet.MimeMessage;
import jakarta.mail.internet.MimeMultipart;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.core.io.InputStreamSource;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

@Service
public class EmailService {

    @Autowired
    private JavaMailSender mailSender;

    public void sendEmail(String to, String subject, String body) {
        SimpleMailMessage message = new SimpleMailMessage();
        message.setTo(to);
        message.setSubject(subject);
        message.setText(body);
        message.setFrom("flixbook819@gmail.com");
        mailSender.send(message);
        System.out.println("Email inviata a " + to);
    }

    public void sendEmailWithIcs(String to, String subject, String body, byte[] icsContent) {
        try {
            MimeMessage mimeMessage = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(mimeMessage, true, "UTF-8");
            helper.setTo(to);
            helper.setSubject(subject);
            helper.setFrom(new InternetAddress("flixbook819@gmail.com", "Flixbook"));
            helper.setText(body, false);

            if (icsContent != null && icsContent.length > 0) {
                helper.addAttachment("appuntamento.ics", new ByteArrayResource(icsContent) {
                    @Override
                    public String getFilename() { return "appuntamento.ics"; }
                }, "text/calendar; charset=UTF-8; method=REQUEST");
            }
            mailSender.send(mimeMessage);
        } catch (Exception e) {
            // fallback plain
            sendEmail(to, subject, body);
        }
    }
}