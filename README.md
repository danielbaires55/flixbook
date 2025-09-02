## Guida per collaboratori: come avviare DB, backend e frontend

Prerequisiti
- Java 21, Node.js 18+ (o 20+), Maven wrapper incluso
- Opzione consigliata: Docker + Docker Compose

### Opzione A (consigliata): con Docker (MySQL portabile)

1) Avvia il DB MySQL in container (dalla root del repo)

```bash
cp -n .env.example .env 2>/dev/null || true
docker compose up -d
```

2) Avvia il backend (profilo dev per dati demo)

```bash
cd flixbook-backend
./mvnw spring-boot:run -Dspring-boot.run.profiles=dev
```

3) Avvia il frontend in un altro terminale

```bash
cd frontend
npm install
npm run dev
```

Dettagli
- Backend su http://localhost:8080
- Frontend su http://localhost:5173 (proxy/non proxy a seconda del codice)
- API base URL centralizzato in `frontend/src/config/api.ts` (override con `.env` Vite se serve)
	- `VITE_API_BASE_URL=http://localhost:8080/api`
	- `VITE_SERVER_BASE_URL=http://localhost:8080`
- Credenziali rapide (demo): `admin@flixbook.local / admin123`

### Opzione B: senza Docker (MySQL locale)

1) Crea un DB vuoto (es. `flixbookdb`) sul tuo MySQL locale.
2) Esporta le variabili d'ambiente (oppure lascia i default se hai root/root su 3306):

```bash
export DB_HOST=localhost
export DB_PORT=3306
export DB_NAME=flixbookdb
export DB_USERNAME=root
export DB_PASSWORD=root
```

3) Avvia il backend (profilo dev per dati demo)

```bash
cd flixbook-backend
./mvnw spring-boot:run -Dspring-boot.run.profiles=dev
```

4) Avvia il frontend come sopra (npm install; npm run dev).

Note
- Flyway crea/aggiorna lo schema; in profilo `dev` un seed dati (`actdump.sql`) popola demo.
- Porta del DB o credenziali diverse? Cambia le env sopra o modifica `.env` e riavvia.

## Avvio rapido con Docker (DB portabile)

Prerequisiti
- Docker + Docker Compose

Passi
1) Copia `.env.example` in `.env` (opzionale, i default vanno già bene)
2) Avvia MySQL in container:
	- Esegui: docker compose up -d
	- Il DB MySQL sarà esposto su `localhost:3306`, database `flixbookdb`, utente `root`/`root` (configurabile da `.env`).
3) Avvia il backend (profile dev per avere dati demo):
	- Posizionati in `flixbook-backend`
	- Esegui: `./mvnw spring-boot:run -Dspring-boot.run.profiles=dev`
	- Il backend leggerà le variabili (`DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USERNAME`, `DB_PASSWORD`) con default già adatti al compose.
	- Flyway applicherà baseline+migrazioni, e il seed opzionale (`actdump.sql`) verrà eseguito perché `app.seed=true` nel profilo `dev`.
4) Avvia il frontend:
	- Posizionati in `frontend`
	- Esegui: `npm install` (la prima volta), poi `npm run dev`
	- L'app punta a `http://localhost:8080/api` (vedi i componenti). Puoi centralizzare l'URL in seguito.

Note
- Per modificare credenziali/porta, cambia i valori in `.env` e riavvia `docker compose`.
- Il volume `mysql_data` mantiene i dati tra riavvii.

## Avvio backend usando un dump SQL (profilo "dump")

Passi passo-passo
1) Crea un database vuoto
	 - Esempio: crea il DB `flixbookdb` sul suo MySQL.

2) Importa il dump nel database
	 - Usa client MySQL o Workbench per importare `flixbook_dump.sql` dentro `flixbookdb`.
	 - Dopo l'import, il DB contiene già struttura e dati.

