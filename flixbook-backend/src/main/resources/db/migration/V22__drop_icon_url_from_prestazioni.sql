-- Rimuove la colonna icon_url dalla tabella prestazioni (le icone sono solo per le specialità)
ALTER TABLE prestazioni DROP COLUMN IF EXISTS icon_url;