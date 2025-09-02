## Panoramica del progetto

Flixbook è una piattaforma web per la gestione delle prenotazioni sanitarie della “Clinica Benessere” (Powered by Flixbook). Consente a pazienti, medici e collaboratori di gestire visite, disponibilità, promemoria e feedback in modo semplice e centralizzato.

---

## Parte 1 – Presentazione per una commissione mista (non troppo tecnica)

### Il problema che risolve
- Prenotazioni e spostamenti visita spesso richiedono telefonate, scambi di email, errori di orario e mancanza di promemoria.
- I pazienti faticano a trovare rapidamente lo specialista e un orario libero adeguato; la segreteria perde tempo in attività ripetitive.

### La soluzione in breve
- Un’unica piattaforma online dove:
	- Il paziente sceglie la prestazione, vede i medici disponibili e prenota il primo slot libero.
	- Può spostare la visita se necessario (rispettando regole chiare e trasparenti).
	- Riceve conferme, promemoria e inviti calendario via email (SMS opzionale).
	- Al termine può lasciare una valutazione per aiutare altri pazienti.
	- L’amministrazione gestisce medici, sedi, calendari e pulizia dati da un’unica interfaccia.

### Per chi è pensato
- Pazienti: prenotazioni rapide, promemoria e possibilità di spostare la visita.
- Medici: agenda aggiornata, notifiche sugli appuntamenti, minor tempo alla burocrazia.
- Collaboratori/Segreteria: gestione semplificata di medici, sedi e blocchi orari.
- Amministratori: controllo completo della piattaforma e delle politiche operative.

### Cosa può fare in pratica
- Prenotare visite (in sede o virtuali) scegliendo medico e orario.
- Spostare una visita su un nuovo slot, con limiti per evitare abusi (max 2 volte, non nelle ultime 24h).
- Ricevere email di conferma/annullamento/spostamento e promemoria con invito calendario (ICS) e link rapido a Google Calendar.
- Lasciare un feedback (voto da 1 a 5) che genera una valutazione media per ogni medico.
- Vedere i medici in homepage con stelle di valutazione.
- Per gli admin: rimuovere medici che non hanno appuntamenti futuri confermati, con pulizia dati e un piccolo “report” riassuntivo.

### Benefici chiave
- Meno telefonate e meno errori: tutto è tracciato e automatico.
- Migliore puntualità: promemoria automatici riducono i “no-show”.
- Trasparenza per i pazienti: informazioni chiare su medico, sede e orari, più le valutazioni medie.
- Efficienza per la clinica: gestione centralizzata di agende, sedi e comunicazioni.

### Sicurezza e privacy (in parole semplici)
- Accessi con ruoli (paziente, medico, collaboratore, admin) e token di sicurezza.
- Immagini profilo e documenti statici serviti in modo sicuro.
- Dati sensibili protetti e scambio di email con inviti calendario.

### Cosa è già attivo e funzionante
- Prenotazioni e spostamenti con regole chiare; notifiche via email (con invito calendario); SMS disattivabili.
- Promemoria automatici; richieste di feedback inviate a fine visita.
- Homepage con medici e valutazioni in stelle; profili e immagini servite dalla piattaforma.
- Pannello admin con funzioni di gestione e cancellazione sicura dei medici (se non hanno visite future confermate).

---

## Parte 2 – Panoramica tecnica (per i tecnici)

### Architettura
- Frontend: Single Page Application in React + TypeScript (Vite).
- Backend: REST API con Spring Boot 3 (Java 21), sicurezza JWT, JPA/Hibernate.
- Database: MySQL 8, migrazioni Flyway (baseline + script ripetibili).
- Notifiche: Email (JavaMail) con ICS; SMS via Twilio opzionale/ disattivabile.

### Stack e librerie principali
- Frontend: React 19, TypeScript 5, axios, react-bootstrap, react-calendar, react-big-calendar.
- Backend: Spring Boot (Web, Security, Data JPA), Lombok, Flyway, JavaMail Sender.
- Integrazioni: ICS (file .ics) e link “Aggiungi a Google Calendar”.

