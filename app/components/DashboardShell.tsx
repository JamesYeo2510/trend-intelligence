'use client'

import { useEffect, useState, type ReactNode } from 'react'
import Link from 'next/link'
import {
  Archive,
  Globe,
  Layers,
  Loader2,
  Pencil,
  Settings,
  Star,
  Target,
  TrendingUp,
  X,
  Zap,
} from 'lucide-react'
import type { Target as TargetRow, UnifiedSignal } from '@/lib/db'
import { TargetSection } from '@/app/settings/TargetSection'
import { TrendCard } from './TrendCard'
import { ContentVaultTab } from './ContentVaultTab'

type ActiveTab = 'overview' | 'radar' | 'targets' | 'vault'
type TrendWithImage = UnifiedSignal

type DashboardShellProps = {
  trends: TrendWithImage[]
  targets: TargetRow[]
}

const navItems: Array<{ id: ActiveTab; label: string; icon: ReactNode }> = [
  { id: 'overview', label: 'Overview',     icon: <TrendingUp className="h-4 w-4" /> },
  { id: 'radar',    label: 'Trend Radar',  icon: <Zap className="h-4 w-4" /> },
  { id: 'targets',  label: 'Targets',      icon: <Target className="h-4 w-4" /> },
  { id: 'vault',    label: 'Content Vault', icon: <Archive className="h-4 w-4" /> },
]

const MONITORED_TABS: ActiveTab[] = ['overview', 'radar']

export function DashboardShell({ trends, targets }: DashboardShellProps) {
  const [activeTab, setActiveTab] = useState<ActiveTab>('overview')

  const eliteCount = trends.filter((t) => t.score !== null && t.score >= 9).length
  const highCount  = trends.filter((t) => t.score !== null && t.score >= 8 && t.score < 9).length
  const avgScore   = trends.length > 0
    ? (trends.reduce((sum, t) => sum + (t.score ?? 0), 0) / trends.length).toFixed(1)
    : null

  const showBanner = MONITORED_TABS.includes(activeTab)

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-base)' }}>
      <Sidebar activeTab={activeTab} onChange={setActiveTab} />
      <Header tracked={trends.length} elite={eliteCount + highCount} avgScore={avgScore} />

      <div className="min-h-screen pl-0 pt-[73px] lg:pl-56">
        {showBanner && <TelemetryBanner />}
        <main className="mx-auto max-w-7xl px-5 py-10 sm:px-6">
          {activeTab === 'overview' && <OverviewTab trends={trends} />}
          {activeTab === 'radar'    && <TrendRadarTab />}
          {activeTab === 'targets'  && <TargetsTab targets={targets} />}
          {activeTab === 'vault'    && <ContentVaultTab />}
        </main>
      </div>
    </div>
  )
}

/* ── Telemetry Banner ──────────────────────────────────────── */

type TelemetryData = {
  total_signals: number
  studio_drafts: number
  crossover_pct: number
}

function TelemetryBanner() {
  const [data, setData] = useState<TelemetryData | null>(null)

  useEffect(() => {
    fetch('/api/telemetry')
      .then((r) => r.ok ? r.json() as Promise<TelemetryData> : null)
      .then((d) => { if (d) setData(d) })
      .catch(() => {})
  }, [])

  return (
    <div
      className="border-b px-5 py-3 sm:px-6 lg:px-8"
      style={{
        background: 'linear-gradient(90deg, rgba(212,175,55,0.04) 0%, rgba(8,8,8,0) 60%)',
        borderColor: 'rgba(212,175,55,0.12)',
      }}
    >
      {/* Gold top rule */}
      <div className="mb-2.5 h-px w-full" style={{ background: 'linear-gradient(90deg, rgba(212,175,55,0.4), transparent)' }} />

      <div className="flex flex-wrap items-center gap-6">
        <TelemetryBlock label="TOTAL SIGNALS" value={data?.total_signals ?? '—'} />
        <div className="h-5 w-px" style={{ background: 'rgba(212,175,55,0.15)' }} />
        <TelemetryBlock label="STUDIO DRAFTS" value={data?.studio_drafts ?? '—'} />
        <div className="h-5 w-px" style={{ background: 'rgba(212,175,55,0.15)' }} />
        <TelemetryBlock
          label="SYNC RATE"
          value={data ? `${data.crossover_pct}%` : '—'}
          hint="vs yesterday"
        />
      </div>

      {/* Gold bottom rule */}
      <div className="mt-2.5 h-px w-full" style={{ background: 'linear-gradient(90deg, rgba(212,175,55,0.15), transparent)' }} />
    </div>
  )
}

