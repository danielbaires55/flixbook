-- Relax unique constraint on appuntamenti.slot_id to allow re-booking after cancel/completion
-- Strategy: drop any existing unique index on slot_id, then create a unique functional index
-- that applies only when stato='CONFERMATO'.
-- MySQL 8.0+ required for expression indexes.

SET @uniq_idx := (
	SELECT INDEX_NAME FROM information_schema.statistics
	WHERE table_schema = DATABASE()
		AND table_name = 'appuntamenti'
		AND column_name = 'slot_id'
		AND non_unique = 0
	LIMIT 1
);

-- 1.a) Drop whatever FK references appuntamenti.slot_id (name-agnostic)
SET @fk_name := (
		SELECT CONSTRAINT_NAME
		FROM information_schema.KEY_COLUMN_USAGE
		WHERE table_schema = DATABASE()
			AND table_name = 'appuntamenti'
			AND column_name = 'slot_id'
			AND referenced_table_name = 'slot'
		LIMIT 1
);
SET @sql := IF(@uniq_idx IS NOT NULL AND @fk_name IS NOT NULL,
		CONCAT('ALTER TABLE appuntamenti DROP FOREIGN KEY ', @fk_name),
		'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 1.b) Drop the unique index on slot_id if present
SET @sql := IF(@uniq_idx IS NOT NULL, CONCAT('DROP INDEX ', @uniq_idx, ' ON appuntamenti'), 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 1.c) Ensure a non-unique index exists on slot_id (for FK performance)
SET @has_nonuniq := (
	SELECT COUNT(*) FROM information_schema.statistics
	WHERE table_schema = DATABASE()
		AND table_name = 'appuntamenti'
		AND column_name = 'slot_id'
		AND non_unique = 1
);
SET @sql := IF(@has_nonuniq = 0, 'CREATE INDEX idx_app_slot_id ON appuntamenti(slot_id)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 1.d) Re-add an FK on slot_id -> slot(id) if absent
SET @fk_exists := (
		SELECT COUNT(*) FROM information_schema.KEY_COLUMN_USAGE
		WHERE table_schema = DATABASE()
			AND table_name = 'appuntamenti'
			AND column_name = 'slot_id'
			AND referenced_table_name = 'slot'
);
SET @sql := IF(@fk_exists = 0,
		'ALTER TABLE appuntamenti ADD CONSTRAINT fk_app_slot FOREIGN KEY (slot_id) REFERENCES slot(id)',
		'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 2) Drop existing functional index if present (idempotence)
SET @has_fun := (
	SELECT COUNT(*) FROM information_schema.statistics
	WHERE table_schema = DATABASE()
		AND table_name = 'appuntamenti'
		AND index_name = 'uq_app_slot_active'
);
SET @sql := IF(@has_fun > 0, 'DROP INDEX uq_app_slot_active ON appuntamenti', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 3) Create functional unique index only if absent
SET @has_fun2 := (
	SELECT COUNT(*) FROM information_schema.statistics
	WHERE table_schema = DATABASE()
		AND table_name = 'appuntamenti'
		AND index_name = 'uq_app_slot_active'
);
SET @sql := IF(@has_fun2 = 0,
	'CREATE UNIQUE INDEX uq_app_slot_active ON appuntamenti ((CASE WHEN stato = ''CONFERMATO'' THEN slot_id ELSE NULL END))',
	'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
