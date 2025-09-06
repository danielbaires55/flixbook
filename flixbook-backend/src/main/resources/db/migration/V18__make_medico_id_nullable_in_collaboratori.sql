-- Rende nullable la colonna medico_id nella tabella collaboratori per supportare relazione many-to-many opzionale
ALTER TABLE collaboratori MODIFY medico_id BIGINT NULL;