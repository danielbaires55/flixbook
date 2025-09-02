---
marp: true
theme: default
paginate: true
size: 16:9
---

# Flixbook
Gestione Prenotazioni Sanitarie

- Pazienti e Medici
- Prenota • Sposta • Annulla
- Email/SMS • Calendari (ICS/Google)

---

## Agenda
- Scopo & Stakeholder
- Architettura & Tecnologie
- Dominio & Flussi
- Sicurezza & Dati
- Notifiche & Calendario
- UX/UI
- Scelte & Trade-off
- Runbook (Demo)
- Estensioni

---

## Scopo
- Semplificare prenotazioni e riprogrammazioni
- Supporto visite fisiche e virtuali
- Notifiche chiare e puntuali
- Consistenza degli slot e dei dati

Stakeholder
- Paziente, Medico/Collaboratore, Admin

---

## Architettura
- SPA (React + TS) → API REST (Spring Boot)
- DB MySQL, migrazioni Flyway
- Email (JavaMailSender), SMS (Twilio opzionale)
- ICS + Google Calendar link

Schema logico
- FE (Vite) ↔ BE (Spring) ↔ MySQL

---

## Tecnologie
Frontend
- React, TypeScript, Vite
- React Bootstrap, axios

Backend
- Spring Boot 3 (Java 21)
- Security (JWT), JPA/Hibernate
- Flyway, Lombok

Infra
- Twilio (opzionale), JavaMailSender

---

## Dominio
Entità chiave
- Medico, Paziente, Prestazione
- Sede, BloccoOrario, Slot
- Appuntamento (stato, tipo, link VC, reschedule_count)

Relazioni
- Medico 1–N Blocchi → N–1 Sede
- Blocchi 1–N Slot • Appuntamento 1–1 Slot

---

## Flusso: Prenotazione
1) Lista slot (persistiti o calcolati dai blocchi)
2) Validazioni (futuro, disponibilità, compatibilità)
3) Slot → OCCUPATO, crea Appuntamento
4) Email/SMS + ICS + Google link

---

## Flusso: Riprogrammazione
Variant 1 – per slotId
- Stesso medico, slot DISPONIBILE
- Regole paziente: ≤2 spostamenti, no <24h
- Switch atomico: libera vecchio, occupa nuovo
- Reset reminder, incrementa sequence ICS
- Notifiche: paziente + medico (se iniziato dal paziente)

---

## Flusso: Annullamento & Post
- Annulla: libera slot, email/SMS
- Promemoria <24h: email/SMS
- Completamento → richiesta feedback

---

## Sicurezza
- JWT, ruoli: PAZIENTE, MEDICO, COLLABORATORE, ADMIN
- Autorizzazioni su sposta/annulla
- Statici (profili) con bypass controllato

---

## Dati & Migrazioni
- MySQL 8, schema versionato con Flyway
- Baseline + repeatable per evoluzioni sicure
- Concorrenza slot
  - Vincolo unico (medico + inizio)
  - Lock pessimista su prenotazione

---

## Notifiche & Calendari
- Email: conferme, promemoria, annullamenti, spostamenti
- SMS (Twilio): opzionale, messaggi unificati
- ICS: DTSTART/DTEND UTC, SUMMARY, LOCATION, VALARM, SEQUENCE
- Google Calendar: link template

---

## UX/UI
- Modali per conferme/errori (no alert nativi)
- Filtro sede per visite fisiche
- Messaggi chiari per policy (≤2 spostamenti, no <24h)
- Branding clinica + “Powered by Flixbook”

---

## Scelte & Trade-off
- Slot persistiti → fonte di verità; fallback da blocchi
- Riprogrammazione per slotId (semplice, vincolo stesso medico)
- SMS disattivabile per ambienti dev
- Indirizzo appuntamento
  - slot→blocco.sede → blocco del giorno/orario → prima sede del medico

---

## Runbook (Demo)
Backend
- `./mvnw spring-boot:run`

Frontend
- `npm run dev`

URL
- FE: http://localhost:5173
- API: http://localhost:8080

---

## Estensioni
- Ricerca multi-medico (prestazione/distanza)
- Push/WhatsApp, pagamenti, no-show policy
- Referti e cartelle, analytics

---

## Q&A
Grazie!
