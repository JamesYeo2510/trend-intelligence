CREATE TABLE IF NOT EXISTS content_vault (
    id SERIAL PRIMARY KEY,
    source_id TEXT NOT NULL,
    content_type TEXT NOT NULL CHECK (content_type IN ('linkedin', 'ig_carousel', 'blog')),
    title TEXT NOT NULL,
    generated_content JSONB NOT NULL,
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);
