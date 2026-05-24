import { sql } from '@vercel/postgres';

export { sql };

export type Trend = {
  id: number;
  title: string;
  summary: string | null;
  source_url: string | null;
  score: number | null;
  created_at: string;
  manual_rating: number | null;
  image_url: string | null;
};

export type Draft = {
  id: number;
  trend_id: number;
  content: string;
  created_at: string;
  trend_title?: string;
};

export type Target = {
  id: number;
  type: 'twitter' | 'website';
  value: string;
  active: boolean;
  created_at: string;
};

export type GitHubIntelligence = {
  id: number;
  name: string;
  stars: number | null;
  description: string | null;
  language: string | null;
  url: string | null;
  is_ai_dev: boolean | null;
  period: 'weekly' | 'monthly';
  marketing_angle: string | null;
  scraped_at: string;
};

export type ContentVault = {
  id: number;
  source_id: string;
  content_type: 'linkedin' | 'ig_carousel' | 'blog';
  title: string;
  generated_content: unknown;
  status: 'draft' | 'published';
  created_at: string;
};

export type RedditIntelligence = {
  id: number;
  post_id: string;
  subreddit: string;
  title: string;
  description: string | null;
  score: number | null;
  num_comments: number | null;
  permalink: string | null;
  url: string | null;
  scraped_at: string;
};

export type TrendAnalysis = {
  why_now: string;
  who_cares: string;
  recommended_move: string;
  content_angle: string;
};

export type UnifiedSignal = Trend & {
  signal_type?: 'github' | 'reddit' | 'scraped';
  source_id?: string | null;
  // GitHub extras
  repo_name?: string | null;
  stars?: number | null;
  forks?: number | null;
  language?: string | null;
  // Reddit extras
  subreddit?: string | null;
  upvotes?: number | null;
  num_comments?: number | null;
  // AI analysis
  analysis?: TrendAnalysis | null;
  // Content vault lifecycle
  asset_status?: 'draft' | 'published' | null;
  vault_asset_id?: number | null;
};

export async function initSchema() {
  await sql`
    CREATE TABLE IF NOT EXISTS trends (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      summary TEXT,
      source_url TEXT UNIQUE,
      score INTEGER,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      manual_rating INTEGER,
      image_url TEXT
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS drafts (
      id SERIAL PRIMARY KEY,
      trend_id INTEGER REFERENCES trends(id) ON DELETE CASCADE,
      content TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS targets (
      id SERIAL PRIMARY KEY,
      type TEXT NOT NULL CHECK (type IN ('twitter', 'website')),
      value TEXT NOT NULL UNIQUE,
      active BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;
  await sql`
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
    )
  `;
  // Drop orphaned sequence if it exists without an owning table (from a partial previous run)
  try {
    await sql`DROP SEQUENCE IF EXISTS content_vault_id_seq`;
  } catch {
    // Sequence is owned by an existing table — IF NOT EXISTS below will no-op safely
  }
  await sql`
    CREATE TABLE IF NOT EXISTS content_vault (
      id SERIAL PRIMARY KEY,
      source_id TEXT NOT NULL,
      content_type TEXT NOT NULL CHECK (content_type IN ('linkedin', 'ig_carousel', 'blog')),
      title TEXT NOT NULL,
      generated_content JSONB NOT NULL,
      status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS reddit_intelligence (
      id SERIAL PRIMARY KEY,
      post_id TEXT NOT NULL UNIQUE,
      subreddit TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      score INTEGER,
      num_comments INTEGER,
      permalink TEXT,
      url TEXT,
      scraped_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;
  // Migration 006: add structured AI analysis column to intelligence tables
  try {
    await sql`ALTER TABLE github_intelligence ADD COLUMN IF NOT EXISTS analysis JSONB`;
    await sql`ALTER TABLE reddit_intelligence ADD COLUMN IF NOT EXISTS analysis JSONB`;
  } catch {
    // Columns already exist on this deployment — safe to ignore
  }
}
