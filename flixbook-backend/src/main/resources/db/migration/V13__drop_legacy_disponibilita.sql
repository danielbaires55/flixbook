-- V13: Drop legacy disponibilita artifacts if present (idempotent, MySQL-safe)

-- 1) Drop FK from appuntamenti to disponibilita if it exists (name may vary, so scan information_schema)
SET @fk_name := (
  SELECT constraint_name FROM information_schema.key_column_usage
  WHERE table_schema = DATABASE() AND table_name = 'appuntamenti' AND column_name = 'disponibilita_id'
  AND referenced_table_name IS NOT NULL
  LIMIT 1
);
SET @sql_drop_fk := IF(@fk_name IS NOT NULL, CONCAT('ALTER TABLE appuntamenti DROP FOREIGN KEY ', @fk_name), 'SELECT 1');
PREPARE stmt FROM @sql_drop_fk; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 2) Drop index on disponibilita_id if exists
SET @idx_name := (
  SELECT index_name FROM information_schema.statistics
  WHERE table_schema = DATABASE() AND table_name = 'appuntamenti' AND column_name = 'disponibilita_id'
  LIMIT 1
);
SET @sql_drop_idx := IF(@idx_name IS NOT NULL, CONCAT('ALTER TABLE appuntamenti DROP INDEX ', @idx_name), 'SELECT 1');
PREPARE stmt FROM @sql_drop_idx; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 3) Drop column disponibilita_id if exists
SET @has_col := (
  SELECT COUNT(*) FROM information_schema.columns
  WHERE table_schema = DATABASE() AND table_name = 'appuntamenti' AND column_name = 'disponibilita_id'
);
SET @sql_drop_col := IF(@has_col > 0, 'ALTER TABLE appuntamenti DROP COLUMN disponibilita_id', 'SELECT 1');
PREPARE stmt FROM @sql_drop_col; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 4) Drop table disponibilita if exists
SET @has_tbl := (
  SELECT COUNT(*) FROM information_schema.tables
  WHERE table_schema = DATABASE() AND table_name = 'disponibilita'
);
SET @sql_drop_tbl := IF(@has_tbl > 0, 'DROP TABLE disponibilita', 'SELECT 1');
PREPARE stmt FROM @sql_drop_tbl; EXECUTE stmt; DEALLOCATE PREPARE stmt;
