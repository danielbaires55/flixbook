CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    token VARCHAR(100) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL,
    user_type VARCHAR(20) NOT NULL, -- 'PAZIENTE' | 'MEDICO' | 'COLLABORATORE'
    expires_at TIMESTAMP NOT NULL,
    used BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_prt_email (email),
    INDEX idx_prt_token (token)
);
