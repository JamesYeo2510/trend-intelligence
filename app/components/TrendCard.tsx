'use client'

import { useState, useOptimistic, useTransition } from 'react'
import {
  Globe, X, Crown, ChevronUp, ChevronDown,
  ExternalLink, ChevronRight, Sparkles, ImageIcon,
  Pencil, Copy, Check, Loader2,
} from 'lucide-react'
import { updateManualRating, generateTrendImage, generateLinkedInDraft } from '@/app/actions'
import type { Trend } from '@/lib/db'

type TrendWithImage = Trend & { image_url: string | null }

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

/* ── Main component ──────────────────────────────────────── */

export function TrendCard({ trend }: { trend: TrendWithImage }) {
  const [summaryOpen, setSummaryOpen] = useState(false)
  const [draftOpen, setDraftOpen] = useState(false)
  const [draftContent, setDraftContent] = useState<string | null>(null)
  const [isDrafting, setIsDrafting] = useState(false)
  const [draftError, setDraftError] = useState<string | null>(null)

  const [imageUrl, setImageUrl] = useState<string | null>(trend.image_url)
  const [isGenerating, setIsGenerating] = useState(false)
  const [imageError, setImageError] = useState<string | null>(null)

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

  const handleGenerateDraft = async () => {
    if (draftContent) { setDraftOpen((o) => !o); return }
    setIsDrafting(true)
    setDraftError(null)
    setDraftOpen(true)
    const result = await generateLinkedInDraft(
      trend.id,
      trend.title,
      trend.summary ?? trend.title,
    )
    setIsDrafting(false)
    if (result.content) setDraftContent(result.content)
    else setDraftError(result.error ?? 'Generation failed')
  }

  return (
    <article
      className={`card-matte noise relative flex flex-col rounded-2xl overflow-hidden ${isElite ? 'elite glow-elite' : ''}`}
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
        <div className="relative h-36 w-full overflow-hidden">
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

      {/* LinkedIn Draft panel */}
      {draftOpen && (
        <div className="mx-4 mb-3 rounded-xl overflow-hidden" style={{ border: '1px solid rgba(99,102,241,0.2)' }}>
          {/* Panel header */}
          <div
            className="flex items-center justify-between px-3 py-2"
            style={{ background: 'rgba(99,102,241,0.08)', borderBottom: '1px solid rgba(99,102,241,0.12)' }}
          >
            <div className="flex items-center gap-1.5">
              <Pencil className="h-2.5 w-2.5 text-indigo-400" />
              <span className="text-[10px] font-semibold tracking-wide text-indigo-400">LINKEDIN DRAFT</span>
            </div>
            {draftContent && <CopyButton text={draftContent} />}
          </div>

          {/* Panel body */}
          <div className="px-3 py-3" style={{ background: 'rgba(99,102,241,0.04)' }}>
            {isDrafting && (
              <div className="flex items-center gap-2 py-4 justify-center">
                <Loader2 className="h-3.5 w-3.5 animate-spin text-indigo-400" />
                <span className="text-[11px] text-zinc-500">Drafting post…</span>
              </div>
            )}
            {draftError && !isDrafting && (
              <p className="text-[11px] text-red-400 py-2">{draftError}</p>
            )}
            {draftContent && !isDrafting && (
              <p className="text-[11px] leading-relaxed text-zinc-300 whitespace-pre-wrap">
                {draftContent}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Footer */}
      <div
        className="mt-auto flex items-center justify-between px-4 py-3"
        style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}
      >
        {/* Left: score + links + actions */}
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
          {/* LinkedIn draft button */}
          <button
            onClick={handleGenerateDraft}
            disabled={isDrafting}
            title="Generate LinkedIn draft"
            className={[
              'flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium transition-all disabled:opacity-40',
              draftOpen
                ? 'text-indigo-400'
                : 'text-zinc-600 hover:text-indigo-400',
            ].join(' ')}
            style={draftOpen ? { background: 'rgba(99,102,241,0.1)' } : {}}
          >
            <Pencil className="h-2.5 w-2.5" />
            <span>Draft</span>
          </button>
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
