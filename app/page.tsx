import { DashboardShell } from './components/DashboardShell'
import { initSchema, sql } from '@/lib/db'
import type { Target, UnifiedSignal } from '@/lib/db'

export const dynamic = 'force-dynamic'

type Dateish = string | Date
type TrendWithImage = UnifiedSignal & { created_at: Dateish }
type TargetRow = Target & { created_at: Dateish }

function serializeDate(value: Dateish) {
  return value instanceof Date ? value.toISOString() : value
}

export default async function DashboardPage() {
  await initSchema()

  const [{ rows: trends }, { rows: targets }] = await Promise.all([
    sql<TrendWithImage>`
      SELECT *
      FROM trends
      ORDER BY
        (analysis IS NOT NULL) DESC,
        created_at DESC
      LIMIT 20
    `,
    sql<TargetRow>`
      SELECT * FROM targets ORDER BY type, created_at ASC
    `,
  ])

  return (
    <DashboardShell
      trends={trends.map((trend) => ({
        ...trend,
        signal_type: 'scraped' as const,
        created_at: serializeDate(trend.created_at),
      }))}
      targets={targets.map((target) => ({
        ...target,
        created_at: serializeDate(target.created_at),
      }))}
    />
  )
}
