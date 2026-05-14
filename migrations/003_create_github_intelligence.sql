CREATE TABLE IF NOT EXISTS github_intelligence (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    stars INTEGER,
    description TEXT,
    language TEXT,
    url TEXT,
    is_ai_dev BOOLEAN,
    period TEXT CHECK (period IN ('weekly', 'monthly')),
    marketing_angle TEXT,
    scraped_at TIMESTAMPTZ DEFAULT NOW()
);
