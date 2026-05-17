'use client'

import { useCallback, useEffect, useState } from 'react'
import type { ReactNode, JSX } from 'react'
import { Archive, Check, ChevronLeft, ChevronRight, Copy, Loader2, X } from 'lucide-react'
import type { ContentVault } from '@/lib/db'
import type { CarouselContent, CarouselSlide } from '@/lib/creativeStudio'

type FilterType = 'all' | 'linkedin' | 'ig_carousel' | 'blog'

const PLATFORM = {
  linkedin: {
    label: 'LinkedIn',
    color: '#f97316',
    bg: 'rgba(249,115,22,0.1)',
    border: 'rgba(249,115,22,0.25)',
  },
  ig_carousel: {
    label: 'Instagram',
    color: '#ec4899',
    bg: 'rgba(236,72,153,0.1)',
    border: 'rgba(236,72,153,0.25)',
  },
  blog: {
    label: 'Deep-Dive',
    color: '#a78bfa',
    bg: 'rgba(167,139,250,0.1)',
    border: 'rgba(167,139,250,0.25)',
  },
}

// ─── Utilities ───────────────────────────────────────────────────────────────

function timeAgo(dateStr: string): string {
  const diffMs = Date.now() - new Date(dateStr).getTime()
  const diffMin = Math.floor(diffMs / 60_000)
  const diffHr = Math.floor(diffMin / 60)
  const diffDay = Math.floor(diffHr / 24)
  if (diffMin < 1) return 'just now'
  if (diffMin < 60) return `${diffMin}m ago`
  if (diffHr < 24) return `${diffHr}h ago`
  if (diffDay < 7) return `${diffDay}d ago`
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function getTeaser(asset: ContentVault): string {
  if (asset.content_type === 'ig_carousel') {
    const c = asset.generated_content as CarouselContent
    return c?.slides?.[0]?.body ?? ''
  }
  const text = asset.generated_content as string
  if (typeof text !== 'string') return ''
  return text.length > 120 ? text.slice(0, 120).trimEnd() + '…' : text
}

// ─── Lightweight Markdown Renderer (no external dependency) ──────────────────

function parseInline(text: string): JSX.Element {
  // Split on **bold** and *italic* tokens, preserving the tokens
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g)
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return (
            <strong key={i} className="font-semibold text-zinc-100">
              {part.slice(2, -2)}
            </strong>
          )
        }
        if (part.startsWith('*') && part.endsWith('*')) {
          return (
            <em key={i} className="italic text-zinc-300">
              {part.slice(1, -1)}
            </em>
          )
        }
        return <span key={i}>{part}</span>
      })}
    </>
  )
}

function MarkdownBlock({ content }: { content: string }) {
  const lines = content.split('\n')
  const output: JSX.Element[] = []
  let currentList: string[] = []
  let listKey = 0

  const flushList = () => {
    if (!currentList.length) return
    const items = currentList.slice()
    output.push(
      <ul key={`ul-${listKey++}`} className="my-2 space-y-1 pl-4">
        {items.map((item, i) => (
          <li key={i} className="list-disc text-[12px] leading-relaxed text-zinc-300">
            {parseInline(item)}
          </li>
        ))}
      </ul>
    )
    currentList = []
  }

  lines.forEach((line, i) => {
    if (line.startsWith('- ') || line.startsWith('* ')) {
      currentList.push(line.slice(2))
      return
    }
    flushList()

    if (line.startsWith('### ')) {
      output.push(
        <h3 key={i} className="mt-5 mb-1.5 text-[13px] font-bold text-zinc-100">
          {parseInline(line.slice(4))}
        </h3>,
      )
    } else if (line.startsWith('## ')) {
      output.push(
        <h2
          key={i}
          className="mt-6 mb-2 border-b border-white/5 pb-1.5 text-[14px] font-bold text-zinc-50"
        >
          {parseInline(line.slice(3))}
        </h2>,
      )
    } else if (line.startsWith('# ')) {
      output.push(
        <h1 key={i} className="mb-3 text-[15px] font-bold text-white">
          {parseInline(line.slice(2))}
        </h1>,
      )
    } else if (line.trim() === '') {
      output.push(<div key={i} className="h-2" />)
    } else {
      output.push(
        <p key={i} className="text-[12px] leading-relaxed text-zinc-300">
          {parseInline(line)}
        </p>,
      )
    }
  })
  flushList()

  return <div className="space-y-0.5">{output}</div>
}

