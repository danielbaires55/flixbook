-- Create table slot (30-minute slots)
CREATE TABLE IF NOT EXISTS slot (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  medico_id BIGINT NOT NULL,
  blocco_orario_id BIGINT NOT NULL,
  data_ora_inizio DATETIME NOT NULL,
  data_ora_fine DATETIME NOT NULL,
  stato VARCHAR(20) NOT NULL DEFAULT 'DISPONIBILE',
  CONSTRAINT fk_slot_medico FOREIGN KEY (medico_id) REFERENCES medici(id),
  CONSTRAINT fk_slot_blocco FOREIGN KEY (blocco_orario_id) REFERENCES blocco_orario(id),
  CONSTRAINT chk_slot_times CHECK (data_ora_fine > data_ora_inizio)
);

-- Unique to avoid duplicates per medico per orario
CREATE UNIQUE INDEX IF NOT EXISTS uq_slot_medico_start ON slot(medico_id, data_ora_inizio);
CREATE INDEX IF NOT EXISTS idx_slot_blocco ON slot(blocco_orario_id);
CREATE INDEX IF NOT EXISTS idx_slot_medico_date ON slot(medico_id, data_ora_inizio);

-- Appointment to slot (1-1, because prestazioni durano 30 min)
ALTER TABLE appuntamenti 
  ADD COLUMN IF NOT EXISTS slot_id BIGINT UNIQUE,
  ADD CONSTRAINT fk_app_slot FOREIGN KEY (slot_id) REFERENCES slot(id);
