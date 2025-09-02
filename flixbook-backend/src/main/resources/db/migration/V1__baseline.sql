-- Flyway baseline: full schema as of 2025-08-30
-- This migration creates the entire schema for a fresh database.
-- Existing databases should be baselined to version 1 without running this file.

-- Table: specialita
CREATE TABLE `specialita` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `nome` varchar(255) NOT NULL,
  `icon_url` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `nome` (`nome`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Table: prestazioni
CREATE TABLE `prestazioni` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `specialita_id` bigint NOT NULL,
  `nome` varchar(255) NOT NULL,
  `descrizione` varchar(255) DEFAULT NULL,
  `costo` double NOT NULL,
  `icon_url` varchar(255) DEFAULT NULL,
  `tipo_prestazione` enum('fisico','virtuale') NOT NULL DEFAULT 'fisico',
  `durata_minuti` int NOT NULL DEFAULT '30',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_prestazioni_nome` (`nome`),
  KEY `idx_prestazioni_specialita` (`specialita_id`),
  CONSTRAINT `fk_prestazioni_specialita` FOREIGN KEY (`specialita_id`) REFERENCES `specialita` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Table: medici
CREATE TABLE `medici` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `nome` varchar(255) NOT NULL,
  `cognome` varchar(255) NOT NULL,
  `email` varchar(255) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `telefono` varchar(255) DEFAULT NULL,
  `img_prof_url` varchar(255) DEFAULT NULL,
  `biografia` varchar(255) DEFAULT NULL,
  `ruolo` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_medici_email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Table: pazienti
CREATE TABLE `pazienti` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `nome` varchar(255) NOT NULL,
  `cognome` varchar(255) NOT NULL,
  `email` varchar(255) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `telefono` varchar(255) DEFAULT NULL,
  `data_registrazione` datetime NOT NULL,
  `data_nascita` date DEFAULT NULL,
  `indirizzo` varchar(255) DEFAULT NULL,
  `citta` varchar(255) DEFAULT NULL,
  `provincia` varchar(255) DEFAULT NULL,
  `cap` varchar(255) DEFAULT NULL,
  `ruolo` varchar(255) DEFAULT NULL,
  `codice_fiscale` varchar(32) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_pazienti_email` (`email`),
  KEY `idx_pazienti_email` (`email`),
  KEY `idx_pazienti_cf` (`codice_fiscale`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Table: sedi
CREATE TABLE `sedi` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `nome` varchar(255) NOT NULL,
  `indirizzo` varchar(255) DEFAULT NULL,
  `citta` varchar(255) DEFAULT NULL,
  `provincia` varchar(255) DEFAULT NULL,
  `cap` varchar(20) DEFAULT NULL,
  `lat` double DEFAULT NULL,
  `lng` double DEFAULT NULL,
  `telefono` varchar(50) DEFAULT NULL,
  `email` varchar(255) DEFAULT NULL,
  `attiva` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_sedi_nome` (`nome`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Table: blocco_orario
CREATE TABLE `blocco_orario` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `data` date NOT NULL,
  `ora_fine` time NOT NULL,
  `created_by_type` varchar(32) DEFAULT NULL,
  `created_by_id` bigint DEFAULT NULL,
  `created_by_name` varchar(255) DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  `ora_inizio` time NOT NULL,
  `medico_id` bigint NOT NULL,
  `sede_id` bigint DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_blo_medico` (`medico_id`),
  KEY `idx_blo_sede` (`sede_id`),
  CONSTRAINT `fk_blo_medico` FOREIGN KEY (`medico_id`) REFERENCES `medici` (`id`),
  CONSTRAINT `fk_blo_sede` FOREIGN KEY (`sede_id`) REFERENCES `sedi` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Table: slot
CREATE TABLE `slot` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `medico_id` bigint NOT NULL,
  `blocco_orario_id` bigint NOT NULL,
  `data_ora_inizio` datetime NOT NULL,
  `data_ora_fine` datetime NOT NULL,
  `stato` varchar(20) NOT NULL DEFAULT 'DISPONIBILE',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_slot_medico_start` (`medico_id`,`data_ora_inizio`),
  KEY `idx_slot_blocco` (`blocco_orario_id`),
  KEY `idx_slot_medico_date` (`medico_id`,`data_ora_inizio`),
  CONSTRAINT `fk_slot_blocco` FOREIGN KEY (`blocco_orario_id`) REFERENCES `blocco_orario` (`id`),
  CONSTRAINT `fk_slot_medico` FOREIGN KEY (`medico_id`) REFERENCES `medici` (`id`),
  CONSTRAINT `chk_slot_times` CHECK ((`data_ora_fine` > `data_ora_inizio`))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Table: appuntamenti
CREATE TABLE `appuntamenti` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `paziente_id` bigint NOT NULL,
  `data_e_ora_inizio` datetime NOT NULL,
  `data_e_ora_fine` datetime NOT NULL,
  `tipo_appuntamento` enum('virtuale','fisico') NOT NULL,
  `link_videocall` varchar(255) DEFAULT NULL,
  `stato` enum('CONFERMATO','COMPLETATO','ANNULLATO') NOT NULL DEFAULT 'CONFERMATO',
  `data_prenotazione` datetime NOT NULL,
  `reminder_inviato` bit(1) NOT NULL,
  `sms_reminder_inviato` bit(1) NOT NULL,
  `feedback_inviato` bit(1) NOT NULL,
  `medico_id` bigint NOT NULL,
  `prestazione_id` bigint NOT NULL,
  `slot_id` bigint DEFAULT NULL,
  `privacy_consenso` tinyint(1) NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_app_slot_active` (((case when (`stato` = 'CONFERMATO') then `slot_id` else NULL end))),
  KEY `idx_app_paziente` (`paziente_id`),
  KEY `idx_app_medico` (`medico_id`),
  KEY `idx_app_prestazione` (`prestazione_id`),
  KEY `idx_app_slot_id` (`slot_id`),
  CONSTRAINT `fk_app_paziente` FOREIGN KEY (`paziente_id`) REFERENCES `pazienti` (`id`),
  CONSTRAINT `fk_app_slot` FOREIGN KEY (`slot_id`) REFERENCES `slot` (`id`),
  CONSTRAINT `fk_app_prestazione` FOREIGN KEY (`prestazione_id`) REFERENCES `prestazioni` (`id`),
  CONSTRAINT `fk_app_medico` FOREIGN KEY (`medico_id`) REFERENCES `medici` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Table: appuntamento_documenti
CREATE TABLE `appuntamento_documenti` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `appuntamento_id` bigint NOT NULL,
  `file_name` varchar(255) NOT NULL,
  `original_name` varchar(255) NOT NULL,
  `mime_type` varchar(100) DEFAULT NULL,
  `file_size` bigint DEFAULT NULL,
  `uploader_role` varchar(20) NOT NULL,
  `uploaded_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_doc_app` (`appuntamento_id`),
  CONSTRAINT `fk_doc_app` FOREIGN KEY (`appuntamento_id`) REFERENCES `appuntamenti` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Table: collaboratori
CREATE TABLE `collaboratori` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `nome` varchar(255) NOT NULL,
  `cognome` varchar(255) NOT NULL,
  `email` varchar(255) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `telefono` varchar(255) DEFAULT NULL,
  `medico_id` bigint NOT NULL,
  `ruolo` varchar(255) DEFAULT 'ROLE_COLLABORATORE',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_collaboratori_email` (`email`),
  KEY `idx_collaboratori_medico` (`medico_id`),
  CONSTRAINT `fk_collaboratore_medico` FOREIGN KEY (`medico_id`) REFERENCES `medici` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Table: collaboratori_medici (join M:N)
CREATE TABLE `collaboratori_medici` (
  `collaboratore_id` bigint NOT NULL,
  `medico_id` bigint NOT NULL,
  `ruolo_relazione` varchar(64) DEFAULT 'COLLABORATORE',
  PRIMARY KEY (`collaboratore_id`,`medico_id`),
  KEY `idx_cm_medico` (`medico_id`),
  CONSTRAINT `fk_cm_collaboratore` FOREIGN KEY (`collaboratore_id`) REFERENCES `collaboratori` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_cm_medico` FOREIGN KEY (`medico_id`) REFERENCES `medici` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Table: medici_prestazioni (join)
CREATE TABLE `medici_prestazioni` (
  `medico_id` bigint NOT NULL,
  `prestazione_id` bigint NOT NULL,
  PRIMARY KEY (`medico_id`,`prestazione_id`),
  KEY `idx_mp_prestazione` (`prestazione_id`),
  CONSTRAINT `fk_mp_medico` FOREIGN KEY (`medico_id`) REFERENCES `medici` (`id`),
  CONSTRAINT `fk_mp_prestazione` FOREIGN KEY (`prestazione_id`) REFERENCES `prestazioni` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Table: medico_sede (join)
CREATE TABLE `medico_sede` (
  `medico_id` bigint NOT NULL,
  `sede_id` bigint NOT NULL,
  `attiva` tinyint(1) NOT NULL DEFAULT '1',
  PRIMARY KEY (`medico_id`,`sede_id`),
  KEY `idx_ms_sede` (`sede_id`),
  CONSTRAINT `fk_ms_medico` FOREIGN KEY (`medico_id`) REFERENCES `medici` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_ms_sede` FOREIGN KEY (`sede_id`) REFERENCES `sedi` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Table: feedback
CREATE TABLE `feedback` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `appuntamento_id` bigint NOT NULL,
  `valutazione` int DEFAULT NULL,
  `commento` longtext,
  `data_feedback` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_feedback_appuntamento` (`appuntamento_id`),
  CONSTRAINT `fk_feedback_app` FOREIGN KEY (`appuntamento_id`) REFERENCES `appuntamenti` (`id`),
  CONSTRAINT `feedback_chk_1` CHECK ((`valutazione` >= 1 and `valutazione` <= 5))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Table: password_reset_tokens
CREATE TABLE `password_reset_tokens` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `token` varchar(100) NOT NULL,
  `email` varchar(255) NOT NULL,
  `user_type` varchar(20) NOT NULL,
  `expires_at` timestamp NOT NULL,
  `used` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `opened` tinyint(1) NOT NULL DEFAULT '0',
  `opened_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_prt_token` (`token`),
  KEY `idx_prt_email` (`email`),
  KEY `idx_prt_token` (`token`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Table: admins
CREATE TABLE `admins` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `nome` varchar(255) DEFAULT NULL,
  `cognome` varchar(255) DEFAULT NULL,
  `email` varchar(255) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `ruolo` varchar(64) DEFAULT 'ROLE_ADMIN',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_admins_email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
