'use client'

import { useEffect, useOptimistic, useRef, useState, useTransition } from 'react'
import {
  ArrowUp,
  Check,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Copy,
  Crown,
  ExternalLink,
  GitFork,
  Globe,
  ImageIcon,
  Loader2,
  MessageSquare,
  Search,
  Sparkles,
  Star,
  X,
} from 'lucide-react'
import { generateTrendImage, updateManualRating } from '@/app/actions'
import type { TrendAnalysis, UnifiedSignal } from '@/lib/db'

type TrendWithImage = UnifiedSignal
type ContentTypeId = 'linkedin' | 'ig_carousel' | 'blog' | 'all'

const STUDIO_ITEMS: Array<{ id: ContentTypeId; label: string; color: string; loadLabel: string }> = [
  { id: 'linkedin',    label: 'LinkedIn Post',      color: '#f97316', loadLabel: 'Drafting post…'       },
  { id: 'ig_carousel', label: 'Instagram Carousel', color: '#ec4899', loadLabel: 'Architecting slides…' },
  { id: 'blog',        label: 'Blog Outline',        color: '#a78bfa', loadLabel: 'Outlining article…'  },
]

/* ── Helpers ─────────────────────────────────────────────── */

function formatMetric(value: number | null | undefined): string {
  if (value == null) return '-'
  if (value >= 1000) {
    const c = value / 1000
    return `${c >= 10 ? c.toFixed(0) : c.toFixed(1)}k`
  }
  return value.toString()
}

function getSourceInfo(url: string | null): { Icon: typeof Globe; domain: string } {
  if (!url) return { Icon: Globe, domain: 'Unknown' }
  const lower = url.toLowerCase()
  const Icon = lower.includes('x.com') || lower.includes('twitter.com') ? X : Globe
  try {
    return { Icon, domain: new URL(url).hostname.replace('www.', '') }
  } catch {
    return { Icon, domain: url }
  }
}

function ScoreBadge({ score }: { score: number | null }) {
  if (score === null) return null
  const color = score >= 9 ? '#fbbf24' : score >= 7 ? '#a78bfa' : score >= 5 ? '#6b7280' : '#ef4444'
  return (
    <span
      className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-bold tabular-nums"
      style={{ color, background: `${color}18`, border: `1px solid ${color}28` }}
    >
      {score}<span className="ml-0.5 font-normal opacity-50">/10</span>
    </span>
  )
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  const handleCopy = async () => {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <button
      onClick={handleCopy}
      className="flex items-center gap-1 rounded px-2 py-1 text-[10px] font-medium transition-colors"
      style={{
        background: copied ? 'rgba(52,211,153,0.1)' : 'rgba(255,255,255,0.05)',
        border: '1px solid rgba(255,255,255,0.08)',
        color: copied ? '#34d399' : '#71717a',
      }}
    >
      {copied ? <Check className="h-2.5 w-2.5" /> : <Copy className="h-2.5 w-2.5" />}
      {copied ? 'Copied' : 'Copy'}
    </button>
  )
}

/* ── Analysis Block ─────────────────────────────────────── */

const ANALYSIS_FIELDS: Array<{ key: keyof TrendAnalysis; label: string; accent?: boolean; italic?: boolean }> = [
  { key: 'why_now',          label: 'WHY NOW',          accent: true },
  { key: 'who_cares',        label: 'WHO CARES' },
  { key: 'recommended_move', label: 'RECOMMENDED MOVE' },
  { key: 'content_angle',    label: 'CONTENT ANGLE',    italic: true },
]

function AnalysisBlock({ analysis }: { analysis: TrendAnalysis }) {
  return (
    <div
      className="mt-2 space-y-2.5 rounded-lg px-3 py-2.5"
      style={{ background: 'rgba(212,175,55,0.03)', border: '1px solid rgba(212,175,55,0.1)' }}
    >
      {ANALYSIS_FIELDS.map(({ key, label, accent, italic }) => (
        <div key={key}>
          <p className="mb-0.5 text-[8px] font-black tracking-[0.18em]"
            style={{ color: accent ? '#d4af37' : '#52525b' }}>
            {label}
          </p>
          <p className={`text-[11px] leading-relaxed text-zinc-400 ${italic ? 'italic' : ''}`}>
            {analysis[key]}
          </p>
        </div>
      ))}
    </div>
  )
}

/* ── Source Inspector Modal ──────────────────────────────── */