// ─── Shared Primitives ────────────────────────────────────────────────────────

function PlatformBadge({ type }: { type: ContentVault['content_type'] }) {
  const p = PLATFORM[type]
  return (
    <span
      className="inline-flex items-center rounded px-1.5 py-0.5 text-[9px] font-bold tracking-[0.14em]"
      style={{ color: p.color, background: p.bg, border: `1px solid ${p.border}` }}
    >
      {p.label.toUpperCase()}
    </span>
  )
}

function CopyButton({ text, label = 'Copy' }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <button
      onClick={handleCopy}
      className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-medium transition-all"
      style={{
        background: copied ? 'rgba(52,211,153,0.1)' : 'rgba(255,255,255,0.05)',
        border: `1px solid ${copied ? 'rgba(52,211,153,0.3)' : 'rgba(255,255,255,0.08)'}`,
        color: copied ? '#34d399' : '#a1a1aa',
      }}
    >
      {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
      {copied ? 'Copied!' : label}
    </button>
  )
}

// ─── VaultCard ────────────────────────────────────────────────────────────────

function VaultCard({
  asset,
  onReview,
}: {
  asset: ContentVault
  onReview: (a: ContentVault) => void
}) {
  const p = PLATFORM[asset.content_type]
  const teaser = getTeaser(asset)

  return (
    <article
      className="flex flex-col rounded-xl p-4"
      style={{
        background: 'rgba(15,23,42,0.5)',
        border: '1px solid rgba(255,255,255,0.06)',
        boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
        transition: 'box-shadow 0.2s ease, border-color 0.2s ease, transform 0.15s ease',
      }}
      onMouseEnter={(e) => {
        const el = e.currentTarget as HTMLElement
        el.style.boxShadow = `0 8px 32px rgba(0,0,0,0.35), 0 0 0 1px ${p.border}`
        el.style.transform = 'translateY(-1px)'
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget as HTMLElement
        el.style.boxShadow = '0 4px 20px rgba(0,0,0,0.2)'
        el.style.transform = 'translateY(0)'
      }}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <PlatformBadge type={asset.content_type} />
        <span className="text-[10px] text-zinc-600">{timeAgo(asset.created_at)}</span>
      </div>

      <h3 className="mb-1.5 line-clamp-2 text-[13px] font-semibold leading-snug text-zinc-100">
        {asset.title}
      </h3>

      <p className="mb-4 line-clamp-2 text-[11px] leading-relaxed text-zinc-500">{teaser}</p>

      <button
        onClick={() => onReview(asset)}
        className="mt-auto w-full rounded-lg py-2 text-[11px] font-semibold transition-all hover:brightness-125"
        style={{
          background: p.bg,
          border: `1px solid ${p.border}`,
          color: p.color,
        }}
      >
        Review Asset
      </button>
    </article>
  )
}

// ─── Modal Shell ──────────────────────────────────────────────────────────────

const MODAL_KEYFRAMES = `
  @keyframes vaultOverlayIn { from { opacity: 0; } to { opacity: 1; } }
  @keyframes vaultPanelIn  { from { opacity: 0; transform: translateY(10px) scale(0.985); } to { opacity: 1; transform: translateY(0) scale(1); } }
`

