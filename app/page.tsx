import type { ReactNode } from 'react'
import Link from 'next/link'
import { TrendingUp, Star, Layers, Pencil } from 'lucide-react'
import { sql } from '@/lib/db'
import type { Trend } from '@/lib/db'
import { TrendCard } from './components/TrendCard'

export const dynamic = 'force-dynamic'

type TrendWithImage = Trend & { image_url: string | null }

export default async function DashboardPage() {
  const { rows: trends } = await sql<TrendWithImage>`
    SELECT * FROM trends ORDER BY score DESC NULLS LAST, created_at DESC LIMIT 10
  `

  const eliteCount = trends.filter((t) => t.score !== null && t.score >= 9).length
  const highCount = trends.filter((t) => t.score !== null && t.score >= 8 && t.score < 9).length
  const avgScore =
    trends.length > 0
      ? (trends.reduce((sum, t) => sum + (t.score ?? 0), 0) / trends.length).toFixed(1)
      : null

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-base)' }}>
      {/* Header */}
      <header
        className="sticky top-0 z-10 backdrop-blur-md"
        style={{
          background: 'rgba(12, 12, 14, 0.85)',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        <div className="mx-auto max-w-7xl px-6 py-4 flex flex-wrap items-center justify-between gap-4">
          {/* Brand */}
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-zinc-100">
              <TrendingUp className="h-4 w-4 text-zinc-900" strokeWidth={2.5} />
            </div>
            <div>
              <p className="text-sm font-semibold leading-none text-zinc-100">
                Trend Intelligence
              </p>
              <p className="mt-0.5 text-[11px] leading-none text-zinc-500 tracking-wide">
                Signal over noise
              </p>
            </div>
          </div>

          {/* Right: stats + drafts link */}
          <div className="flex items-center gap-4">
            <div className="flex items-center divide-x divide-white/[0.06]">
              <StatPill icon={<Layers className="h-3.5 w-3.5" />} label="Tracked" value={trends.length} />
              <StatPill icon={<Star className="h-3.5 w-3.5" />} label="Elite" value={eliteCount + highCount} accent />
              <StatPill icon={<TrendingUp className="h-3.5 w-3.5" />} label="Avg Score" value={avgScore ?? '—'} />
            </div>
            <Link
              href="/drafts"
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-medium transition-colors text-zinc-500 hover:text-indigo-400"
              style={{ border: '1px solid rgba(255,255,255,0.06)' }}
            >
              <Pencil className="h-3 w-3" />
              Drafts
            </Link>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="mx-auto max-w-7xl px-6 py-10">
        {trends.length === 0 ? (
          <EmptyState />
        ) : (
          <>
            {/* Elite section — score 9-10 */}
            {eliteCount > 0 && (
              <section className="mb-12">
                <SectionLabel
                  icon={<Star className="h-3.5 w-3.5 text-amber-400" />}
                  accent
                >
                  Elite
                </SectionLabel>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {trends
                    .filter((t) => t.score !== null && t.score >= 9)
                    .map((trend) => (
                      <TrendCard key={trend.id} trend={trend} />
                    ))}
                </div>
              </section>
            )}

            {/* High section — score 8 */}
            {highCount > 0 && (
              <section className="mb-12">
                <SectionLabel icon={<TrendingUp className="h-3.5 w-3.5 text-zinc-400" />}>
                  High Signal
                </SectionLabel>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {trends
                    .filter((t) => t.score !== null && t.score === 8)
                    .map((trend) => (
                      <TrendCard key={trend.id} trend={trend} />
                    ))}
                </div>
              </section>
            )}

            {/* Remaining */}
            {trends.filter((t) => t.score === null || t.score < 8).length > 0 && (
              <section>
                <SectionLabel icon={<Layers className="h-3.5 w-3.5 text-zinc-600" />}>
                  Watching
                </SectionLabel>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {trends
                    .filter((t) => t.score === null || t.score < 8)
                    .map((trend) => (
                      <TrendCard key={trend.id} trend={trend} />
                    ))}
                </div>
              </section>
            )}
          </>
        )}
      </main>
    </div>
  )
}

/* ── Sub-components ─────────────────────────────────────────── */

function StatPill({
  icon,
  label,
  value,
  accent,
}: {
  icon: ReactNode
  label: string
  value: string | number
  accent?: boolean
}) {
  return (
    <div className="flex items-center gap-1.5 px-4 first:pl-0 last:pr-0">
      <span className={accent ? 'text-amber-400' : 'text-zinc-600'}>{icon}</span>
      <span className="text-[11px] text-zinc-500 tracking-wide">{label}</span>
      <span className={`text-xs font-semibold tabular-nums ${accent ? 'text-amber-400' : 'text-zinc-200'}`}>
        {value}
      </span>
    </div>
  )
}

function SectionLabel({
  icon,
  children,
  accent,
}: {
  icon: ReactNode
  children: ReactNode
  accent?: boolean
}) {
  return (
    <div className="mb-5 flex items-center gap-2">
      {icon}
      <h2
        className={`text-[10px] font-bold uppercase tracking-[0.2em] ${
          accent ? 'text-amber-400/80' : 'text-zinc-600'
        }`}
      >
        {children}
      </h2>
      <div
        className="flex-1 h-px"
        style={{ background: accent ? 'rgba(251,191,36,0.12)' : 'rgba(255,255,255,0.04)' }}
      />
    </div>
  )
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-40 text-center">
      <div
        className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl"
        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
      >
        <TrendingUp className="h-7 w-7 text-zinc-600" />
      </div>
      <p className="text-sm font-semibold text-zinc-300">No trends yet</p>
      <p className="mt-1.5 text-xs text-zinc-600">
        POST to{' '}
        <code
          className="rounded px-1.5 py-0.5 text-xs font-mono text-zinc-400"
          style={{ background: 'rgba(255,255,255,0.06)' }}
        >
          /api/trends
        </code>{' '}
        to populate the dashboard
      </p>
    </div>
  )
}
