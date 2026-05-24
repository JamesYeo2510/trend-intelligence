import { initSchema, sql } from '@/lib/db'

export const dynamic = 'force-dynamic'

type TelemetryRow = {
  total_signals: string
  studio_drafts: string
  today_count: string
  yesterday_count: string
}

export async function GET() {
  try {
    await initSchema()

    const { rows } = await sql<TelemetryRow>`
      SELECT
        (
          (SELECT COUNT(*) FROM github_intelligence) +
          (SELECT COUNT(*) FROM reddit_intelligence)
        )::text AS total_signals,

        (SELECT COUNT(*) FROM content_vault WHERE status = 'draft')::text AS studio_drafts,

        (
          (SELECT COUNT(*) FROM github_intelligence WHERE scraped_at >= CURRENT_DATE) +
          (SELECT COUNT(*) FROM reddit_intelligence WHERE scraped_at >= CURRENT_DATE)
        )::text AS today_count,

        (
          (SELECT COUNT(*) FROM github_intelligence
            WHERE scraped_at >= CURRENT_DATE - INTERVAL '1 day'
              AND scraped_at < CURRENT_DATE) +
          (SELECT COUNT(*) FROM reddit_intelligence
            WHERE scraped_at >= CURRENT_DATE - INTERVAL '1 day'
              AND scraped_at < CURRENT_DATE)
        )::text AS yesterday_count
    `

    const row = rows[0]
    const todayN = parseInt(row.today_count, 10)
    const yesterdayN = parseInt(row.yesterday_count, 10)
    const crossover_pct = yesterdayN > 0
      ? Math.round((todayN / yesterdayN) * 100)
      : todayN > 0 ? 100 : 0

    return Response.json({
      total_signals: parseInt(row.total_signals, 10),
      studio_drafts: parseInt(row.studio_drafts, 10),
      crossover_pct,
    })
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 },
    )
  }
}
