-- V11: Ensure blocco_orario.sede_id exists with FK and index (idempotent, MySQL-safe)

-- 1) Add sede_id column if missing
SET @col_exists := (
  SELECT COUNT(1) FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'blocco_orario'
    AND column_name = 'sede_id'
);
SET @sql_add_col := IF(@col_exists = 0,
  'ALTER TABLE blocco_orario ADD COLUMN sede_id BIGINT NULL',
  'SELECT 1'
);
PREPARE stmt_add_col FROM @sql_add_col; EXECUTE stmt_add_col; DEALLOCATE PREPARE stmt_add_col;

-- 2) Backfill sede_id to "Sede Principale" when NULL
UPDATE blocco_orario bo
JOIN (SELECT id FROM sedi WHERE nome = 'Sede Principale' LIMIT 1) s ON 1=1
SET bo.sede_id = COALESCE(bo.sede_id, s.id);

-- 3) Add index if missing
SET @idx_exists := (
  SELECT COUNT(1) FROM information_schema.statistics 
  WHERE table_schema = DATABASE() AND table_name = 'blocco_orario' AND index_name = 'idx_blo_sede'
);
SET @sql_idx := IF(@idx_exists = 0, 'ALTER TABLE blocco_orario ADD INDEX idx_blo_sede (sede_id)', 'SELECT 1');
PREPARE stmt_idx FROM @sql_idx; EXECUTE stmt_idx; DEALLOCATE PREPARE stmt_idx;

-- 4) Add FK if missing
SET @fk_exists := (
  SELECT COUNT(1) FROM information_schema.table_constraints 
  WHERE table_schema = DATABASE() AND table_name = 'blocco_orario' 
    AND constraint_type = 'FOREIGN KEY' AND constraint_name = 'fk_blo_sede'
);
SET @sql_fk := IF(@fk_exists = 0, 'ALTER TABLE blocco_orario ADD CONSTRAINT fk_blo_sede FOREIGN KEY (sede_id) REFERENCES sedi(id)', 'SELECT 1');
PREPARE stmt_fk FROM @sql_fk; EXECUTE stmt_fk; DEALLOCATE PREPARE stmt_fk;
