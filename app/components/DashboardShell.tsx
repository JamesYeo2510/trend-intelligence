'use client'

import { useMemo, useState, type ReactNode } from 'react'
import Link from 'next/link'
import {
  Archive,
  Code2,
  GitBranch,
  Globe,
  Layers,
  Pencil,
  Settings,
  Star,
  Target,
  TrendingUp,
  X,
} from 'lucide-react'
import type { GitHubIntelligence, Target as TargetRow, Trend } from '@/lib/db'
import { TargetSection } from '@/app/settings/TargetSection'
import { TrendCard } from './TrendCard'
import { ContentVaultTab } from './ContentVaultTab'

type ActiveTab = 'overview' | 'github' | 'targets' | 'vault'

type TrendWithImage = Trend & { image_url: string | null }

export type GitHubRadarItem = Pick<
  GitHubIntelligence,
  | 'id'
  | 'name'
  | 'stars'
  | 'description'
  | 'language'
  | 'url'
  | 'is_ai_dev'
  | 'period'
  | 'marketing_angle'
  | 'scraped_at'
>

type DashboardShellProps = {
  trends: TrendWithImage[]
  githubItems: GitHubRadarItem[]
  targets: TargetRow[]
}

const navItems: Array<{
  id: ActiveTab
  label: string
  icon: ReactNode
}> = [
  { id: 'overview', label: 'Overview', icon: <TrendingUp className="h-4 w-4" /> },
  { id: 'github', label: 'Github Radar', icon: <GitBranch className="h-4 w-4" /> },
  { id: 'targets', label: 'Targets', icon: <Target className="h-4 w-4" /> },
  { id: 'vault', label: 'Content Vault', icon: <Archive className="h-4 w-4" /> },
]

export function DashboardShell({ trends, githubItems, targets }: DashboardShellProps) {
  const [activeTab, setActiveTab] = useState<ActiveTab>('overview')

  const eliteCount = trends.filter((t) => t.score !== null && t.score >= 9).length
  const highCount = trends.filter((t) => t.score !== null && t.score >= 8 && t.score < 9).length
  const avgScore =
    trends.length > 0
      ? (trends.reduce((sum, t) => sum + (t.score ?? 0), 0) / trends.length).toFixed(1)
      : null

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-base)' }}>
      <Sidebar activeTab={activeTab} onChange={setActiveTab} />
      <Header
        tracked={trends.length}
        elite={eliteCount + highCount}
        avgScore={avgScore}
      />

      <div className="min-h-screen pl-0 pt-[73px] lg:pl-56">
        <main className="mx-auto max-w-7xl px-5 py-10 sm:px-6">
          {activeTab === 'overview' && <OverviewTab trends={trends} />}
          {activeTab === 'github' && <GitHubRadarTab repos={githubItems} />}
          {activeTab === 'targets' && <TargetsTab targets={targets} />}
          {activeTab === 'vault' && <ContentVaultTab />}
        </main>
      </div>
    </div>
  )
}

function Sidebar({
  activeTab,
  onChange,
}: {
  activeTab: ActiveTab
  onChange: (tab: ActiveTab) => void
}) {
  return (
    <aside
      className="fixed inset-y-0 left-0 z-20 hidden w-56 border-r border-white/[0.04] lg:block"
      style={{ background: 'rgba(8, 8, 10, 0.92)' }}
    >
      <div className="flex h-full flex-col px-6 pt-32">
        <nav className="space-y-6">
          {navItems.map((item) => {
            const isActive = activeTab === item.id
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onChange(item.id)}
                className={[
                  'group relative flex h-12 w-full items-center gap-3 rounded-md px-3 text-left transition-colors',
                  isActive ? 'text-sky-300' : 'text-zinc-700 hover:text-zinc-300',
                ].join(' ')}
              >
                <span
                  className="absolute left-0 top-1/2 h-8 w-0.5 -translate-y-1/2 rounded-full transition-all"
                  style={{
                    background: isActive ? '#0ea5e9' : 'rgba(14,165,233,0.35)',
                    boxShadow: isActive ? '0 0 14px rgba(14,165,233,0.65)' : 'none',
                    opacity: isActive ? 1 : 0,
                  }}
                />
                <span
                  className="absolute bottom-0 left-3 right-2 h-px rounded-full transition-opacity"
                  style={{
                    background: 'linear-gradient(90deg, rgba(14,165,233,0.8), transparent)',
                    opacity: isActive ? 1 : 0,
                  }}
                />
                <span className="relative z-10 flex items-center gap-3">
                  {item.icon}
                  <span className="whitespace-nowrap text-[10px] font-bold uppercase tracking-[0.16em]">
                    {item.label}
                  </span>
                </span>
              </button>
            )
          })}
        </nav>
      </div>
    </aside>
  )
}

