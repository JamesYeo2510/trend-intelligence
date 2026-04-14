CREATE TABLE IF NOT EXISTS trends (
    id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    summary TEXT,
    source_url TEXT UNIQUE,
    score INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    manual_rating INTEGER
);