function ModalShell({
  title,
  onClose,
  wide = false,
  children,
}: {
  title: string
  onClose: () => void
  wide?: boolean
  children: ReactNode
}) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{
        background: 'rgba(0,0,0,0.85)',
        backdropFilter: 'blur(12px)',
        animation: 'vaultOverlayIn 0.18s ease-out',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <style>{MODAL_KEYFRAMES}</style>

      <div
        className={`relative w-full ${wide ? 'max-w-2xl' : 'max-w-lg'} rounded-2xl p-6`}
        style={{
          background: 'rgba(10,10,14,0.99)',
          border: '1px solid rgba(255,255,255,0.09)',
          boxShadow: '0 32px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.03)',
          animation: 'vaultPanelIn 0.22s ease-out',
        }}
      >
        <div className="mb-5 flex items-start justify-between gap-4">
          <h2 className="pr-8 text-[13px] font-semibold leading-snug text-zinc-100">{title}</h2>
          <button
            onClick={onClose}
            className="shrink-0 rounded-lg p-1.5 text-zinc-600 transition-colors hover:bg-white/5 hover:text-zinc-300"
            style={{ border: '1px solid rgba(255,255,255,0.06)' }}
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        {children}
      </div>
    </div>
  )
}

// ─── Carousel Modal ───────────────────────────────────────────────────────────

function CarouselModal({ asset, onClose }: { asset: ContentVault; onClose: () => void }) {
  const [slideIdx, setSlideIdx] = useState(0)
  const carousel = asset.generated_content as CarouselContent
  const slides: CarouselSlide[] = carousel?.slides ?? []
  const total = slides.length
  const slide = slides[slideIdx]
  const slideText = slide ? `${slide.heading}\n\n${slide.body}` : ''

  return (
    <ModalShell title={`IG Carousel — ${asset.title}`} onClose={onClose}>
      {/* Progress row */}
      <div className="mb-4 flex items-center justify-between gap-3">
        <span className="text-[10px] font-medium text-zinc-600">
          Slide <span className="font-bold text-pink-400">{slideIdx + 1}</span> of {total}
        </span>
        <div className="flex items-center gap-1">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => setSlideIdx(i)}
              aria-label={`Go to slide ${i + 1}`}
              style={{
                height: '4px',
                width: i === slideIdx ? '16px' : '4px',
                borderRadius: '9999px',
                background: i === slideIdx ? '#ec4899' : 'rgba(255,255,255,0.12)',
                transition: 'width 0.2s ease, background 0.2s ease',
              }}
            />
          ))}
        </div>
      </div>

      {/* Slide card */}
      {slide && (
        <div
          className="mb-5 min-h-[160px] rounded-xl p-5"
          style={{
            background:
              'linear-gradient(135deg, rgba(236,72,153,0.08) 0%, rgba(10,10,14,0.5) 100%)',
            border: '1px solid rgba(236,72,153,0.2)',
          }}
        >
          <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.2em] text-pink-400">
            {slide.heading}
          </p>
          <p className="text-[13px] leading-relaxed text-zinc-200">{slide.body}</p>
        </div>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between gap-3">
        <button
          onClick={() => setSlideIdx((i) => Math.max(0, i - 1))}
          disabled={slideIdx === 0}
          className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-[11px] font-medium text-zinc-400 transition-all hover:bg-white/5 hover:text-zinc-100 disabled:cursor-not-allowed disabled:opacity-25"
          style={{ border: '1px solid rgba(255,255,255,0.07)' }}
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          Prev
        </button>

        <CopyButton text={slideText} label="Copy This Slide" />

        <button
          onClick={() => setSlideIdx((i) => Math.min(total - 1, i + 1))}
          disabled={slideIdx === total - 1}
          className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-[11px] font-medium text-zinc-400 transition-all hover:bg-white/5 hover:text-zinc-100 disabled:cursor-not-allowed disabled:opacity-25"
          style={{ border: '1px solid rgba(255,255,255,0.07)' }}
        >
          Next
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </ModalShell>
  )
}

// ─── Text / Markdown Modal ────────────────────────────────────────────────────

function TextModal({ asset, onClose }: { asset: ContentVault; onClose: () => void }) {
  const content = typeof asset.generated_content === 'string' ? asset.generated_content : ''
  const p = PLATFORM[asset.content_type]
  const typeLabel = asset.content_type === 'linkedin' ? 'LinkedIn Post' : 'Blog Outline'

  return (
    <ModalShell title={`${typeLabel} — ${asset.title}`} onClose={onClose} wide>
      <div className="mb-4 flex items-center justify-between gap-3">
        <span className="text-[10px] uppercase tracking-widest text-zinc-700">Preview</span>
        <CopyButton text={content} label="Copy Entire Asset" />
      </div>

      <div
        className="max-h-[65vh] overflow-y-auto rounded-xl p-5"
        style={{
          background: 'rgba(255,255,255,0.015)',
          border: `1px solid ${p.border}`,
          scrollbarWidth: 'thin',
          scrollbarColor: 'rgba(255,255,255,0.1) transparent',
        }}
      >
        <MarkdownBlock content={content} />
      </div>
    </ModalShell>
  )
}

