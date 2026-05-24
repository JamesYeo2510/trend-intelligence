ALTER TABLE github_intelligence
  ADD COLUMN IF NOT EXISTS analysis JSONB;

ALTER TABLE reddit_intelligence
  ADD COLUMN IF NOT EXISTS analysis JSONB;
