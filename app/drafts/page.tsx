import Link from 'next/link'
import { sql } from '@/lib/db'
import type { Draft } from '@/lib/db'
import { ArrowLeft, Pencil } from 'lucide-react'
import { CopyDraftButton } from './CopyDraftButton'

export const dynamic = 'force-dynamic'

type DraftRow = Draft & { trend_title: string; trend_score: number | null }

export default async function DraftsPage() {
  const { rows: drafts } = await sql<DraftRow>`
    SELECT
      d.id,
      d.trend_id,
      d.content,
      d.created_at,
      t.title  AS trend_title,
      t.score  AS trend_score
    FROM drafts d
    JOIN trends t ON t.id = d.trend_id
    ORDER BY d.created_at DESC
  `

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-base)' }}>
      {/* Header */}
      <header
        className="sticky top-0 z-10 backdrop-blur-md"
        style={{
          background: 'rgba(12,12,14,0.85)',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        <div className="mx-auto max-w-4xl px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="flex items-center gap-1.5 text-zinc-600 hover:text-zinc-300 transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span className="text-xs">Dashboard</span>
            </Link>
            <span className="text-zinc-800">/</span>
            <div className="flex items-center gap-2">
              <Pencil className="h-3.5 w-3.5 text-indigo-400" />
              <span className="text-sm font-semibold text-zinc-100">LinkedIn Drafts</span>
            </div>
          </div>
          <span
            className="text-[10px] font-semibold tabular-nums px-2 py-0.5 rounded-full"
            style={{
              background: 'rgba(99,102,241,0.1)',
              border: '1px solid rgba(99,102,241,0.2)',
              color: '#818cf8',
            }}
          >
            {drafts.length} {drafts.length === 1 ? 'draft' : 'drafts'}
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-10">
        {drafts.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="flex flex-col gap-5">
            {drafts.map((draft) => (
              <DraftCard key={draft.id} draft={draft} />
            ))}
          </div>
        )}
      </main>
    </div>
  )
}

function DraftCard({ draft }: { draft: DraftRow }) {
  const formattedDate = new Date(draft.created_at).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

  const scoreColor =
    draft.trend_score !== null && draft.trend_score >= 9
      ? '#fbbf24'
      : draft.trend_score !== null && draft.trend_score >= 7
        ? '#a78bfa'
        : '#6b7280'

  return (
    <article
      className="rounded-2xl overflow-hidden"
      style={{
        background: 'var(--bg-card)',
        border: '1px solid rgba(99,102,241,0.15)',
      }}
    >
      {/* Card header */}
      <div
        className="flex items-center justify-between gap-4 px-5 py-3"
        style={{
          background: 'rgba(99,102,241,0.06)',
          borderBottom: '1px solid rgba(99,102,241,0.1)',
        }}
      >
        <div className="flex items-center gap-2 min-w-0">
          {draft.trend_score !== null && (
            <span
              className="shrink-0 text-[9px] font-bold tabular-nums rounded px-1.5 py-0.5"
              style={{
                color: scoreColor,
                background: `${scoreColor}18`,
                border: `1px solid ${scoreColor}28`,
              }}
            >
              {draft.trend_score}/10
            </span>
          )}
          <span className="truncate text-[11px] font-medium text-zinc-300">
            {draft.trend_title}
          </span>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <span className="text-[10px] text-zinc-600">{formattedDate}</span>
          <CopyDraftButton content={draft.content} />
        </div>
      </div>

      {/* Draft content */}
      <div className="px-5 py-4">
        <p className="text-[12px] leading-relaxed text-zinc-400 whitespace-pre-wrap">
          {draft.content}
        </p>
      </div>
    </article>
  )
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-40 text-center">
      <div
        className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl"
        style={{
          background: 'rgba(99,102,241,0.06)',
          border: '1px solid rgba(99,102,241,0.15)',
        }}
      >
        <Pencil className="h-7 w-7 text-indigo-500/50" />
      </div>
      <p className="text-sm font-semibold text-zinc-300">No drafts yet</p>
      <p className="mt-1.5 text-xs text-zinc-600">
        Click <span className="text-indigo-400">Draft</span> on any trend card to generate a LinkedIn post
      </p>
    </div>
  )
}