// ─── Empty State ──────────────────────────────────────────────────────────────

function EmptyVault() {
  return (
    <div className="flex flex-col items-center justify-center py-32 text-center">
      <div
        className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl"
        style={{
          background: 'rgba(167,139,250,0.06)',
          border: '1px solid rgba(167,139,250,0.12)',
        }}
      >
        <Archive className="h-6 w-6 text-zinc-600" />
      </div>
      <p className="text-sm font-semibold text-zinc-400">No assets yet</p>
      <p className="mt-1.5 max-w-xs text-[11px] leading-relaxed text-zinc-600">
        POST to /api/creative-studio with a trend to generate LinkedIn posts, Instagram carousels,
        and blog outlines.
      </p>
    </div>
  )
}

// ─── Tab Root ─────────────────────────────────────────────────────────────────

export function ContentVaultTab() {
  const [assets, setAssets] = useState<ContentVault[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<FilterType>('all')
  const [activeAsset, setActiveAsset] = useState<ContentVault | null>(null)

  const fetchAssets = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/creative-studio')
      if (res.ok) setAssets(await res.json())
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchAssets()
  }, [fetchAssets])

  const filtered =
    filter === 'all' ? assets : assets.filter((a) => a.content_type === filter)

  const filterTabs: Array<{ id: FilterType; label: string }> = [
    { id: 'all', label: 'All Assets' },
    { id: 'linkedin', label: 'LinkedIn' },
    { id: 'ig_carousel', label: 'Instagram' },
    { id: 'blog', label: 'Deep-Dives' },
  ]

  return (
    <section>
      {/* Section header */}
      <div className="mb-5 flex items-center gap-2">
        <Archive className="h-3.5 w-3.5 text-purple-400/80" />
        <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-purple-400/80">
          Content Vault
        </h2>
        <div className="h-px flex-1" style={{ background: 'rgba(167,139,250,0.14)' }} />
        {assets.length > 0 && (
          <span className="text-[10px] text-zinc-600">{assets.length} assets</span>
        )}
      </div>

      {/* Filter bar */}
      <div className="mb-6 flex flex-wrap items-center gap-1.5">
        {filterTabs.map((tab) => {
          const isActive = filter === tab.id
          const count =
            tab.id === 'all'
              ? assets.length
              : assets.filter((a) => a.content_type === tab.id).length
          return (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id)}
              className="rounded-lg px-3 py-1.5 text-[11px] font-medium transition-all duration-150"
              style={{
                background: isActive ? 'rgba(167,139,250,0.12)' : 'transparent',
                border: `1px solid ${isActive ? 'rgba(167,139,250,0.3)' : 'rgba(255,255,255,0.06)'}`,
                color: isActive ? '#c4b5fd' : '#52525b',
              }}
            >
              {tab.label}
              {count > 0 && (
                <span
                  className="ml-1.5 text-[9px]"
                  style={{ color: isActive ? '#a78bfa' : '#3f3f46' }}
                >
                  {count}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Bento grid */}
      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-5 w-5 animate-spin text-zinc-600" />
        </div>
      ) : filtered.length === 0 ? (
        <EmptyVault />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((asset) => (
            <VaultCard key={asset.id} asset={asset} onReview={setActiveAsset} />
          ))}
        </div>
      )}

      {/* Review modal */}
      {activeAsset &&
        (activeAsset.content_type === 'ig_carousel' ? (
          <CarouselModal asset={activeAsset} onClose={() => setActiveAsset(null)} />
        ) : (
          <TextModal asset={activeAsset} onClose={() => setActiveAsset(null)} />
        ))}
    </section>
  )
}
