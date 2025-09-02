-- Repeatable migration to ensure reschedule_count exists
-- MySQL 8 may not support IF NOT EXISTS for ADD COLUMN in all versions.
-- Use information_schema check + dynamic SQL to add the column only if missing.

SET @col_exists := (
  SELECT COUNT(*)
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'appuntamenti'
    AND column_name = 'reschedule_count'
);

SET @sql := IF(@col_exists = 0,
  'ALTER TABLE appuntamenti ADD COLUMN reschedule_count INT NOT NULL DEFAULT 0',
  'SELECT 1'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
