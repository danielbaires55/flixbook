-- V7: Add attribution fields to blocco_orario (idempotent for MySQL)
-- Columns: created_by_type (varchar), created_by_id (bigint), created_by_name (varchar), created_at (datetime)

-- created_by_type
SET @col_exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'blocco_orario' AND COLUMN_NAME = 'created_by_type'
);
SET @sql := IF(@col_exists = 0,
  'ALTER TABLE blocco_orario ADD COLUMN created_by_type VARCHAR(32) NULL AFTER ora_fine',
  'DO 0');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- created_by_id
SET @col_exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'blocco_orario' AND COLUMN_NAME = 'created_by_id'
);
SET @sql := IF(@col_exists = 0,
  'ALTER TABLE blocco_orario ADD COLUMN created_by_id BIGINT NULL AFTER created_by_type',
  'DO 0');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- created_by_name
SET @col_exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'blocco_orario' AND COLUMN_NAME = 'created_by_name'
);
SET @sql := IF(@col_exists = 0,
  'ALTER TABLE blocco_orario ADD COLUMN created_by_name VARCHAR(255) NULL AFTER created_by_id',
  'DO 0');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- created_at
SET @col_exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'blocco_orario' AND COLUMN_NAME = 'created_at'
);
SET @sql := IF(@col_exists = 0,
  'ALTER TABLE blocco_orario ADD COLUMN created_at DATETIME NULL AFTER created_by_name',
  'DO 0');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
