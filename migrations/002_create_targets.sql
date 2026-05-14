CREATE TABLE IF NOT EXISTS targets (
    id SERIAL PRIMARY KEY,
    type TEXT NOT NULL CHECK (type IN ('twitter', 'website')),
    value TEXT NOT NULL UNIQUE,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