3) Imposta le credenziali JDBC
	 - Scegli uno di questi modi:
		 - Variabili d'ambiente:
			 - `SPRING_DATASOURCE_URL=jdbc:mysql://<host>:<port>/<db>?serverTimezone=Europe/Rome`
			 - `SPRING_DATASOURCE_USERNAME=<user>`
			 - `SPRING_DATASOURCE_PASSWORD=<password>`
		 - Oppure modifica localmente `flixbook-backend/src/main/resources/application-dump.properties` (sconsigliato committarle).

4) Avvia il backend con il profilo dump (Flyway OFF, niente seed)
	 - Da sorgente
		 - Posizionati in `flixbook-backend`
		 - Avvia con profilo `dump`:
			 - Linux/macOS: `./mvnw spring-boot:run -Dspring-boot.run.profiles=dump`
			 - Windows: `mvnw.cmd spring-boot:run -Dspring-boot.run.profiles=dump`
	 - Da JAR
		 - Costruisci il progetto (`./mvnw -DskipTests package`)
		 - Esegui con: `SPRING_PROFILES_ACTIVE=dump java -jar target/flixbook-backend-0.0.1-SNAPSHOT.jar`

Cosa fa il profilo dump
- Disabilita Flyway (nessuna migrazione applicata/validata)
- Non modifica lo schema (`ddl-auto=none`)
- Non esegue seed dati da `actdump.sql`

Note utili
- Se avvii per errore senza profilo dump, Flyway proverà a validare/applicare migrazioni sul DB importato e può fallire per mismatch. Usa sempre `dump` in questo scenario.
- Se serve aggiornare il DB importato, rigenera un nuovo dump e ripeti i passi 1-4.



## Troubleshooting

Problemi frequenti e soluzioni rapide.

1) Porta occupata (3306, 8080, 5173)
- 3306 (MySQL): cambia `DB_PORT` in `.env` e riavvia Compose.
- 8080 (backend): avvia con `-Dserver.port=8081` oppure setta `SERVER_PORT` env.
- 5173 (frontend): `VITE_PORT=5174 npm run dev` o configura Vite.

2) Flyway: errore “Found more than one migration with version 1”
- Assicurati che Flyway scansioni una sola V1. Il progetto è configurato per usare `classpath:db/baseline`.
- Se modifichi le locations, evita di includere una seconda `V1__*.sql` in `db/migration` o rinominala a `V2__...` coerentemente.
- Se la history è in stato incoerente, puoi fare un repair (con attenzione) o ricreare il DB in locale.

3) Backend non si connette al DB
- Avvio con Docker: verifica che il container sia up e healthy.
```bash
docker compose ps
docker compose logs -f db | tail -n 50
```
- Variabili DB: controlla `DB_HOST/DB_PORT/DB_NAME/DB_USERNAME/DB_PASSWORD`.
- MySQL locale: verifica che l’utente abbia permessi sul DB specificato.

4) Dati demo non caricati
- Avvia con profilo `dev` (in questo profilo `app.seed=true`).
```bash
cd flixbook-backend
./mvnw spring-boot:run -Dspring-boot.run.profiles=dev
```
- Controlla i log per messaggi `[seed]` del `DataInitializer`.

5) Schema non allineato usando un dump
- Avvia il backend con profilo `dump` per disabilitare Flyway e non applicare migrazioni.
```bash
cd flixbook-backend
./mvnw spring-boot:run -Dspring-boot.run.profiles=dump
```

6) Versioni Java/Node non compatibili
- Richiesti: Java 21, Node 18+ (o 20+).
```bash
java -version
node -v
```

7) Docker su Windows/WSL non rilevato
- Abilita l’integrazione WSL in Docker Desktop e riavvia. Verifica con:
```bash
docker --version
docker compose version
```

8) Errori di autenticazione DB (“Access denied for user”)
- Imposta correttamente `DB_USERNAME/DB_PASSWORD` per l’utente che stai usando.
- Con Compose, l’utente root/password proviene da `.env` (default root/root).

9) Upload file/immagini non visibili
- La directory degli upload è configurata in `app.uploads.dir` (default `uploads`). Assicurati che esista ed abbia permessi di scrittura.

