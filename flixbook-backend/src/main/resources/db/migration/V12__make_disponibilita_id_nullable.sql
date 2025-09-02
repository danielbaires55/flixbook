-- V12: Make legacy appuntamenti.disponibilita_id nullable (idempotent, MySQL-safe)
-- Some environments still have a NOT NULL disponibilita_id on appuntamenti from an older model.
-- Our current domain no longer sets this value; make it nullable to avoid insert failures.

-- Determine if the column exists and is NOT NULL
SET @need_change := (
  SELECT CASE WHEN COUNT(*) > 0 THEN (
    SELECT CASE WHEN is_nullable = 'NO' THEN 1 ELSE 0 END
    FROM information_schema.columns
    WHERE table_schema = DATABASE()
      AND table_name = 'appuntamenti'
      AND column_name = 'disponibilita_id'
    LIMIT 1
  ) ELSE 0 END
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'appuntamenti'
    AND column_name = 'disponibilita_id'
);

SET @sql := IF(@need_change = 1,
  'ALTER TABLE appuntamenti MODIFY COLUMN disponibilita_id BIGINT NULL',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
