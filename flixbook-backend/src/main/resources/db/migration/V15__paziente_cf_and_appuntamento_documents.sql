-- V15: Add codice_fiscale to pazienti; add privacy_consenso to appuntamenti; create appuntamento_documenti table

-- Add codice_fiscale to pazienti (nullable for backward compatibility), length 16 typical CF
ALTER TABLE pazienti 
  ADD COLUMN codice_fiscale VARCHAR(32) NULL;

CREATE INDEX idx_pazienti_cf ON pazienti (codice_fiscale);

-- Add privacy_consenso flag to appuntamenti (default 0)
ALTER TABLE appuntamenti 
  ADD COLUMN privacy_consenso TINYINT(1) NOT NULL DEFAULT 0;

-- Create table for appointment documents
CREATE TABLE IF NOT EXISTS appuntamento_documenti (
  id BIGINT NOT NULL AUTO_INCREMENT,
  appuntamento_id BIGINT NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  original_name VARCHAR(255) NOT NULL,
  mime_type VARCHAR(100) NULL,
  file_size BIGINT NULL,
  uploader_role VARCHAR(20) NOT NULL,
  uploaded_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_doc_app (appuntamento_id),
  CONSTRAINT fk_doc_app FOREIGN KEY (appuntamento_id) REFERENCES appuntamenti(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
