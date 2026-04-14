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
}
