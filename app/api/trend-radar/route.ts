import { initSchema, sql } from '@/lib/db'
import type { TrendAnalysis, UnifiedSignal } from '@/lib/db'

export const dynamic = 'force-dynamic'

type RadarRow = {
  signal_type: 'github' | 'reddit'
  source_id: string
  title: string
  summary: string | null
  primary_metric: number | null
  secondary_metric: number | null
  language: string | null
  subreddit: string | null
  source_url: string | null
  marketing_angle: string | null
  is_ai_dev: boolean | null
  created_at: string
  id: number
  analysis: TrendAnalysis | null
  asset_status: 'draft' | 'published' | null
  vault_asset_id: number | null
}

function toUnifiedSignal(row: RadarRow): UnifiedSignal {
  return {
    id: row.id,
    title: row.title,
    summary: row.summary,
    source_url: row.source_url,
    score: null,
    created_at: row.created_at,
    manual_rating: null,
    image_url: null,
    signal_type: row.signal_type,
    source_id: row.source_id,
    repo_name: row.signal_type === 'github' ? row.title : null,
    stars: row.signal_type === 'github' ? row.primary_metric : null,
    forks: null,
    language: row.language,
    subreddit: row.subreddit,
    upvotes: row.signal_type === 'reddit' ? row.primary_metric : null,
    num_comments: row.secondary_metric,
    analysis: row.analysis,
    asset_status: row.asset_status ?? null,
    vault_asset_id: row.vault_asset_id ?? null,
  }
}

export async function GET() {
  try {
    await initSchema()

    const { rows } = await sql<RadarRow>`
      WITH unified_signals AS (
        SELECT
          'github'::text        AS signal_type,
          'github:' || name     AS source_id,
          name                  AS title,
          description           AS summary,
          stars                 AS primary_metric,
          NULL::integer         AS secondary_metric,
          language,
          NULL::text            AS subreddit,
          url                   AS source_url,
          marketing_angle,
          is_ai_dev,
          analysis,
          scraped_at            AS created_at,
          id
        FROM github_intelligence

        UNION ALL

        SELECT
          'reddit'::text            AS signal_type,
          'reddit:' || post_id      AS source_id,
          title,
          description               AS summary,
          score                     AS primary_metric,
          num_comments              AS secondary_metric,
          NULL::text                AS language,
          subreddit,
          url                       AS source_url,
          NULL::text                AS marketing_angle,
          NULL::boolean             AS is_ai_dev,
          analysis,
          scraped_at                AS created_at,
          id
        FROM reddit_intelligence
      ),
      vault_status AS (
        SELECT DISTINCT ON (source_id)
          source_id,
          status  AS asset_status,
          id      AS vault_asset_id
        FROM content_vault
        ORDER BY source_id,
          CASE WHEN status = 'published' THEN 0 ELSE 1 END,
          created_at DESC
      )
      SELECT s.*, v.asset_status, v.vault_asset_id
      FROM unified_signals s
      LEFT JOIN vault_status v ON v.source_id = s.source_id
      ORDER BY s.created_at DESC, s.primary_metric DESC NULLS LAST
      LIMIT 60
    `

    return Response.json(rows.map(toUnifiedSignal))
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 },
    )
  }
}
