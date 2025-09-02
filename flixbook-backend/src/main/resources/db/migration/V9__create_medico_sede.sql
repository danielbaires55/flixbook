-- V9: Create pivot 'medico_sede' (idempotent)
CREATE TABLE IF NOT EXISTS medico_sede (
    medico_id BIGINT NOT NULL,
    sede_id BIGINT NOT NULL,
    attiva TINYINT(1) NOT NULL DEFAULT 1,
    PRIMARY KEY (medico_id, sede_id),
    CONSTRAINT fk_ms_medico FOREIGN KEY (medico_id) REFERENCES medici(id) ON DELETE RESTRICT,
    CONSTRAINT fk_ms_sede FOREIGN KEY (sede_id) REFERENCES sedi(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Backfill: associate all existing medici to 'Sede Principale'
INSERT IGNORE INTO medico_sede (medico_id, sede_id, attiva)
SELECT m.id, s.id, 1
FROM medici m CROSS JOIN (SELECT id FROM sedi WHERE nome = 'Sede Principale' LIMIT 1) s;
