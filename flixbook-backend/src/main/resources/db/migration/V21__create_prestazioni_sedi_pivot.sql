-- Crea tabella pivot per costo per sede delle prestazioni
CREATE TABLE IF NOT EXISTS prestazioni_sedi (
    prestazione_id BIGINT NOT NULL,
    sede_id BIGINT NOT NULL,
    costo DOUBLE NOT NULL,
    PRIMARY KEY (prestazione_id, sede_id),
    CONSTRAINT fk_prestazioni_sedi_prestazione FOREIGN KEY (prestazione_id) REFERENCES prestazioni(id) ON DELETE CASCADE,
    CONSTRAINT fk_prestazioni_sedi_sede FOREIGN KEY (sede_id) REFERENCES sedi(id) ON DELETE CASCADE
);

-- Indice di supporto eventuali query per sede
CREATE INDEX IF NOT EXISTS idx_prestazioni_sedi_sede ON prestazioni_sedi(sede_id);