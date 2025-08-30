-- Create join table for allowed prestazioni per blocco_orario
-- Idempotent MySQL-safe DDL

CREATE TABLE IF NOT EXISTS blocco_orario_prestazioni (
  blocco_orario_id BIGINT NOT NULL,
  prestazione_id BIGINT NOT NULL,
  PRIMARY KEY (blocco_orario_id, prestazione_id),
  CONSTRAINT fk_bop_blocco FOREIGN KEY (blocco_orario_id) REFERENCES blocco_orario(id) ON DELETE CASCADE,
  CONSTRAINT fk_bop_prestazione FOREIGN KEY (prestazione_id) REFERENCES prestazioni(id) ON DELETE RESTRICT
);

-- Create index if not exists using dynamic SQL for MySQL
SET @idx_exists := (
  SELECT COUNT(1) FROM information_schema.statistics 
  WHERE table_schema = DATABASE() 
    AND table_name = 'blocco_orario_prestazioni' 
    AND index_name = 'idx_bop_prestazione');
SET @sql := IF(@idx_exists = 0,
  'CREATE INDEX idx_bop_prestazione ON blocco_orario_prestazioni(prestazione_id)',
  'DO 0');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
