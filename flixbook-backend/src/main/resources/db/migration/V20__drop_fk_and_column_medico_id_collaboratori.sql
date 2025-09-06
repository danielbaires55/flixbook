-- V20: Rimozione definitiva della colonna legacy medico_id da collaboratori
-- Copia delle associazioni nella join table avvenuta in V4.
-- V19 tentava un DROP diretto ma fallisce se il vincolo FK esiste ancora.

-- 1) Drop foreign key constraint se esiste (nome da V1 baseline)
ALTER TABLE collaboratori DROP FOREIGN KEY fk_collaboratore_medico;

-- 2) Drop indice associato (se non già rimosso)
ALTER TABLE collaboratori DROP INDEX idx_collaboratori_medico;

-- 3) Drop colonna legacy
ALTER TABLE collaboratori DROP COLUMN medico_id;

-- Nota: se uno di questi passi fallisce perché già applicato manualmente, 
-- si può creare una migrazione successiva con controlli conditional oppure eseguire manualmente.