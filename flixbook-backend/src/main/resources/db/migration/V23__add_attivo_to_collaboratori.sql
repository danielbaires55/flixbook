-- Aggiunge colonna 'attivo' ai collaboratori per abilitare/disabilitare accesso
ALTER TABLE collaboratori
    ADD COLUMN attivo TINYINT(1) NOT NULL DEFAULT 1 AFTER telefono;

-- (Opzionale) In futuro si potranno aggiungere colonne simili per medici/pazienti se serve la stessa funzionalità