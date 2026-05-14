import Link from 'next/link';
import { TrendingUp, Settings, X, Globe } from 'lucide-react';
import { initSchema, sql } from '@/lib/db';
import type { Target } from '@/lib/db';
import { TargetSection } from './TargetSection';

export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  await initSchema();

  const { rows: targets } = await sql<Target>`
    SELECT * FROM targets ORDER BY type, created_at ASC
  `;

  const twitter = targets.filter((t) => t.type === 'twitter');
  const websites = targets.filter((t) => t.type === 'website');

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
        <div className="mx-auto max-w-5xl px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-zinc-100">
              <TrendingUp className="h-4 w-4 text-zinc-900" strokeWidth={2.5} />
            </div>
            <div>
              <p className="text-sm font-semibold leading-none text-zinc-100">Trend Intelligence</p>
              <p className="mt-0.5 text-[11px] leading-none text-zinc-500 tracking-wide">
                Signal over noise
              </p>
            </div>
          </div>

          <nav className="flex items-center gap-2">
            <Link
              href="/"
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-medium transition-colors text-zinc-500 hover:text-zinc-300"
              style={{ border: '1px solid rgba(255,255,255,0.06)' }}
            >
              Dashboard
            </Link>
            <Link
              href="/settings"
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-medium transition-colors text-indigo-400"
              style={{
                border: '1px solid rgba(99,102,241,0.3)',
                background: 'rgba(99,102,241,0.08)',
              }}
            >
              <Settings className="h-3 w-3" />
              Settings
            </Link>
          </nav>
        </div>
      </header>

      {/* Main */}
      <main className="mx-auto max-w-5xl px-6 py-10">
        {/* Page heading */}
        <div className="mb-8">
          <div className="mb-1 flex items-center gap-2">
            <Settings className="h-4 w-4 text-zinc-600" />
            <h1 className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">
              Intelligence Targets
            </h1>
          </div>
          <p className="text-[12px] text-zinc-600">
            Manage the Twitter accounts and websites scraped on each{' '}
            <code
              className="rounded px-1.5 py-0.5 text-[11px] font-mono text-zinc-400"
              style={{ background: 'rgba(255,255,255,0.06)' }}
            >
              POST /api/scrape
            </code>{' '}
            run. Toggle the indicator to pause a source without deleting it.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {/* Twitter accounts */}
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

          {/* Websites */}
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

        {/* Active counts */}
        <div
          className="mt-8 rounded-xl px-5 py-4 flex flex-wrap items-center gap-6"
          style={{
            background: 'rgba(255,255,255,0.02)',
            border: '1px solid rgba(255,255,255,0.05)',
          }}
        >
          <Stat label="Twitter active" value={twitter.filter((t) => t.active).length} total={twitter.length} />
          <div className="h-8 w-px" style={{ background: 'rgba(255,255,255,0.06)' }} />
          <Stat label="Websites active" value={websites.filter((t) => t.active).length} total={websites.length} />
          <div className="h-8 w-px" style={{ background: 'rgba(255,255,255,0.06)' }} />
          <Stat
            label="Total active"
            value={targets.filter((t) => t.active).length}
            total={targets.length}
            accent
          />
        </div>
      </main>
    </div>
  );
}

function Stat({
  label,
  value,
  total,
  accent,
}: {
  label: string;
  value: number;
  total: number;
  accent?: boolean;
}) {
  return (
    <div className="flex items-baseline gap-1.5">
      <span
        className={`text-lg font-bold tabular-nums ${accent ? 'text-indigo-400' : 'text-zinc-200'}`}
      >
        {value}
      </span>
      <span className="text-[11px] text-zinc-600">
        / {total} {label}
      </span>
    </div>
  );
}
