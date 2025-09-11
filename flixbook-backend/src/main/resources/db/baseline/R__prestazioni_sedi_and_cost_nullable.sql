-- Repeatable migration: crea tabella pivot prestazioni_sedi e adatta vincoli prestazioni
-- Esegue solo se cambia questo file (Flyway repeatable).

-- 1) Tabella pivot costi per sede
CREATE TABLE IF NOT EXISTS prestazioni_sedi (
    prestazione_id BIGINT NOT NULL,
    sede_id BIGINT NOT NULL,
    costo DOUBLE NOT NULL,
    PRIMARY KEY (prestazione_id, sede_id),
    CONSTRAINT fk_ps_prestazione FOREIGN KEY (prestazione_id) REFERENCES prestazioni(id) ON DELETE CASCADE,
    CONSTRAINT fk_ps_sede FOREIGN KEY (sede_id) REFERENCES sedi(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 2) Rende il campo costo di prestazioni nullable (ormai dismesso in favore della pivot)
ALTER TABLE prestazioni MODIFY COLUMN costo DOUBLE NULL;

-- 3) Sostituisce unique globale sul nome con unique per (specialita_id, nome)
--   (solo se l'indice vecchio esiste ancora)
SET @idx_exists := (SELECT COUNT(1) FROM information_schema.statistics
    WHERE table_schema = DATABASE() AND table_name = 'prestazioni' AND index_name = 'uq_prestazioni_nome');
SET @sql := IF(@idx_exists > 0, 'ALTER TABLE prestazioni DROP INDEX uq_prestazioni_nome', 'DO 0');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Crea nuovo indice composto se non già presente
SET @idx_new_exists := (SELECT COUNT(1) FROM information_schema.statistics
    WHERE table_schema = DATABASE() AND table_name = 'prestazioni' AND index_name = 'uq_prestazioni_spec_nome');
SET @sql2 := IF(@idx_new_exists = 0, 'CREATE UNIQUE INDEX uq_prestazioni_spec_nome ON prestazioni(specialita_id, nome)', 'DO 0');
PREPARE stmt2 FROM @sql2; EXECUTE stmt2; DEALLOCATE PREPARE stmt2;