function InspectModal({ trend, onClose }: { trend: TrendWithImage; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(10px)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl rounded-2xl overflow-hidden"
        style={{
          background: '#0a0a0a',
          border: '1px solid rgba(212,175,55,0.25)',
          boxShadow: '0 40px 100px rgba(0,0,0,0.9), 0 0 0 1px rgba(212,175,55,0.08)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-3"
          style={{ borderBottom: '1px solid rgba(212,175,55,0.12)' }}
        >
          <div className="flex items-center gap-2 min-w-0">
            <span className="shrink-0 text-[8px] font-black tracking-[0.25em] text-zinc-600">
              SOURCE INSPECTOR
            </span>
            <span className="text-zinc-800">·</span>
            <span className="truncate text-[11px] font-semibold text-zinc-300">{trend.title}</span>
          </div>
          <button
            onClick={onClose}
            className="ml-3 shrink-0 rounded px-2 py-1 text-[10px] font-bold text-zinc-600 transition-colors hover:text-zinc-300"
            style={{ border: '1px solid rgba(255,255,255,0.08)' }}
          >
            [ ✕ Close ]
          </button>
        </div>

        {/* Split panels */}
        <div className="grid grid-cols-2" style={{ borderColor: 'rgba(212,175,55,0.1)' }}>
          {/* Left: GitHub */}
          <div className="p-5" style={{ borderRight: '1px solid rgba(212,175,55,0.1)' }}>
            <p className="mb-3 text-[8px] font-black tracking-[0.22em]" style={{ color: 'rgba(212,175,55,0.6)' }}>
              GITHUB
            </p>
            {trend.signal_type === 'github' ? (
              <div className="space-y-3">
                {trend.source_url ? (
                  <a
                    href={trend.source_url}
                    target="_blank"
                    rel="noreferrer"
                    className="block text-[13px] font-semibold leading-snug text-zinc-100 transition-colors hover:text-yellow-300"
                  >
                    {trend.title}
                  </a>
                ) : (
                  <p className="text-[13px] font-semibold text-zinc-100">{trend.title}</p>
                )}
                <div className="flex flex-wrap items-center gap-3 text-[11px]">
                  {trend.stars != null && (
                    <span className="flex items-center gap-1 font-semibold tabular-nums" style={{ color: '#d4af37' }}>
                      <Star className="h-3 w-3" strokeWidth={2} />
                      {formatMetric(trend.stars)} stars
                    </span>
                  )}
                  {trend.language && (
                    <span
                      className="rounded px-1.5 py-0.5 text-[9px] font-semibold"
                      style={{ background: 'rgba(212,175,55,0.08)', border: '1px solid rgba(212,175,55,0.18)', color: '#d4af37' }}
                    >
                      {trend.language}
                    </span>
                  )}
                </div>
                {trend.summary && (
                  <p className="text-[11px] leading-relaxed text-zinc-500 line-clamp-5">{trend.summary}</p>
                )}
              </div>
            ) : (
              <p className="text-[11px] italic text-zinc-700">No linked GitHub repository for this signal.</p>
            )}
          </div>

          {/* Right: Reddit */}
          <div className="p-5">
            <p className="mb-3 text-[8px] font-black tracking-[0.22em] text-orange-600/70">REDDIT</p>
            {trend.signal_type === 'reddit' ? (
              <div className="space-y-3">
                {trend.subreddit && (
                  <span
                    className="inline-block rounded px-1.5 py-0.5 text-[9px] font-bold"
                    style={{ background: 'rgba(249,115,22,0.12)', border: '1px solid rgba(249,115,22,0.22)', color: '#fb923c' }}
                  >
                    r/{trend.subreddit}
                  </span>
                )}
                {trend.source_url ? (
                  <a
                    href={trend.source_url}
                    target="_blank"
                    rel="noreferrer"
                    className="block text-[13px] font-semibold leading-snug text-zinc-100 transition-colors hover:text-orange-300"
                  >
                    {trend.title}
                  </a>
                ) : (
                  <p className="text-[13px] font-semibold text-zinc-100">{trend.title}</p>
                )}
                <div className="flex items-center gap-4 text-[11px]">
                  <span className="flex items-center gap-1 font-semibold tabular-nums" style={{ color: '#d4af37' }}>
                    <ArrowUp className="h-3 w-3" strokeWidth={2} />
                    {formatMetric(trend.upvotes ?? trend.score)} upvotes
                  </span>
                  <span className="flex items-center gap-1 tabular-nums text-zinc-500">
                    <MessageSquare className="h-3 w-3" strokeWidth={2} />
                    {formatMetric(trend.num_comments)} comments
                  </span>
                </div>
                {trend.summary && (
                  <p className="text-[11px] leading-relaxed text-zinc-500 line-clamp-5">{trend.summary}</p>
                )}
              </div>
            ) : (
              <p className="text-[11px] italic text-zinc-700">No linked Reddit thread for this signal.</p>
            )}
          </div>
        </div>

        {/* Footer hint */}
        <div
          className="px-5 py-2 text-center text-[9px] text-zinc-700"
          style={{ borderTop: '1px solid rgba(212,175,55,0.08)' }}
        >
          Click outside to close
        </div>
      </div>
    </div>
  )
}

/* ── Creative Studio Dropdown ────────────────────────────── */

function StudioDropdown({ onSelect, savedTypes }: { onSelect: (id: ContentTypeId) => void; savedTypes: string[] }) {
  return (
    <div
      className="absolute bottom-full right-0 z-30 mb-1.5 w-52 rounded-xl py-1.5"
      style={{
        background: 'rgba(10,10,10,0.99)',
        border: '1px solid rgba(212,175,55,0.15)',
        boxShadow: '0 16px 48px rgba(0,0,0,0.8)',
        animation: 'studioDropIn 0.14s ease-out',
      }}
    >
      <style>{`
        @keyframes studioDropIn {
          from { opacity: 0; transform: translateY(4px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0)  scale(1);    }
        }
      `}</style>

      <p className="px-3 pb-1 pt-0.5 text-[9px] font-bold uppercase tracking-[0.18em] text-zinc-600">
        Creative Studio
      </p>

      {STUDIO_ITEMS.map(({ id, label, color }) => {
        const saved = savedTypes.includes(id)
        return (
          <button
            key={id}
            onClick={() => onSelect(id)}
            className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-[11px] transition-colors hover:bg-white/5"
            style={{ color: saved ? color : '#a1a1aa' }}
          >
            <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: color, opacity: saved ? 1 : 0.4 }} />
            {label}
            {saved && <Check className="ml-auto h-2.5 w-2.5" style={{ color }} />}
          </button>
        )
      })}

      <div className="mx-3 my-1 border-t" style={{ borderColor: 'rgba(255,255,255,0.06)' }} />

      <button
        onClick={() => onSelect('all')}
        className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-[11px] font-semibold transition-colors hover:bg-white/5"
        style={{ color: '#e4e4e7' }}
      >
        <Sparkles className="h-3 w-3 shrink-0 text-amber-400" />
        Generate All Assets
        {savedTypes.length >= 3 && <Check className="ml-auto h-2.5 w-2.5 text-emerald-400" />}
      </button>
    </div>
  )
}