function TelemetryBlock({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <div className="flex items-baseline gap-2">
      <span className="text-[8px] font-black tracking-[0.22em] text-zinc-600">{label}</span>
      <span className="text-sm font-bold tabular-nums" style={{ color: 'var(--gold)' }}>
        {value}
      </span>
      {hint && <span className="text-[9px] text-zinc-700">{hint}</span>}
    </div>
  )
}

/* ── Sidebar ───────────────────────────────────────────────── */

function Sidebar({ activeTab, onChange }: { activeTab: ActiveTab; onChange: (tab: ActiveTab) => void }) {
  return (
    <aside
      className="fixed inset-y-0 left-0 z-20 hidden w-56 border-r lg:block"
      style={{ background: 'rgba(5,5,5,0.96)', borderColor: 'rgba(212,175,55,0.1)' }}
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
                  isActive ? '' : 'text-zinc-700 hover:text-zinc-400',
                ].join(' ')}
                style={{ color: isActive ? 'var(--gold)' : undefined }}
              >
                <span
                  className="absolute left-0 top-1/2 h-8 w-0.5 -translate-y-1/2 rounded-full transition-all"
                  style={{
                    background: isActive ? 'var(--gold)' : 'rgba(212,175,55,0.2)',
                    boxShadow: isActive ? '0 0 12px rgba(212,175,55,0.5)' : 'none',
                    opacity: isActive ? 1 : 0,
                  }}
                />
                <span
                  className="absolute bottom-0 left-3 right-2 h-px rounded-full transition-opacity"
                  style={{
                    background: 'linear-gradient(90deg, rgba(212,175,55,0.6), transparent)',
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

/* ── Header ────────────────────────────────────────────────── */

function Header({ tracked, elite, avgScore }: { tracked: number; elite: number; avgScore: string | null }) {
  return (
    <header
      className="fixed inset-x-0 top-0 z-30 backdrop-blur-md"
      style={{
        background: 'rgba(5,5,5,0.9)',
        borderBottom: '1px solid rgba(212,175,55,0.1)',
      }}
    >
      <div className="flex w-full flex-wrap items-center justify-between gap-4 px-5 py-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <div
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
            style={{ background: 'rgba(212,175,55,0.12)', border: '1px solid rgba(212,175,55,0.25)' }}
          >
            <TrendingUp className="h-4 w-4" style={{ color: 'var(--gold)' }} strokeWidth={2.5} />
          </div>
          <div>
            <p className="text-sm font-semibold leading-none text-zinc-100">Trend Intelligence</p>
            <p className="mt-0.5 text-[11px] leading-none tracking-wide text-zinc-600">Signal over noise</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden items-center divide-x sm:flex" style={{ borderColor: 'rgba(212,175,55,0.1)' }}>
            <StatPill icon={<Layers className="h-3.5 w-3.5" />} label="Tracked" value={tracked} />
            <StatPill icon={<Star className="h-3.5 w-3.5" />} label="Elite" value={elite} gold />
            <StatPill icon={<TrendingUp className="h-3.5 w-3.5" />} label="Avg Score" value={avgScore ?? '-'} />
          </div>
          <Link
            href="/drafts"
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-medium text-zinc-500 transition-colors hover:text-zinc-300"
            style={{ border: '1px solid rgba(212,175,55,0.1)' }}
          >
            <Pencil className="h-3 w-3" />
            Drafts
          </Link>
          <Link
            href="/settings"
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-medium text-zinc-500 transition-colors hover:text-zinc-300"
            style={{ border: '1px solid rgba(212,175,55,0.1)' }}
          >
            <Settings className="h-3 w-3" />
            Settings
          </Link>
        </div>
      </div>
    </header>
  )
}

/* ── Overview Tab ──────────────────────────────────────────── */

function OverviewTab({ trends }: { trends: TrendWithImage[] }) {
  const elite    = trends.filter((t) => t.score !== null && t.score >= 9)
  const high     = trends.filter((t) => t.score !== null && t.score >= 8 && t.score < 9)
  const watching = trends.filter((t) => t.score === null || t.score < 8)

  if (trends.length === 0) return <EmptyState />

  return (
    <>
      {elite.length > 0 && (
        <section className="mb-12">
          <SectionLabel icon={<Star className="h-3.5 w-3.5" style={{ color: 'var(--gold)' }} />} gold>Elite</SectionLabel>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {elite.map((trend) => <TrendCard key={trend.id} trend={trend} />)}
          </div>
        </section>
      )}
      {high.length > 0 && (
        <section className="mb-12">
          <SectionLabel icon={<TrendingUp className="h-3.5 w-3.5 text-zinc-400" />}>High Signal</SectionLabel>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {high.map((trend) => <TrendCard key={trend.id} trend={trend} />)}
          </div>
        </section>
      )}
      {watching.length > 0 && (
        <section>
          <SectionLabel icon={<Layers className="h-3.5 w-3.5 text-zinc-600" />}>Watching</SectionLabel>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {watching.map((trend) => <TrendCard key={trend.id} trend={trend} />)}
          </div>
        </section>
      )}
    </>
  )
}

/* ── Trend Radar Tab ───────────────────────────────────────── */

function TrendRadarTab() {
  const [signals, setSignals] = useState<UnifiedSignal[]>([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    setError(null)
    fetch('/api/trend-radar')
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json() as Promise<UnifiedSignal[]>
      })
      .then((data) => { setSignals(data); setLoading(false) })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'Failed to load')
        setLoading(false)
      })
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-40">
        <Loader2 className="h-6 w-6 animate-spin" style={{ color: 'var(--gold-dim)' }} />
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-lg px-4 py-3 text-[12px] text-red-400"
        style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)' }}>
        Failed to load Trend Radar: {error}
      </div>
    )
  }

  if (signals.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-40 text-center">
        <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl"
          style={{ background: 'rgba(212,175,55,0.05)', border: '1px solid rgba(212,175,55,0.15)' }}>
          <Zap className="h-7 w-7" style={{ color: 'var(--gold-dim)' }} />
        </div>
        <p className="text-sm font-semibold text-zinc-300">No signals yet</p>
        <p className="mt-1.5 text-xs text-zinc-600">Run the scrapers to populate GitHub and Reddit intelligence</p>
      </div>
    )
  }

  const githubCount    = signals.filter((s) => s.signal_type === 'github').length
  const redditCount    = signals.filter((s) => s.signal_type === 'reddit').length
  const publishedCount = signals.filter((s) => s.asset_status === 'published').length

  return (
    <section>
      <div className="mb-5 flex items-center gap-2">
        <Zap className="h-3.5 w-3.5" style={{ color: 'var(--gold)' }} />
        <h2 className="text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: 'var(--gold-dim)' }}>
          Trend Radar
        </h2>
        <div className="h-px flex-1" style={{ background: 'rgba(212,175,55,0.14)' }} />
        <div className="flex items-center gap-3 text-[10px] text-zinc-600">
          <span className="flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: 'rgba(212,175,55,0.6)' }} />
            {githubCount} GitHub
          </span>
          <span className="flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-orange-400/60" />
            {redditCount} Reddit
          </span>
          {publishedCount > 0 && (
            <span className="flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400/60" />
              {publishedCount} posted
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {signals.map((signal) => (
          <TrendCard key={`${signal.signal_type}-${signal.id}`} trend={signal} />
        ))}
      </div>
    </section>
  )
}

/* ── Targets Tab ───────────────────────────────────────────── */

function TargetsTab({ targets }: { targets: TargetRow[] }) {
  const twitter  = targets.filter((t) => t.type === 'twitter')
  const websites = targets.filter((t) => t.type === 'website')
  const active   = targets.filter((t) => t.active).length

  return (
    <section>
      <SectionLabel icon={<Target className="h-3.5 w-3.5 text-zinc-400" />}>Targets</SectionLabel>
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <div>
          <div className="mb-3 flex items-center gap-2">
            <X className="h-3.5 w-3.5 text-zinc-500" />
            <span className="text-[11px] font-semibold text-zinc-400">Twitter Accounts</span>
          </div>
          <TargetSection type="twitter" items={twitter} label="Tracked Accounts"
            placeholder="e.g. sama" hint="No Twitter accounts yet. Add a handle above." />
        </div>
        <div>
          <div className="mb-3 flex items-center gap-2">
            <Globe className="h-3.5 w-3.5 text-zinc-500" />
            <span className="text-[11px] font-semibold text-zinc-400">Websites</span>
          </div>
          <TargetSection type="website" items={websites} label="Tracked Sites"
            placeholder="e.g. https://techcrunch.com/ai" hint="No websites yet. Add a URL above." />
        </div>
      </div>
      <div className="mt-8 flex flex-wrap items-center gap-6 rounded-lg px-5 py-4"
        style={{ background: 'rgba(212,175,55,0.03)', border: '1px solid rgba(212,175,55,0.08)' }}>
        <TargetStat label="Twitter active" value={twitter.filter((t) => t.active).length} total={twitter.length} />
        <Divider />
        <TargetStat label="Websites active" value={websites.filter((t) => t.active).length} total={websites.length} />
        <Divider />
        <TargetStat label="Total active" value={active} total={targets.length} gold />
      </div>
    </section>
  )
}

/* ── Shared UI helpers ─────────────────────────────────────── */

function StatPill({ icon, label, value, gold }: { icon: ReactNode; label: string; value: string | number; gold?: boolean }) {
  return (
    <div className="flex items-center gap-1.5 px-4 first:pl-0 last:pr-0">
      <span style={{ color: gold ? 'var(--gold)' : undefined }} className={gold ? '' : 'text-zinc-600'}>{icon}</span>
      <span className="text-[11px] tracking-wide text-zinc-500">{label}</span>
      <span className="text-xs font-semibold tabular-nums"
        style={{ color: gold ? 'var(--gold)' : '#e4e4e7' }}>{value}</span>
    </div>
  )
}

function SectionLabel({ icon, children, gold }: { icon: ReactNode; children: ReactNode; gold?: boolean }) {
  return (
    <div className="mb-5 flex items-center gap-2">
      {icon}
      <h2 className="text-[10px] font-bold uppercase tracking-[0.2em]"
        style={{ color: gold ? 'var(--gold-dim)' : 'rgba(161,161,170,0.6)' }}>
        {children}
      </h2>
      <div className="h-px flex-1"
        style={{ background: gold ? 'rgba(212,175,55,0.14)' : 'rgba(255,255,255,0.04)' }} />
    </div>
  )
}

function TargetStat({ label, value, total, gold }: { label: string; value: number; total: number; gold?: boolean }) {
  return (
    <div className="flex items-baseline gap-1.5">
      <span className="text-lg font-bold tabular-nums"
        style={{ color: gold ? 'var(--gold)' : '#e4e4e7' }}>{value}</span>
      <span className="text-[11px] text-zinc-600">/ {total} {label}</span>
    </div>
  )
}

function Divider() {
  return <div className="hidden h-8 w-px sm:block" style={{ background: 'rgba(212,175,55,0.1)' }} />
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-40 text-center">
      <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl"
        style={{ background: 'rgba(212,175,55,0.05)', border: '1px solid rgba(212,175,55,0.12)' }}>
        <TrendingUp className="h-7 w-7" style={{ color: 'var(--gold-dim)' }} />
      </div>
      <p className="text-sm font-semibold text-zinc-300">No trends yet</p>
      <p className="mt-1.5 text-xs text-zinc-600">POST to /api/trends to populate the dashboard</p>
    </div>
  )
}
