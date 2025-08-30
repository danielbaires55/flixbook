-- V8: Create table 'sedi' (idempotent) and seed 'Sede Principale'
CREATE TABLE IF NOT EXISTS sedi (
    id BIGINT NOT NULL AUTO_INCREMENT,
    nome VARCHAR(255) NOT NULL,
    indirizzo VARCHAR(255) NULL,
    citta VARCHAR(255) NULL,
    provincia VARCHAR(255) NULL,
    cap VARCHAR(20) NULL,
    lat DOUBLE NULL,
    lng DOUBLE NULL,
    telefono VARCHAR(50) NULL,
    email VARCHAR(255) NULL,
    attiva TINYINT(1) NOT NULL DEFAULT 1,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_sedi_nome (nome)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Seed default 'Sede Principale' if not exists
INSERT INTO sedi (nome, indirizzo, citta, provincia, cap, attiva)
SELECT 'Sede Principale', 'Via del Benessere, 10', 'Milano', 'MI', '20121', 1
WHERE NOT EXISTS (SELECT 1 FROM sedi WHERE nome = 'Sede Principale');
