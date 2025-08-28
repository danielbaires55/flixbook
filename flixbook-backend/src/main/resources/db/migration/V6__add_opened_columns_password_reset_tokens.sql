-- Add opened and opened_at columns to support invalidation on first open (MySQL)
-- MySQL 8 doesn't support IF NOT EXISTS for ADD COLUMN in all versions used with Flyway validation.
-- Use conditional ALTERs guarded by information_schema checks.

SET @col_exists := (SELECT COUNT(*) FROM information_schema.COLUMNS 
                                        WHERE TABLE_SCHEMA = DATABASE() 
                                            AND TABLE_NAME = 'password_reset_tokens' 
                                            AND COLUMN_NAME = 'opened');
SET @sql := IF(@col_exists = 0, 'ALTER TABLE password_reset_tokens ADD COLUMN opened TINYINT(1) NOT NULL DEFAULT 0', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col2_exists := (SELECT COUNT(*) FROM information_schema.COLUMNS 
                                        WHERE TABLE_SCHEMA = DATABASE() 
                                            AND TABLE_NAME = 'password_reset_tokens' 
                                            AND COLUMN_NAME = 'opened_at');
SET @sql2 := IF(@col2_exists = 0, 'ALTER TABLE password_reset_tokens ADD COLUMN opened_at DATETIME NULL', 'SELECT 1');
PREPARE stmt2 FROM @sql2; EXECUTE stmt2; DEALLOCATE PREPARE stmt2;