### Dominio dati (entità principali)
- Medico, Paziente, Prestazione, Sede.
- BloccoOrario (blocchi di disponibilità), Slot (stati: DISPONIBILE/ OCCUPATO/ DISABILITATO).
- Appuntamento (stati: CONFERMATO/ ANNULLATO/ COMPLETATO; tipo: fisico/ virtuale; campi di policy come reschedule_count e flag promemoria).
- Feedback (valutazione da 1 a 5) collegato a un appuntamento.

### API ed endpoint notevoli
- Prenotazione e gestione appuntamenti:
	- POST /api/appuntamenti … crea un appuntamento validando lo slot e inviando notifiche.
	- PUT /api/appuntamenti/{id}/sposta con body { "slotId": number } … spostamento “Variant 1” by slotId.
	- Annullamento e promemoria: endpoint e job a supporto.
- Valutazioni mediche:
	- GET /api/medici/withRatings – elenco pubblico dei medici con media e conteggio.
	- GET /api/medici/byPrestazione/{id}/withRatings – medici filtrati per prestazione con rating.
- Amministrazione:
	- POST /api/admin/feedback/scan – trigger manuale per invio richieste di feedback.
	- DELETE /api/admin/medici/{id} – cancellazione con blocco solo se ci sono appuntamenti futuri confermati e report di cleanup.

### Regole e politiche operative
- Spostamento appuntamenti: consentito max 2 volte e non nelle 24 ore precedenti; al cambio slot si aggiornano in modo transazionale gli stati (concorrenza sicura) e si resettano i flag dei promemoria.
- Reminder: invio promemoria a 24h; email con ICS e link Google; contenuti SMS unificati (facoltativi).
- Risoluzione indirizzi: fallback robusti per mostrare sede corretta nelle email (blocco/slot → blocco copertura → prima sede del medico → indirizzo di default della clinica).

### Sicurezza
- Autenticazione stateless con JWT e ruoli (PAZIENTE, MEDICO, COLLABORATORE, ADMIN).
- CORS configurato per sviluppo; risorse statiche (immagini profilo) servite con bypass controllato.

### Migrazioni e portabilità
- Flyway con baseline ripetibile per ambienti già esistenti; script resilienti (es. aggiunta colonne come reschedule_count solo se mancanti).
- Dati seed/di esempio per avvio rapido; gestione porte dev e statiche per immagini profilo.

### Frontend e UX
- Dashboard paziente/medico con calendario, modali per conferme, gestione errori di policy in chiaro.
- Homepage “Clinica Benessere” con card dei medici e valutazioni in stelle (testo “Nessuna valutazione” in assenza di feedback).
- Prenotazione con filtri per sede (per visite fisiche) e normalizzazione oraria.

### Qualità, logging e osservabilità
- Log mirati per invii email/SMS, fallback degli indirizzi e scansioni feedback.
- Gestione concorrenza nella prenotazione/spostamento degli slot per evitare doppi booking.

### Limiti attuali e prossimi passi
- Booking: opzionale miglioramento mostrando le stelle anche nel selettore dei medici durante la prenotazione.
- Ottimizzazione frontend: code-splitting più fine (warning dimensioni bundle in build) e lazy loading.
- Documentazione: esportazione PDF delle slide riassuntive.
- Test: ampliare unit/integration test su servizi chiave (appuntamenti, notifiche, rating).

### Configurazioni utili (operatività)
- Email e ICS: abilitati di default; link Google Calendar attivabile/disattivabile via flag.
- SMS (Twilio): completamente opzionali; l’assenza di credenziali non blocca l’avvio.
- Profili Spring (application.properties) per dev e ambienti diversi; risorse statiche servite da classpath o cartella uploads.

---

Questa panoramica offre una lettura semplice per i non tecnici e, al tempo stesso, i riferimenti concreti per i tecnici su stack, API e regole applicative.

