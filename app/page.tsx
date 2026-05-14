import { DashboardShell, type GitHubRadarItem } from './components/DashboardShell'
import { initSchema, sql } from '@/lib/db'
import type { Target, Trend } from '@/lib/db'

export const dynamic = 'force-dynamic'

type Dateish = string | Date
type TrendWithImage = Trend & { image_url: string | null; created_at: Dateish }
type TargetRow = Target & { created_at: Dateish }
type GitHubRow = GitHubRadarItem & { scraped_at: Dateish }

function serializeDate(value: Dateish) {
  return value instanceof Date ? value.toISOString() : value
}

export default async function DashboardPage() {
  await initSchema()

  const [{ rows: trends }, { rows: githubItems }, { rows: targets }] = await Promise.all([
    sql<TrendWithImage>`
      SELECT * FROM trends ORDER BY score DESC NULLS LAST, created_at DESC LIMIT 10
    `,
    sql<GitHubRow>`
      SELECT
        id,
        name,
        stars,
        description,
        language,
        url,
        is_ai_dev,
        period,
        marketing_angle,
        scraped_at
      FROM github_intelligence
      ORDER BY scraped_at DESC, stars DESC NULLS LAST, id DESC
    `,
    sql<TargetRow>`
      SELECT * FROM targets ORDER BY type, created_at ASC
    `,
  ])

  return (
    <DashboardShell
      trends={trends.map((trend) => ({
        ...trend,
        created_at: serializeDate(trend.created_at),
      }))}
      githubItems={githubItems.map((item) => ({
        ...item,
        scraped_at: serializeDate(item.scraped_at),
      }))}
      targets={targets.map((target) => ({
        ...target,
        created_at: serializeDate(target.created_at),
      }))}
    />
  )
}
