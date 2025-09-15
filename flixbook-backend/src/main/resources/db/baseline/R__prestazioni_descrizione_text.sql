-- Repeatable migration: enlarge prestazioni.descrizione to TEXT
-- Runs idempotently only if column is VARCHAR or not TEXT already

SET @col_type := (
  SELECT DATA_TYPE FROM information_schema.columns
  WHERE table_schema = DATABASE() AND table_name = 'prestazioni' AND column_name = 'descrizione'
);

SET @sql := IF(@col_type IS NOT NULL AND @col_type <> 'text',
  'ALTER TABLE prestazioni MODIFY COLUMN descrizione TEXT NULL',
  'DO 0'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
