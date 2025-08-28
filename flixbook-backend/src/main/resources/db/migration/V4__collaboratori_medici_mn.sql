-- Create M:N association between collaboratori and medici
-- 1) Create join table collaboratori_medici if not exists
-- 2) Backfill from legacy column collaboratori.medico_id (do not drop it yet)

-- 1) Create join table
CREATE TABLE IF NOT EXISTS collaboratori_medici (
    collaboratore_id BIGINT NOT NULL,
    medico_id BIGINT NOT NULL,
    ruolo_relazione VARCHAR(64) DEFAULT 'COLLABORATORE',
    PRIMARY KEY (collaboratore_id, medico_id),
    CONSTRAINT fk_cm_collaboratore FOREIGN KEY (collaboratore_id) REFERENCES collaboratori(id) ON DELETE RESTRICT,
    CONSTRAINT fk_cm_medico       FOREIGN KEY (medico_id)       REFERENCES medici(id)        ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 2) Backfill existing pairs from 1:1 column (idempotent)
-- Insert only rows that are not already present
INSERT IGNORE INTO collaboratori_medici (collaboratore_id, medico_id)
SELECT c.id, c.medico_id
FROM collaboratori c
WHERE c.medico_id IS NOT NULL;

-- Note: We intentionally keep the legacy column collaboratori.medico_id for now
-- to avoid breaking existing code. A later migration can drop it after the
-- application is updated to use the join exclusively.
