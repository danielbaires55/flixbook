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