/* ── Main component ──────────────────────────────────────── */

export function TrendCard({ trend }: { trend: TrendWithImage }) {
  const [summaryOpen,  setSummaryOpen]  = useState(false)
  const [inspectOpen,  setInspectOpen]  = useState(false)
  const [imageUrl,     setImageUrl]     = useState<string | null>(trend.image_url)
  const [isGenerating, setIsGenerating] = useState(false)
  const [imageError,   setImageError]   = useState<string | null>(null)
  const [studioOpen,   setStudioOpen]   = useState(false)
  const [generating,   setGenerating]   = useState<ContentTypeId | null>(null)
  const [savedTypes,   setSavedTypes]   = useState<string[]>([])
  const [justSaved,    setJustSaved]    = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const [optimisticRating, setOptimisticRating] = useOptimistic(
    trend.manual_rating ?? 0,
    (current: number, delta: number) => current + delta,
  )
  const [isPending, startTransition] = useTransition()

  const { Icon, domain } = getSourceInfo(trend.source_url)
  const isElite    = trend.score !== null && trend.score >= 9
  const signalType = trend.signal_type ?? 'scraped'

  const formattedDate = new Date(trend.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

  useEffect(() => {
    if (!studioOpen) return
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setStudioOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [studioOpen])

  const vote = (delta: number) => {
    startTransition(async () => {
      setOptimisticRating(delta)
      await updateManualRating(trend.id, delta)
    })
  }

  const handleGenerateImage = async () => {
    setIsGenerating(true)
    setImageError(null)
    const result = await generateTrendImage(trend.id, trend.title)
    setIsGenerating(false)
    if (result.url) setImageUrl(result.url)
    else setImageError(result.error ?? 'Failed')
  }

  const handleStudio = async (contentType: ContentTypeId) => {
    if (generating) return
    setGenerating(contentType)
    setStudioOpen(false)
    try {
      const res = await fetch('/api/creative-studio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          trendData: {
            id: trend.id,
            source_id: trend.source_id,
            title: trend.title,
            summary: trend.summary,
            source_url: trend.source_url,
            score: trend.score,
            signal_type: signalType,
            analysis: trend.analysis,
            repo_name: trend.repo_name,
            stars: trend.stars,
            forks: trend.forks,
            language: trend.language,
            subreddit: trend.subreddit,
            upvotes: trend.upvotes,
            num_comments: trend.num_comments,
          },
          contentType,
        }),
      })
      if (res.ok) {
        setSavedTypes((prev) => {
          const next = new Set(prev)
          if (contentType === 'all') { next.add('linkedin'); next.add('ig_carousel'); next.add('blog') }
          else next.add(contentType)
          return [...next]
        })
        setJustSaved(true)
        setTimeout(() => setJustSaved(false), 2200)
      }
    } finally {
      setGenerating(null)
    }
  }

  const studioLabel = (() => {
    if (justSaved) return '✓ Saved to Vault'
    if (generating) return STUDIO_ITEMS.find((t) => t.id === generating)?.loadLabel ?? 'Drafting mix…'
    if (trend.asset_status != null) return 'Regenerate'
    return 'Studio'
  })()

  const studioColor = justSaved ? '#34d399'
    : generating ? (STUDIO_ITEMS.find((t) => t.id === generating)?.color ?? '#a78bfa')
    : studioOpen  ? '#c4b5fd'
    : '#52525b'

  return (
    <>
      <article className={`card-matte noise relative flex flex-col rounded-2xl ${isElite ? 'elite glow-elite' : ''}`}>
        {/* Elite shimmer */}
        {isElite && (
          <div className="absolute inset-x-0 top-0 h-px"
            style={{ background: 'linear-gradient(90deg, transparent, #d4af37 50%, transparent)' }} />
        )}

        {/* Generated image */}
        {imageUrl && (
          <div className="relative h-36 w-full overflow-hidden rounded-t-2xl">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={imageUrl} alt="" className="h-full w-full object-cover"
              style={{ filter: 'brightness(0.8) saturate(0.9)' }} />
            <div className="absolute inset-0"
              style={{ background: 'linear-gradient(to bottom, transparent 40%, var(--bg-card))' }} />
          </div>
        )}

        {/* Header row */}
        <div className="flex items-start justify-between gap-3 px-4 pt-4 pb-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <Icon className="h-3 w-3 shrink-0 text-zinc-600" strokeWidth={2} />
            <span className="truncate text-[11px] text-zinc-500">{domain}</span>
            <span className="text-zinc-700">·</span>
            <span className="shrink-0 text-[11px] text-zinc-600">{formattedDate}</span>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            {/* GitHub badge — gold */}
            {signalType === 'github' && (
              <span className="rounded px-1.5 py-0.5 text-[9px] font-bold"
                style={{ color: '#d4af37', background: 'rgba(212,175,55,0.08)', border: '1px solid rgba(212,175,55,0.22)' }}>
                GH
              </span>
            )}
            {/* Reddit badge — orange */}
            {signalType === 'reddit' && (
              <span className="rounded px-1.5 py-0.5 text-[9px] font-bold"
                style={{ background: 'rgba(249,115,22,0.12)', border: '1px solid rgba(249,115,22,0.22)', color: '#fb923c' }}>
                r/
              </span>
            )}
            {isElite && (
              <span
                className="inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-black tracking-[0.2em]"
                style={{ color: '#d4af37', background: 'rgba(212,175,55,0.08)', border: '1px solid rgba(212,175,55,0.2)' }}
              >
                <Crown className="h-2 w-2" strokeWidth={2.5} />
                ELITE
              </span>
            )}
            {trend.asset_status === 'published' && (
              <span className="inline-flex shrink-0 items-center gap-1 rounded px-1.5 py-0.5 text-[9px] font-bold"
                style={{ background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.22)', color: '#34d399' }}>
                ✓ Posted
              </span>
            )}
          </div>
        </div>

        {/* Title */}
        <div className="px-4 pb-1">
          <h2 className="text-[13px] font-semibold leading-snug text-zinc-100 line-clamp-2">{trend.title}</h2>
        </div>

        {/* Expandable summary + intelligence block */}
        {(trend.analysis || trend.summary) && (
          <div className="px-4 pb-2">
            <button
              onClick={() => setSummaryOpen((o) => !o)}
              className="flex items-center gap-1 text-[11px] text-zinc-600 transition-colors hover:text-zinc-400"
            >
              <ChevronRight
                className="h-3 w-3 transition-transform duration-150"
                style={{ transform: summaryOpen ? 'rotate(90deg)' : 'rotate(0deg)' }}
                strokeWidth={2.5}
              />
              {summaryOpen
                ? (trend.analysis ? 'Hide intel' : 'Hide summary')
                : (trend.analysis ? 'Intel' : 'Summary')}
            </button>
            {summaryOpen && (
              <>
                {trend.summary && (
                  <p className="mt-2 rounded-lg px-3 py-2 text-[11px] leading-relaxed text-zinc-500"
                    style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                    {trend.summary}
                  </p>
                )}
                {trend.analysis && <AnalysisBlock analysis={trend.analysis} />}
              </>
            )}
          </div>
        )}

        {/* Signal metrics row */}
        {signalType !== 'scraped' && (
          <div className="mx-4 mb-3 flex items-center gap-3 rounded-lg px-3 py-2"
            style={{ background: 'rgba(212,175,55,0.03)', border: '1px solid rgba(212,175,55,0.1)' }}>
            {signalType === 'github' && (
              <>
                {trend.stars != null && (
                  <span className="flex items-center gap-1 text-[11px] font-semibold tabular-nums" style={{ color: '#d4af37' }}>
                    <Star className="h-3 w-3" strokeWidth={2} />
                    {formatMetric(trend.stars)}
                  </span>
                )}
                {trend.forks != null && (
                  <span className="flex items-center gap-1 text-[11px] tabular-nums" style={{ color: 'rgba(212,175,55,0.5)' }}>
                    <GitFork className="h-3 w-3" strokeWidth={2} />
                    {formatMetric(trend.forks)}
                  </span>
                )}
                {trend.language && (
                  <span className="ml-auto rounded px-1.5 py-0.5 text-[9px] font-semibold"
                    style={{ background: 'rgba(212,175,55,0.08)', border: '1px solid rgba(212,175,55,0.15)', color: '#d4af37' }}>
                    {trend.language}
                  </span>
                )}
              </>
            )}
            {signalType === 'reddit' && (
              <>
                <span className="flex items-center gap-1 text-[11px] font-semibold tabular-nums" style={{ color: '#d4af37' }}>
                  <ArrowUp className="h-3 w-3" strokeWidth={2} />
                  {formatMetric(trend.upvotes ?? trend.score)}
                </span>
                <span className="flex items-center gap-1 text-[11px] tabular-nums text-zinc-600">
                  <MessageSquare className="h-3 w-3" strokeWidth={2} />
                  {formatMetric(trend.num_comments)}
                </span>
                {trend.subreddit && (
                  <span className="ml-auto rounded px-1.5 py-0.5 text-[9px] font-bold"
                    style={{ background: 'rgba(249,115,22,0.12)', border: '1px solid rgba(249,115,22,0.2)', color: '#fb923c' }}>
                    r/{trend.subreddit}
                  </span>
                )}
              </>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="mt-auto flex items-center justify-between px-4 py-3"
          style={{ borderTop: '1px solid rgba(212,175,55,0.08)' }}>

          {/* Left: score + image gen + Studio + Inspect */}
          <div className="flex items-center gap-2">
            <ScoreBadge score={trend.score} />

            {/* Image gen — only for scraped */}
            {!imageUrl && signalType === 'scraped' && (
              <button
                onClick={handleGenerateImage}
                disabled={isGenerating}
                title={imageError ?? 'Generate AI visual'}
                className="text-zinc-700 transition-colors hover:text-amber-400 disabled:opacity-40"
              >
                {isGenerating ? <Sparkles className="h-3 w-3 animate-pulse" /> : <ImageIcon className="h-3 w-3" />}
              </button>
            )}

            {/* External link — scraped only (GH/Reddit have dedicated right-side links) */}
            {signalType === 'scraped' && trend.source_url && (
              <a href={trend.source_url} target="_blank" rel="noopener noreferrer"
                className="text-zinc-700 transition-colors hover:text-zinc-400" aria-label="Open source">
                <ExternalLink className="h-3 w-3" />
              </a>
            )}

            {/* Creative Studio */}
            <div ref={dropdownRef} className="relative">
              <button
                onClick={() => { if (!generating) setStudioOpen((o) => !o) }}
                disabled={!!generating}
                className="flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium transition-all disabled:cursor-wait"
                style={{
                  background: studioOpen || generating || justSaved ? `${studioColor}14` : 'transparent',
                  border: `1px solid ${studioOpen || generating || justSaved ? `${studioColor}28` : 'transparent'}`,
                  color: studioColor,
                }}
              >
                {generating   ? <Loader2 className="h-2.5 w-2.5 animate-spin" />
                  : justSaved ? <Check className="h-2.5 w-2.5" />
                  : <Sparkles className="h-2.5 w-2.5" />}
                <span>{studioLabel}</span>
                {!generating && !justSaved && (
                  <ChevronDown className="h-2.5 w-2.5 transition-transform duration-150"
                    style={{ transform: studioOpen ? 'rotate(180deg)' : 'rotate(0deg)' }} />
                )}
              </button>
              {studioOpen && <StudioDropdown onSelect={handleStudio} savedTypes={savedTypes} />}
            </div>

            {/* Inspect Sources — icon button */}
            <button
              onClick={() => setInspectOpen(true)}
              title="Inspect Sources"
              aria-label="Inspect Sources"
              className="flex h-6 w-6 items-center justify-center rounded transition-all hover:brightness-150"
              style={{
                color: 'rgba(212,175,55,0.5)',
                border: '1px solid rgba(212,175,55,0.18)',
                background: 'rgba(212,175,55,0.04)',
              }}
            >
              <Search className="h-3 w-3" />
            </button>
          </div>

          {/* Right: contextual actions */}
          {signalType === 'github' && (
            <div className="flex items-center gap-2">
              {trend.stars != null && (
                <span className="flex items-center gap-1 text-[10px] tabular-nums font-semibold" style={{ color: 'rgba(212,175,55,0.6)' }}>
                  <Star className="h-2.5 w-2.5" strokeWidth={2} />
                  {formatMetric(trend.stars)}
                </span>
              )}
              {trend.source_url && (
                <a
                  href={trend.source_url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium transition-colors hover:brightness-125"
                  style={{ color: '#d4af37', border: '1px solid rgba(212,175,55,0.22)', background: 'rgba(212,175,55,0.06)' }}
                >
                  <ExternalLink className="h-2.5 w-2.5" />
                  Open Repo
                </a>
              )}
            </div>
          )}

          {signalType === 'reddit' && (
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1 text-[10px] tabular-nums font-semibold text-orange-500/70">
                <ArrowUp className="h-2.5 w-2.5" strokeWidth={2} />
                {formatMetric(trend.upvotes ?? trend.score)}
              </span>
              {trend.source_url && (
                <a
                  href={trend.source_url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium transition-colors hover:brightness-125"
                  style={{ color: '#fb923c', border: '1px solid rgba(249,115,22,0.22)', background: 'rgba(249,115,22,0.06)' }}
                >
                  <ExternalLink className="h-2.5 w-2.5" />
                  Open Thread
                </a>
              )}
            </div>
          )}

          {signalType === 'scraped' && (
            <div className="flex items-center gap-0.5">
              <button onClick={() => vote(-1)} disabled={isPending} aria-label="Downvote"
                className="flex h-6 w-6 items-center justify-center rounded-md text-zinc-600 transition-colors hover:bg-red-400/10 hover:text-red-400 disabled:opacity-30">
                <ChevronDown className="h-3.5 w-3.5" strokeWidth={2.5} />
              </button>
              <span className={['w-7 text-center text-[11px] font-bold tabular-nums',
                optimisticRating > 0 ? 'text-emerald-400' : optimisticRating < 0 ? 'text-red-400' : 'text-zinc-700',
              ].join(' ')}>
                {optimisticRating > 0 ? `+${optimisticRating}` : optimisticRating}
              </span>
              <button onClick={() => vote(1)} disabled={isPending} aria-label="Upvote"
                className="flex h-6 w-6 items-center justify-center rounded-md text-zinc-600 transition-colors hover:bg-emerald-400/10 hover:text-emerald-400 disabled:opacity-30">
                <ChevronUp className="h-3.5 w-3.5" strokeWidth={2.5} />
              </button>
            </div>
          )}
        </div>
      </article>

      {/* Source Inspector Modal — rendered outside article to escape stacking context */}
      {inspectOpen && <InspectModal trend={trend} onClose={() => setInspectOpen(false)} />}
    </>
  )
}