function Header({
  tracked,
  elite,
  avgScore,
}: {
  tracked: number
  elite: number
  avgScore: string | null
}) {
  return (
    <header
      className="fixed inset-x-0 top-0 z-30 backdrop-blur-md"
      style={{
        background: 'rgba(12, 12, 14, 0.85)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
      }}
    >
      <div className="flex w-full flex-wrap items-center justify-between gap-4 px-5 py-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-zinc-100">
            <TrendingUp className="h-4 w-4 text-zinc-900" strokeWidth={2.5} />
          </div>
          <div>
            <p className="text-sm font-semibold leading-none text-zinc-100">
              Trend Intelligence
            </p>
            <p className="mt-0.5 text-[11px] leading-none tracking-wide text-zinc-500">
              Signal over noise
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden items-center divide-x divide-white/[0.06] sm:flex">
            <StatPill icon={<Layers className="h-3.5 w-3.5" />} label="Tracked" value={tracked} />
            <StatPill icon={<Star className="h-3.5 w-3.5" />} label="Elite" value={elite} accent />
            <StatPill icon={<TrendingUp className="h-3.5 w-3.5" />} label="Avg Score" value={avgScore ?? '-'} />
          </div>
          <Link
            href="/drafts"
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-medium text-zinc-500 transition-colors hover:text-indigo-400"
            style={{ border: '1px solid rgba(255,255,255,0.06)' }}
          >
            <Pencil className="h-3 w-3" />
            Drafts
          </Link>
          <Link
            href="/settings"
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-medium text-zinc-500 transition-colors hover:text-zinc-300"
            style={{ border: '1px solid rgba(255,255,255,0.06)' }}
          >
            <Settings className="h-3 w-3" />
            Settings
          </Link>
        </div>
      </div>
    </header>
  )
}

function OverviewTab({ trends }: { trends: TrendWithImage[] }) {
  const elite = trends.filter((t) => t.score !== null && t.score >= 9)
  const high = trends.filter((t) => t.score !== null && t.score >= 8 && t.score < 9)
  const watching = trends.filter((t) => t.score === null || t.score < 8)

  if (trends.length === 0) return <EmptyState />

  return (
    <>
      {elite.length > 0 && (
        <section className="mb-12">
          <SectionLabel icon={<Star className="h-3.5 w-3.5 text-amber-400" />} accent>
            Elite
          </SectionLabel>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {elite.map((trend) => (
              <TrendCard key={trend.id} trend={trend} />
            ))}
          </div>
        </section>
      )}

      {high.length > 0 && (
        <section className="mb-12">
          <SectionLabel icon={<TrendingUp className="h-3.5 w-3.5 text-zinc-400" />}>
            High Signal
          </SectionLabel>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {high.map((trend) => (
              <TrendCard key={trend.id} trend={trend} />
            ))}
          </div>
        </section>
      )}

      {watching.length > 0 && (
        <section>
          <SectionLabel icon={<Layers className="h-3.5 w-3.5 text-zinc-600" />}>
            Watching
          </SectionLabel>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {watching.map((trend) => (
              <TrendCard key={trend.id} trend={trend} />
            ))}
          </div>
        </section>
      )}
    </>
  )
}

function GitHubRadarTab({ repos }: { repos: GitHubRadarItem[] }) {
  const topRepos = useMemo(() => {
    const latestScrape = repos[0]?.scraped_at
    const latestRepos = latestScrape ? repos.filter((repo) => repo.scraped_at === latestScrape) : repos
    const radarRepos = latestRepos.filter((repo) => repo.is_ai_dev)
    return [...(radarRepos.length > 0 ? radarRepos : latestRepos)].sort((a, b) => (b.stars ?? 0) - (a.stars ?? 0))
  }, [repos])

  return (
    <section>
      <SectionLabel icon={<GitBranch className="h-3.5 w-3.5 text-sky-300" />} blue>
        Github Radar
      </SectionLabel>

      <GitHubScroller repos={topRepos} />

      <div className="mt-10">
        <SectionLabel icon={<Layers className="h-3.5 w-3.5 text-zinc-500" />}>
          Intelligence List
        </SectionLabel>
        {repos.length === 0 ? (
          <div
            className="rounded-lg px-4 py-3 text-[12px] text-slate-500"
            style={{
              background: 'rgba(15,23,42,0.45)',
              border: '1px solid rgba(125,211,252,0.08)',
            }}
          >
            No GitHub intelligence data yet.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
            {repos.map((repo) => (
              <GitHubListCard key={`${repo.scraped_at}-${repo.id}`} repo={repo} />
            ))}
          </div>
        )}
      </div>
    </section>
  )
}

