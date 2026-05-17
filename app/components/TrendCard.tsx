'use client'

import { useEffect, useOptimistic, useRef, useState, useTransition } from 'react'
import {
  Check,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Copy,
  Crown,
  ExternalLink,
  Globe,
  ImageIcon,
  Loader2,
  Sparkles,
  X,
} from 'lucide-react'
import { generateTrendImage, updateManualRating } from '@/app/actions'
import type { Trend } from '@/lib/db'

type TrendWithImage = Trend & { image_url: string | null }
type ContentTypeId = 'linkedin' | 'ig_carousel' | 'blog' | 'all'

/* ── Studio content type config ────────────────────────────── */

const STUDIO_ITEMS: Array<{
  id: ContentTypeId
  label: string
  color: string
  loadLabel: string
}> = [
  { id: 'linkedin',    label: 'LinkedIn Post',      color: '#f97316', loadLabel: 'Drafting post…'       },
  { id: 'ig_carousel', label: 'Instagram Carousel', color: '#ec4899', loadLabel: 'Architecting slides…' },
  { id: 'blog',        label: 'Blog Outline',        color: '#a78bfa', loadLabel: 'Outlining article…'  },
]

/* ── Helpers ─────────────────────────────────────────────── */

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
  const color =
    score >= 9 ? '#fbbf24' :
    score >= 7 ? '#a78bfa' :
    score >= 5 ? '#6b7280' : '#ef4444'
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

/* ── Creative Studio Dropdown ────────────────────────────── */

