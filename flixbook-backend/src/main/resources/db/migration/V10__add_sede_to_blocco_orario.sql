-- V10: Add sede_id to blocco_orario (idempotent), backfill to 'Sede Principale'

-- Add column if missing
ALTER TABLE blocco_orario
    ADD COLUMN IF NOT EXISTS sede_id BIGINT NULL;

-- Backfill sede_id to 'Sede Principale'
UPDATE blocco_orario bo
JOIN (SELECT id FROM sedi WHERE nome = 'Sede Principale' LIMIT 1) s ON 1=1
SET bo.sede_id = COALESCE(bo.sede_id, s.id);

-- Add index if missing (MySQL-safe)
SET @idx_exists := (
    SELECT COUNT(1) FROM information_schema.statistics 
    WHERE table_schema = DATABASE() AND table_name = 'blocco_orario' AND index_name = 'idx_blo_sede'
);
SET @sql_idx := IF(@idx_exists = 0, 'ALTER TABLE blocco_orario ADD INDEX idx_blo_sede (sede_id)', 'SELECT 1');
PREPARE stmt_idx FROM @sql_idx; EXECUTE stmt_idx; DEALLOCATE PREPARE stmt_idx;

-- Add FK if missing (MySQL-safe)
SET @fk_exists := (
    SELECT COUNT(1) FROM information_schema.table_constraints 
    WHERE table_schema = DATABASE() AND table_name = 'blocco_orario' 
        AND constraint_type = 'FOREIGN KEY' AND constraint_name = 'fk_blo_sede'
);
SET @sql_fk := IF(@fk_exists = 0, 'ALTER TABLE blocco_orario ADD CONSTRAINT fk_blo_sede FOREIGN KEY (sede_id) REFERENCES sedi(id)', 'SELECT 1');
PREPARE stmt_fk FROM @sql_fk; EXECUTE stmt_fk; DEALLOCATE PREPARE stmt_fk;