function TargetsTab({ targets }: { targets: TargetRow[] }) {
  const twitter = targets.filter((t) => t.type === 'twitter')
  const websites = targets.filter((t) => t.type === 'website')
  const active = targets.filter((t) => t.active).length

  return (
    <section>
      <SectionLabel icon={<Target className="h-3.5 w-3.5 text-sky-300" />} blue>
        Targets
      </SectionLabel>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <div>
          <div className="mb-3 flex items-center gap-2">
            <X className="h-3.5 w-3.5 text-zinc-500" />
            <span className="text-[11px] font-semibold text-zinc-400">Twitter Accounts</span>
          </div>
          <TargetSection
            type="twitter"
            items={twitter}
            label="Tracked Accounts"
            placeholder="e.g. sama"
            hint="No Twitter accounts yet. Add a handle above."
          />
        </div>

        <div>
          <div className="mb-3 flex items-center gap-2">
            <Globe className="h-3.5 w-3.5 text-zinc-500" />
            <span className="text-[11px] font-semibold text-zinc-400">Websites</span>
          </div>
          <TargetSection
            type="website"
            items={websites}
            label="Tracked Sites"
            placeholder="e.g. https://techcrunch.com/ai"
            hint="No websites yet. Add a URL above."
          />
        </div>
      </div>

      <div
        className="mt-8 flex flex-wrap items-center gap-6 rounded-lg px-5 py-4"
        style={{
          background: 'rgba(255,255,255,0.02)',
          border: '1px solid rgba(255,255,255,0.05)',
        }}
      >
        <TargetStat label="Twitter active" value={twitter.filter((t) => t.active).length} total={twitter.length} />
        <Divider />
        <TargetStat label="Websites active" value={websites.filter((t) => t.active).length} total={websites.length} />
        <Divider />
        <TargetStat label="Total active" value={active} total={targets.length} accent />
      </div>
    </section>
  )
}

function GitHubScroller({ repos }: { repos: GitHubRadarItem[] }) {
  if (repos.length === 0) {
    return (
      <div
        className="rounded-lg px-4 py-3 text-[12px] text-slate-500"
        style={{
          background: 'rgba(15,23,42,0.45)',
          border: '1px solid rgba(125,211,252,0.08)',
        }}
      >
        No GitHub radar data yet.
      </div>
    )
  }

  return (
    <div className="-mx-5 overflow-x-auto px-5 pb-2 sm:-mx-6 sm:px-6">
      <div className="flex min-w-max gap-3">
        {repos.map((repo) => (
          <GitHubMiniCard key={`${repo.period}-${repo.id}`} repo={repo} />
        ))}
      </div>
    </div>
  )
}

function GitHubMiniCard({ repo }: { repo: GitHubRadarItem }) {
  const language = repo.language ?? 'Unknown'
  const periodLabel = repo.period === 'monthly' ? 'Monthly' : 'Weekly'

  return (
    <article
      className="w-72 shrink-0 rounded-lg px-4 py-3"
      style={{
        background: 'linear-gradient(180deg, rgba(15,23,42,0.94), rgba(10,15,26,0.98))',
        border: '1px solid rgba(125,211,252,0.14)',
        boxShadow: '0 14px 34px rgba(2,6,23,0.24)',
      }}
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        {repo.url ? (
          <a
            href={repo.url}
            target="_blank"
            rel="noreferrer"
            className="line-clamp-2 text-[13px] font-semibold leading-snug text-slate-100 transition-colors hover:text-sky-300"
          >
            {repo.name}
          </a>
        ) : (
          <span className="line-clamp-2 text-[13px] font-semibold leading-snug text-slate-100">
            {repo.name}
          </span>
        )}
        {repo.is_ai_dev && <AiBadge />}
      </div>

      <div className="flex items-center justify-between gap-3 text-[11px] text-slate-500">
        <span className="flex items-center gap-1.5 text-slate-300">
          <Star className="h-3 w-3 text-sky-300" />
          <span className="font-semibold tabular-nums">{formatStars(repo.stars)}</span>
        </span>
        <span className="flex min-w-0 items-center gap-1.5">
          <Code2 className="h-3 w-3 shrink-0 text-slate-600" />
          <span className="truncate">{language}</span>
        </span>
        <span className="rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase text-slate-400 bg-white/[0.04]">
          {periodLabel}
        </span>
      </div>
    </article>
  )
}

