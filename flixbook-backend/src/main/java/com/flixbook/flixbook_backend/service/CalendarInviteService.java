package com.flixbook.flixbook_backend.service;

import com.flixbook.flixbook_backend.model.Appuntamento;
import com.flixbook.flixbook_backend.model.Medico;
import com.flixbook.flixbook_backend.model.Prestazione;
import com.flixbook.flixbook_backend.model.TipoAppuntamento;

import java.nio.charset.StandardCharsets;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;
import java.util.UUID;

/**
 * Builds ICS (iCalendar) content for an appointment.
 */
public class CalendarInviteService {

    private static final ZoneId EUROPE_ROME = ZoneId.of("Europe/Rome");
    private static final DateTimeFormatter ICS_TS = DateTimeFormatter.ofPattern("yyyyMMdd'T'HHmmss'Z'");

    public byte[] buildIcsFor(Appuntamento app, Prestazione prestazione, Medico medico, String patientEmail, String location, String videoUrl) {
        // Convert local Europe/Rome time to UTC Z for ICS
        ZonedDateTime startUtc = app.getDataEOraInizio().atZone(EUROPE_ROME).withZoneSameInstant(ZoneOffset.UTC);
        ZonedDateTime endUtc = app.getDataEOraFine().atZone(EUROPE_ROME).withZoneSameInstant(ZoneOffset.UTC);

        String uid = (app.getId() != null ? ("appt-" + app.getId()) : UUID.randomUUID().toString()) + "@flixbook";
        int sequence = Math.max(0, app.getRescheduleCount());

        StringBuilder sb = new StringBuilder();
        sb.append("BEGIN:VCALENDAR\r\n");
        sb.append("PRODID:-//Flixbook//Appointments//IT\r\n");
        sb.append("VERSION:2.0\r\n");
        sb.append("CALSCALE:GREGORIAN\r\n");
        sb.append("METHOD:REQUEST\r\n");
        sb.append("BEGIN:VEVENT\r\n");
        sb.append("UID:").append(uid).append("\r\n");
        sb.append("SEQUENCE:").append(sequence).append("\r\n");
        sb.append("DTSTAMP:").append(ICS_TS.format(ZonedDateTime.now(ZoneOffset.UTC))).append("\r\n");
        sb.append("DTSTART:").append(ICS_TS.format(startUtc)).append("\r\n");
        sb.append("DTEND:").append(ICS_TS.format(endUtc)).append("\r\n");
        String summary = prestazione.getNome() + " con Dr. " + medico.getCognome();
        sb.append("SUMMARY:").append(escape(summary)).append("\r\n");
        if (location != null && !location.isBlank()) {
            sb.append("LOCATION:").append(escape(location)).append("\r\n");
        }
        StringBuilder desc = new StringBuilder();
        desc.append("Prestazione: ").append(prestazione.getNome());
        if (app.getTipoAppuntamento() == TipoAppuntamento.virtuale && videoUrl != null) {
            desc.append("\\nVideocall: ").append(videoUrl);
        }
        sb.append("DESCRIPTION:").append(escape(desc.toString())).append("\r\n");
        // Organizer/Attendee for better Gmail rendering
        sb.append("ORGANIZER;CN=Flixbook:MAILTO:flixbook819@gmail.com\r\n");
        if (patientEmail != null && !patientEmail.isBlank()) {
            sb.append("ATTENDEE;RSVP=TRUE;ROLE=REQ-PARTICIPANT:MAILTO:").append(patientEmail).append("\r\n");
        }
        // Optional 30-min reminder
        sb.append("BEGIN:VALARM\r\n");
        sb.append("TRIGGER:-PT30M\r\n");
        sb.append("ACTION:DISPLAY\r\n");
        sb.append("DESCRIPTION:Promemoria appuntamento Flixbook\r\n");
        sb.append("END:VALARM\r\n");
        sb.append("END:VEVENT\r\n");
        sb.append("END:VCALENDAR\r\n");

        return sb.toString().getBytes(StandardCharsets.UTF_8);
    }

    public String buildGoogleCalendarLink(Appuntamento app, Prestazione prestazione, Medico medico, String location, String videoUrl) {
        ZonedDateTime startUtc = app.getDataEOraInizio().atZone(EUROPE_ROME).withZoneSameInstant(ZoneOffset.UTC);
        ZonedDateTime endUtc = app.getDataEOraFine().atZone(EUROPE_ROME).withZoneSameInstant(ZoneOffset.UTC);
        String dates = startUtc.format(DateTimeFormatter.ofPattern("yyyyMMdd'T'HHmmss'Z'")) + "/" + endUtc.format(DateTimeFormatter.ofPattern("yyyyMMdd'T'HHmmss'Z'"));
        String text = urlEncode(prestazione.getNome() + " con Dr. " + medico.getCognome());
        StringBuilder details = new StringBuilder();
        if (videoUrl != null && !videoUrl.isBlank()) details.append("Videocall: ").append(videoUrl);
        String detailsEnc = urlEncode(details.toString());
        String locationEnc = urlEncode(location != null ? location : "");
        return "https://calendar.google.com/calendar/render?action=TEMPLATE&text=" + text + "&dates=" + dates + "&details=" + detailsEnc + "&location=" + locationEnc;
    }

    private static String escape(String s) {
        return s.replace("\\", "\\\\").replace(";", "\\;").replace(",", "\\,").replace("\n", "\\n");
    }

    private static String urlEncode(String s) {
        try {
            return java.net.URLEncoder.encode(s, java.nio.charset.StandardCharsets.UTF_8);
        } catch (Exception e) {
            return "";
        }
    }
}
