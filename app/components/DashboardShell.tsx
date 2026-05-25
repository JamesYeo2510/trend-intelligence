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

/* ── Geometric Background ──────────────────────────────────── */

function GeometricBackground() {
  return (
    <div
      aria-hidden="true"
      style={{
        position: 'fixed',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 0,
      }}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="100%"
        height="100%"
        viewBox="0 0 1920 900"
        preserveAspectRatio="xMidYMid slice"
      >
        {/* Plexus polygon network — triangulated gold lines */}
        <g stroke="#C9A840" fill="none" strokeWidth="0.8" opacity="0.42">
          {/* Left cluster */}
          <line x1="50"  y1="200" x2="130" y2="80" />
          <line x1="130" y1="80"  x2="310" y2="190" />
          <line x1="50"  y1="200" x2="310" y2="190" />
          <line x1="50"  y1="200" x2="220" y2="340" />
          <line x1="220" y1="340" x2="310" y2="190" />
          <line x1="310" y1="190" x2="420" y2="270" />
          <line x1="220" y1="340" x2="420" y2="270" />
          <line x1="80"  y1="370" x2="50"  y2="200" />
          <line x1="80"  y1="370" x2="220" y2="340" />
          <line x1="170" y1="460" x2="80"  y2="370" />
          <line x1="170" y1="460" x2="220" y2="340" />
          <line x1="350" y1="390" x2="170" y2="460" />
          <line x1="350" y1="390" x2="220" y2="340" />
          <line x1="350" y1="390" x2="420" y2="270" />
          {/* Upper center */}
          <line x1="420" y1="270" x2="510" y2="50" />
          <line x1="510" y1="50"  x2="620" y2="160" />
          <line x1="420" y1="270" x2="620" y2="160" />
          <line x1="620" y1="160" x2="700" y2="80" />
          <line x1="700" y1="80"  x2="780" y2="240" />
          <line x1="620" y1="160" x2="780" y2="240" />
          <line x1="780" y1="240" x2="700" y2="330" />
          <line x1="620" y1="160" x2="700" y2="330" />
          <line x1="700" y1="330" x2="580" y2="300" />
          <line x1="580" y1="300" x2="420" y2="270" />
          <line x1="580" y1="300" x2="620" y2="160" />
          {/* Center */}
          <line x1="780" y1="240" x2="900" y2="160" />
          <line x1="900" y1="160" x2="980" y2="300" />
          <line x1="780" y1="240" x2="980" y2="300" />
          <line x1="700" y1="330" x2="780" y2="450" />
          <line x1="780" y1="450" x2="980" y2="300" />
          <line x1="900" y1="160" x2="1080" y2="50" />
          <line x1="980" y1="300" x2="1080" y2="50" />
          {/* Upper right cluster */}
          <line x1="1080" y1="50"  x2="1200" y2="140" />
          <line x1="1200" y1="140" x2="1300" y2="70" />
          <line x1="1080" y1="50"  x2="1300" y2="70" />
          <line x1="1200" y1="140" x2="1380" y2="190" />
          <line x1="1300" y1="70"  x2="1380" y2="190" />
          <line x1="1380" y1="190" x2="1460" y2="330" />
          <line x1="1200" y1="140" x2="1340" y2="360" />
          <line x1="1340" y1="360" x2="1460" y2="330" />
          <line x1="1340" y1="360" x2="1380" y2="190" />
          {/* Right edge */}
          <line x1="1460" y1="330" x2="1550" y2="120" />
          <line x1="1550" y1="120" x2="1720" y2="200" />
          <line x1="1460" y1="330" x2="1720" y2="200" />
          <line x1="1720" y1="200" x2="1870" y2="90" />
          <line x1="1550" y1="120" x2="1870" y2="90" />
          <line x1="1720" y1="200" x2="1900" y2="340" />
          <line x1="1460" y1="330" x2="1640" y2="410" />
          <line x1="1640" y1="410" x2="1900" y2="340" />
          <line x1="1720" y1="200" x2="1640" y2="410" />
          {/* Lower left */}
          <line x1="350" y1="390" x2="480" y2="560" />
          <line x1="480" y1="560" x2="600" y2="620" />
          <line x1="350" y1="390" x2="600" y2="620" />
          <line x1="600" y1="620" x2="720" y2="520" />
          <line x1="480" y1="560" x2="720" y2="520" />
          <line x1="720" y1="520" x2="840" y2="660" />
          <line x1="600" y1="620" x2="840" y2="660" />
          <line x1="840" y1="660" x2="950" y2="560" />
          <line x1="720" y1="520" x2="950" y2="560" />
          <line x1="780" y1="450" x2="720" y2="520" />
          {/* Lower right */}
          <line x1="1150" y1="520" x2="1300" y2="600" />
          <line x1="1300" y1="600" x2="1480" y2="540" />
          <line x1="1150" y1="520" x2="1480" y2="540" />
          <line x1="1480" y1="540" x2="1600" y2="650" />
          <line x1="1300" y1="600" x2="1600" y2="650" />
          <line x1="1340" y1="360" x2="1150" y2="520" />
          <line x1="1640" y1="410" x2="1480" y2="540" />
        </g>

        {/* Nodes at polygon junctions */}
        <g fill="#D4AF37">
          <circle cx="50"   cy="200" r="2"   opacity="0.65" />
          <circle cx="130"  cy="80"  r="2.5" opacity="0.8" />
          <circle cx="220"  cy="340" r="2"   opacity="0.65" />
          <circle cx="310"  cy="190" r="2.5" opacity="0.8" />
          <circle cx="80"   cy="370" r="2"   opacity="0.55" />
          <circle cx="170"  cy="460" r="2"   opacity="0.55" />
          <circle cx="350"  cy="390" r="2.5" opacity="0.8" />
          <circle cx="420"  cy="270" r="2"   opacity="0.65" />
          <circle cx="510"  cy="50"  r="2.5" opacity="0.85" />
          <circle cx="580"  cy="300" r="2"   opacity="0.6" />
          <circle cx="620"  cy="160" r="3"   opacity="0.9" />
          <circle cx="700"  cy="80"  r="2"   opacity="0.7" />
          <circle cx="700"  cy="330" r="2"   opacity="0.6" />
          <circle cx="780"  cy="240" r="2.5" opacity="0.8" />
          <circle cx="780"  cy="450" r="2"   opacity="0.6" />
          <circle cx="900"  cy="160" r="2"   opacity="0.65" />
          <circle cx="980"  cy="300" r="2"   opacity="0.55" />
          <circle cx="1080" cy="50"  r="3"   opacity="0.9" />
          <circle cx="1200" cy="140" r="2.5" opacity="0.85" />
          <circle cx="1300" cy="70"  r="2"   opacity="0.7" />
          <circle cx="1380" cy="190" r="3"   opacity="0.9" />
          <circle cx="1460" cy="330" r="2"   opacity="0.65" />
          <circle cx="1340" cy="360" r="2.5" opacity="0.8" />
          <circle cx="1550" cy="120" r="2"   opacity="0.65" />
          <circle cx="1720" cy="200" r="2.5" opacity="0.8" />
          <circle cx="1870" cy="90"  r="2"   opacity="0.7" />
          <circle cx="1900" cy="340" r="2"   opacity="0.55" />
          <circle cx="1640" cy="410" r="2"   opacity="0.6" />
          <circle cx="480"  cy="560" r="2"   opacity="0.55" />
          <circle cx="600"  cy="620" r="2.5" opacity="0.75" />
          <circle cx="720"  cy="520" r="2"   opacity="0.65" />
          <circle cx="840"  cy="660" r="2"   opacity="0.55" />
          <circle cx="950"  cy="560" r="2"   opacity="0.55" />
          <circle cx="1150" cy="520" r="2"   opacity="0.55" />
          <circle cx="1300" cy="600" r="2.5" opacity="0.75" />
          <circle cx="1480" cy="540" r="2"   opacity="0.65" />
          <circle cx="1600" cy="650" r="2"   opacity="0.55" />
        </g>
      </svg>
    </div>
  )
}

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
      <GeometricBackground />
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

  const signals = data?.total_signals ?? '—'
  const drafts  = data?.studio_drafts ?? '—'
  const sync    = data ? `+${data.crossover_pct}%` : '—'

  return (
    <div
      className="w-full border-b px-5 py-5 sm:px-6 lg:px-8"
      style={{
        background: 'linear-gradient(135deg, #000000 0%, #0a0900 50%, #000000 100%)',
        borderColor: 'rgba(212,175,55,0.2)',
      }}
    >
      {/* Terminal header */}
      <div className="mx-auto mb-4 max-w-7xl">
        <div
          className="rounded-lg px-5 py-3 text-center"
          style={{
            background: 'rgba(0,0,0,0.6)',
            border: '1px solid rgba(212,175,55,0.2)',
            boxShadow: '0 0 20px rgba(212,175,55,0.04), inset 0 1px 0 rgba(212,175,55,0.06)',
          }}
        >
          <p
            className="font-mono text-[11px] font-bold tracking-[0.28em]"
            style={{ color: '#d4af37' }}
          >
            [ TREND INTELLIGENCE // SIGNAL RADAR // MULTI-CHANNEL CONVERGENCE ENGINE ]
          </p>
        </div>
      </div>

      {/* 4-column telemetry grid */}
      <div className="mx-auto grid max-w-7xl grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: 'TOTAL SIGNALS',  value: signals },
          { label: 'CROSSOVER SYNC', value: sync,   hint: 'vs yesterday' },
          { label: 'ACTIVE CHANNELS', value: 'GH / RD' },
          { label: 'AI STUDIO',      value: drafts,  hint: 'drafts' },
        ].map(({ label, value, hint }) => (
          <div
            key={label}
            className="rounded p-3 text-center font-mono"
            style={{
              background: 'rgba(0,0,0,0.5)',
              border: '1px solid rgba(212,175,55,0.18)',
            }}
          >
            <p className="mb-1 text-[8px] font-black tracking-[0.2em] text-zinc-600">{label}</p>
            <p className="text-sm font-bold tabular-nums" style={{ color: '#d4af37' }}>
              {value}
              {hint && <span className="ml-1 text-[9px] font-normal text-zinc-600">{hint}</span>}
            </p>
          </div>
        ))}
      </div>
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
      style={{ background: 'rgba(3,3,3,0.98)', borderColor: 'rgba(212,175,55,0.12)' }}
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
          {/* Settings — separate route link, always at bottom */}
          <div className="mt-6 border-t pt-6" style={{ borderColor: 'rgba(212,175,55,0.08)' }}>
            <Link
              href="/settings"
              className="relative flex h-12 w-full items-center gap-3 rounded-md px-3 text-left text-zinc-700 transition-colors hover:text-zinc-400"
            >
              <span className="relative z-10 flex items-center gap-3">
                <Settings className="h-4 w-4" />
                <span className="whitespace-nowrap text-[10px] font-bold uppercase tracking-[0.16em]">
                  Settings
                </span>
              </span>
            </Link>
          </div>
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
