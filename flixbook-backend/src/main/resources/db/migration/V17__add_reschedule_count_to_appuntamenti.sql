-- Add reschedule counter to track patient-initiated reschedules
ALTER TABLE appuntamenti
ADD COLUMN IF NOT EXISTS reschedule_count INT NOT NULL DEFAULT 0;