function StudioDropdown({
  onSelect,
  savedTypes,
}: {
  onSelect: (id: ContentTypeId) => void
  savedTypes: string[]
}) {
  return (
    <div
      className="absolute bottom-full right-0 z-30 mb-1.5 w-52 rounded-xl py-1.5"
      style={{
        background: 'rgba(12,12,18,0.98)',
        border: '1px solid rgba(255,255,255,0.09)',
        boxShadow: '0 16px 48px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.03)',
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
            <span
              className="h-1.5 w-1.5 shrink-0 rounded-full"
              style={{ background: color, opacity: saved ? 1 : 0.4 }}
            />
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
  const [summaryOpen, setSummaryOpen] = useState(false)

  const [imageUrl, setImageUrl] = useState<string | null>(trend.image_url)
  const [isGenerating, setIsGenerating] = useState(false)
  const [imageError, setImageError] = useState<string | null>(null)

  const [studioOpen, setStudioOpen] = useState(false)
  const [generating, setGenerating] = useState<ContentTypeId | null>(null)
  const [savedTypes, setSavedTypes] = useState<string[]>([])
  const [justSaved, setJustSaved] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const [optimisticRating, setOptimisticRating] = useOptimistic(
    trend.manual_rating ?? 0,
    (current: number, delta: number) => current + delta,
  )
  const [isPending, startTransition] = useTransition()

  const { Icon, domain } = getSourceInfo(trend.source_url)
  const isElite = trend.score !== null && trend.score >= 9

  const formattedDate = new Date(trend.created_at).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric',
  })

  // Close dropdown on outside click
  useEffect(() => {
    if (!studioOpen) return
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setStudioOpen(false)
      }
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
            title: trend.title,
            summary: trend.summary,
            source_url: trend.source_url,
            score: trend.score,
          },
          contentType,
        }),
      })
      if (res.ok) {
        setSavedTypes((prev) => {
          const next = new Set(prev)
          if (contentType === 'all') {
            next.add('linkedin'); next.add('ig_carousel'); next.add('blog')
          } else {
            next.add(contentType)
          }
          return [...next]
        })
        setJustSaved(true)
        setTimeout(() => setJustSaved(false), 2200)
      }
    } finally {
      setGenerating(null)
    }
  }

  // Derive label for the Studio button
  const studioLabel = (() => {
    if (justSaved) return '✓ Saved to Vault'
    if (generating) {
      return STUDIO_ITEMS.find((t) => t.id === generating)?.loadLabel ?? 'Drafting mix…'
    }
    return 'Studio'
  })()

  const studioColor = justSaved
    ? '#34d399'
    : generating
    ? (STUDIO_ITEMS.find((t) => t.id === generating)?.color ?? '#a78bfa')
    : studioOpen
    ? '#c4b5fd'
    : '#52525b'

  return (
    // overflow-visible lets the Studio dropdown escape the card bounds.
    // The image container below handles its own overflow-hidden independently.
    <article
      className={`card-matte noise relative flex flex-col rounded-2xl ${isElite ? 'elite glow-elite' : ''}`}
    >
      {/* Elite shimmer line */}
      {isElite && (
        <div
          className="absolute inset-x-0 top-0 h-px"
          style={{ background: 'linear-gradient(90deg, transparent, #fbbf24 50%, transparent)' }}
        />
      )}

      {/* Generated image */}
      {imageUrl && (
        <div className="relative h-36 w-full overflow-hidden rounded-t-2xl">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageUrl}
            alt=""
            className="h-full w-full object-cover"
            style={{ filter: 'brightness(0.8) saturate(0.9)' }}
          />
          <div
            className="absolute inset-0"
            style={{ background: 'linear-gradient(to bottom, transparent 40%, var(--bg-card))' }}
          />
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
        {isElite && (
          <span
            className="inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-black tracking-[0.2em] text-amber-400"
            style={{ background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.2)' }}
          >
            <Crown className="h-2 w-2" strokeWidth={2.5} />
            ELITE
          </span>
        )}
      </div>

      {/* Title */}
      <div className="px-4 pb-1">
        <h2 className="text-[13px] font-semibold leading-snug text-zinc-100 line-clamp-2">
          {trend.title}
        </h2>
      </div>

      {/* Expandable summary */}
      {trend.summary && (
        <div className="px-4 pb-2">
          <button
            onClick={() => setSummaryOpen((o) => !o)}
            className="flex items-center gap-1 text-[11px] text-zinc-600 hover:text-zinc-400 transition-colors"
          >
            <ChevronRight
              className="h-3 w-3 transition-transform duration-150"
              style={{ transform: summaryOpen ? 'rotate(90deg)' : 'rotate(0deg)' }}
              strokeWidth={2.5}
            />
            {summaryOpen ? 'Hide summary' : 'Summary'}
          </button>
          {summaryOpen && (
            <p
              className="mt-2 text-[11px] leading-relaxed text-zinc-500 rounded-lg px-3 py-2"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}
            >
              {trend.summary}
            </p>
          )}
        </div>
      )}

      {/* Footer */}
      <div
        className="mt-auto flex items-center justify-between px-4 py-3"
        style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}
      >
        {/* Left: score + links + image gen + Creative Studio */}
        <div className="flex items-center gap-2">
          <ScoreBadge score={trend.score} />

          {trend.source_url && (
            <a
              href={trend.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-zinc-700 hover:text-zinc-400 transition-colors"
              aria-label="Open source"
            >
              <ExternalLink className="h-3 w-3" />
            </a>
          )}

          {/* Generate image button */}
          {!imageUrl && (
            <button
              onClick={handleGenerateImage}
              disabled={isGenerating}
              title={imageError ?? 'Generate AI visual'}
              className="text-zinc-700 hover:text-amber-400 transition-colors disabled:opacity-40"
            >
              {isGenerating
                ? <Sparkles className="h-3 w-3 animate-pulse" />
                : <ImageIcon className="h-3 w-3" />}
            </button>
          )}

          {/* Creative Studio dropdown trigger */}
          <div ref={dropdownRef} className="relative">
            <button
              onClick={() => { if (!generating) setStudioOpen((o) => !o) }}
              disabled={!!generating}
              className="flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium transition-all disabled:cursor-wait"
              style={{
                background: studioOpen || generating || justSaved
                  ? `${studioColor}14`
                  : 'transparent',
                border: `1px solid ${studioOpen || generating || justSaved ? `${studioColor}28` : 'transparent'}`,
                color: studioColor,
              }}
            >
              {generating
                ? <Loader2 className="h-2.5 w-2.5 animate-spin" />
                : justSaved
                ? <Check className="h-2.5 w-2.5" />
                : <Sparkles className="h-2.5 w-2.5" />}
              <span>{studioLabel}</span>
              {!generating && !justSaved && (
                <ChevronDown
                  className="h-2.5 w-2.5 transition-transform duration-150"
                  style={{ transform: studioOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
                />
              )}
            </button>

            {studioOpen && (
              <StudioDropdown onSelect={handleStudio} savedTypes={savedTypes} />
            )}
          </div>
        </div>

        {/* Right: vote controls */}
        <div className="flex items-center gap-0.5">
          <button
            onClick={() => vote(-1)}
            disabled={isPending}
            aria-label="Downvote"
            className="flex h-6 w-6 items-center justify-center rounded-md text-zinc-600 hover:text-red-400 hover:bg-red-400/10 transition-colors disabled:opacity-30"
          >
            <ChevronDown className="h-3.5 w-3.5" strokeWidth={2.5} />
          </button>
          <span
            className={[
              'w-7 text-center text-[11px] font-bold tabular-nums',
              optimisticRating > 0 ? 'text-emerald-400' :
              optimisticRating < 0 ? 'text-red-400' : 'text-zinc-700',
            ].join(' ')}
          >
            {optimisticRating > 0 ? `+${optimisticRating}` : optimisticRating}
          </span>
          <button
            onClick={() => vote(1)}
            disabled={isPending}
            aria-label="Upvote"
            className="flex h-6 w-6 items-center justify-center rounded-md text-zinc-600 hover:text-emerald-400 hover:bg-emerald-400/10 transition-colors disabled:opacity-30"
          >
            <ChevronUp className="h-3.5 w-3.5" strokeWidth={2.5} />
          </button>
        </div>
      </div>
    </article>
  )
}
