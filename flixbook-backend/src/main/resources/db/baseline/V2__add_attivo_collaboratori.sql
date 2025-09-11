-- Versioned migration: add 'attivo' flag to collaboratori
-- Eseguita una sola volta dopo baseline V1
ALTER TABLE collaboratori
  ADD COLUMN attivo TINYINT(1) NOT NULL DEFAULT 1 AFTER telefono;