function GitHubListCard({ repo }: { repo: GitHubRadarItem }) {
  const periodLabel = repo.period === 'monthly' ? 'Monthly' : 'Weekly'

  return (
    <article
      className="rounded-lg p-4"
      style={{
        background: 'rgba(15,23,42,0.42)',
        border: '1px solid rgba(125,211,252,0.08)',
      }}
    >
      <div className="mb-3 flex items-start justify-between gap-4">
        <div className="min-w-0">
          {repo.url ? (
            <a
              href={repo.url}
              target="_blank"
              rel="noreferrer"
              className="truncate text-[13px] font-semibold text-slate-100 transition-colors hover:text-sky-300"
            >
              {repo.name}
            </a>
          ) : (
            <span className="truncate text-[13px] font-semibold text-slate-100">{repo.name}</span>
          )}
          <div className="mt-1 flex flex-wrap items-center gap-3 text-[10px] text-slate-600">
            <span className="flex items-center gap-1">
              <Star className="h-3 w-3 text-sky-300" />
              {formatStars(repo.stars)}
            </span>
            <span className="flex items-center gap-1">
              <Code2 className="h-3 w-3" />
              {repo.language ?? 'Unknown'}
            </span>
            <span className="rounded bg-white/[0.04] px-1.5 py-0.5 font-semibold uppercase text-slate-500">
              {periodLabel}
            </span>
          </div>
        </div>
        {repo.is_ai_dev && <AiBadge />}
      </div>
      <p className="line-clamp-2 text-[12px] leading-relaxed text-slate-500">
        {repo.description || 'No description provided.'}
      </p>
      {repo.marketing_angle && (
        <p className="mt-3 rounded-md px-3 py-2 text-[11px] leading-relaxed text-sky-200/80 bg-sky-400/[0.06]">
          {repo.marketing_angle}
        </p>
      )}
    </article>
  )
}

function AiBadge() {
  return (
    <span
      className="shrink-0 rounded px-1.5 py-0.5 text-[9px] font-bold text-cyan-200"
      style={{
        background: 'rgba(34,211,238,0.12)',
        border: '1px solid rgba(34,211,238,0.22)',
      }}
    >
      [AI]
    </span>
  )
}

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
      <span className="text-[11px] tracking-wide text-zinc-500">{label}</span>
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
  blue,
}: {
  icon: ReactNode
  children: ReactNode
  accent?: boolean
  blue?: boolean
}) {
  const color = blue ? 'text-sky-300/80' : accent ? 'text-amber-400/80' : 'text-zinc-600'
  const line = blue
    ? 'rgba(125,211,252,0.14)'
    : accent
      ? 'rgba(251,191,36,0.12)'
      : 'rgba(255,255,255,0.04)'

  return (
    <div className="mb-5 flex items-center gap-2">
      {icon}
      <h2 className={`text-[10px] font-bold uppercase tracking-[0.2em] ${color}`}>
        {children}
      </h2>
      <div className="h-px flex-1" style={{ background: line }} />
    </div>
  )
}

function TargetStat({
  label,
  value,
  total,
  accent,
}: {
  label: string
  value: number
  total: number
  accent?: boolean
}) {
  return (
    <div className="flex items-baseline gap-1.5">
      <span className={`text-lg font-bold tabular-nums ${accent ? 'text-sky-300' : 'text-zinc-200'}`}>
        {value}
      </span>
      <span className="text-[11px] text-zinc-600">
        / {total} {label}
      </span>
    </div>
  )
}

function Divider() {
  return <div className="hidden h-8 w-px sm:block" style={{ background: 'rgba(255,255,255,0.06)' }} />
}

function formatStars(value: number | null) {
  if (value === null) return '-'
  if (value >= 1000) {
    const compact = value / 1000
    return `${compact >= 10 ? compact.toFixed(0) : compact.toFixed(1)}k`
  }

  return value.toString()
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
      <p className="mt-1.5 text-xs text-zinc-600">POST to /api/trends to populate the dashboard</p>
    </div>
  )
}
