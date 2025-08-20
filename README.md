# Sistema di Prenotazione Visite Mediche

Un'applicazione web moderna per la gestione di appuntamenti medici che permette a pazienti e medici di gestire le loro prenotazioni e disponibilità.

## 🏥 Caratteristiche Principali

### Per i Pazienti
- **Registrazione e Login**: Sistema di autenticazione sicuro
- **Prenotazione Visite**: Calendario interattivo per prenotare appuntamenti
- **Dashboard Personale**: Gestione dei propri appuntamenti
- **Feedback**: Sistema di valutazione post-visita
- **Visite Virtuali**: Supporto per consultazioni online

### Per i Medici
- **Dashboard Medico**: Panoramica completa degli appuntamenti
- **Gestione Disponibilità**: Creazione e modifica degli slot disponibili
- **Calendario Personale**: Visualizzazione degli appuntamenti programmati
- **Specializzazioni**: Gestione delle proprie aree di competenza

### Funzionalità Generali
- **Home Page**: Presentazione dei medici e delle specialità
- **Calendario Pubblico**: Visualizzazione delle disponibilità
- **Sistema di Autenticazione**: JWT-based con ruoli differenziati
- **Design Responsivo**: Interfaccia ottimizzata per tutti i dispositivi

## 🛠️ Stack Tecnologico

### Frontend
- **React 18** - Libreria UI principale
- **TypeScript** - Tipizzazione statica
- **Vite** - Build tool e dev server
- **React Router DOM** - Navigazione SPA
- **Bootstrap** - Framework CSS
- **React Big Calendar** - Componente calendario
- **Axios** - Client HTTP per API calls

### Autenticazione
- **JWT (JSON Web Tokens)** - Gestione sessioni utente
- **jwt-decode** - Decodifica token client-side

## 📁 Struttura del Progetto

```
src/
├── assets/              # Risorse statiche (immagini, SVG)
│   └── logo-notext.svg
├── components/          # Componenti React riutilizzabili
│   ├── BookingCalendar.tsx     # Calendario prenotazioni
│   ├── BookingCalendar.css
│   ├── Button.tsx              # Componente pulsante
│   ├── Button.css
│   ├── ConsultantCard.tsx      # Card medico
│   ├── CreateDisponibilitaForm.tsx  # Form creazione disponibilità
│   ├── FeedbackForm.tsx        # Form feedback pazienti
│   ├── Footer.tsx              # Footer del sito
│   ├── HeroSection.tsx         # Sezione hero homepage
│   ├── Login.tsx               # Form di login
│   ├── MediciSection.tsx       # Sezione medici homepage
│   ├── MediciSection.css
│   ├── MedicoDashboard.tsx     # Dashboard medici
│   ├── NavBar.tsx              # Barra di navigazione
│   ├── PazienteDashboard.tsx   # Dashboard pazienti
│   ├── PazienteRegistrationForm.tsx  # Registrazione pazienti
│   ├── RegisterMedicoForm.tsx  # Registrazione medici
│   ├── SpecialitaSection.tsx   # Sezione specialità homepage
│   └── SpecialitaSection.css
├── pages/               # Pagine principali
│   └── HomePage.tsx     # Homepage del sito
├── types/               # Definizioni TypeScript
│   └── types.ts         # Interfacce e tipi
├── App.tsx              # Componente principale
├── App.css              # Stili globali app
├── index.css            # Stili base
└── main.tsx             # Entry point applicazione
```

## 🚀 Guida all'Installazione

### Prerequisiti
- Node.js (versione 16 o superiore)
- npm o yarn
- Backend API in esecuzione su `http://localhost:8080`

### Installazione

1. **Clona il repository**
```bash
git clone <repository-url>
cd sistema-prenotazione-medici
```

2. **Installa le dipendenze**
```bash
npm install
```

3. **Configura le variabili d'ambiente**
Crea un file `.env` nella root del progetto:
```env
VITE_API_BASE_URL=http://localhost:8080/api
```

4. **Avvia il server di sviluppo**
```bash
npm run dev
```

L'applicazione sarà disponibile su `http://localhost:5173`

## 📱 Utilizzo dell'Applicazione

### Per i Pazienti

1. **Registrazione**: Vai su `/register` per creare un nuovo account paziente
2. **Login**: Accedi tramite `/login` con le tue credenziali
3. **Prenotazione**: Usa `/book` per prenotare un appuntamento
4. **Dashboard**: Accedi a `/paziente-dashboard` per gestire i tuoi appuntamenti

### Per i Medici

1. **Login**: Accedi con credenziali medico su `/login`
2. **Dashboard**: Vai su `/medico-dashboard` per vedere i tuoi appuntamenti
3. **Disponibilità**: Usa `/medico/create-disponibilita` per impostare i tuoi orari

## 🔐 Sistema di Autenticazione

L'applicazione utilizza un sistema di autenticazione basato su JWT con due ruoli principali:

- **ROLE_PAZIENTE**: Accesso alle funzionalità paziente
- **ROLE_MEDICO**: Accesso alle funzionalità medico

Le rotte protette richiedono un token JWT valido memorizzato in `localStorage`.

## 🔗 Endpoint API

Il frontend comunica con un backend REST API. Gli endpoint principali includono:

- `GET /api/medici` - Lista medici
- `GET /api/specialita` - Lista specialità mediche
- `GET /api/disponibilita` - Disponibilità medici
- `POST /api/appuntamenti` - Creazione appuntamenti
- `POST /api/auth/login` - Autenticazione
- `POST /api/pazienti` - Registrazione pazienti

## 🎨 Design System

L'applicazione segue un design system coerente con:

- **Font**: Inter (con fallback system fonts)
- **Colori primari**: Nero (#000), Grigio (#757070), Bianco (#FFF)
- **Border radius**: 16px per le card
- **Spacing**: Sistema basato su multipli di 8px
- **Responsive**: Design mobile-first con breakpoints standard

## 🧪 Testing

```bash
# Esegui i test
npm run test

# Esegui i test in modalità watch
npm run test:watch

# Coverage dei test
npm run test:coverage
```

## 📦 Build e Deploy

```bash
# Build per produzione
npm run build

# Preview build locale
npm run preview

# Lint del codice
npm run lint
```

## 🤝 Contribuire

1. Fork del progetto
2. Crea un branch per la tua feature (`git checkout -b feature/AmazingFeature`)
3. Commit delle modifiche (`git commit -m 'Add some AmazingFeature'`)
4. Push del branch (`git push origin feature/AmazingFeature`)
5. Apri una Pull Request

## 📝 Licenza

Questo progetto è distribuito sotto licenza MIT. Vedi il file `LICENSE` per maggiori dettagli.

## 📞 Supporto

Per supporto o domande:
- Apri una issue su GitHub
- Contatta il team di sviluppo

## 🔄 Changelog

### v1.0.0
- Implementazione sistema di prenotazione base
- Dashboard per pazienti e medici
- Sistema di autenticazione JWT
- Calendario interattivo
- Homepage con presentazione medici e specialità
