<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Trend Intelligence — Agent Context

## Project
A Next.js 16 (App Router) trend intelligence dashboard. Uses React 19, Tailwind CSS v4, TypeScript, and the Anthropic SDK for AI features.

## Stack
- **Framework**: Next.js 16.2.3 (App Router) — read `node_modules/next/dist/docs/` before using any Next.js API
- **UI**: React 19, Tailwind CSS v4, lucide-react icons
- **AI**: `@anthropic-ai/sdk` v0.88+ for Claude integration
- **DB**: `@vercel/postgres` for data persistence
- **Image gen**: `@fal-ai/client`

## Key files
- `app/page.tsx` — main dashboard
- `app/actions.ts` — Server Actions
- `app/api/trends/route.ts` — trends API (GET/POST)
- `app/api/trends/[id]/route.ts` — single trend API
- `app/components/TrendCard.tsx` — trend display component
- `app/drafts/page.tsx` — drafts view
- `lib/` — shared utilities
- `migrations/` — DB migration files

## Conventions
- Use Server Components by default; add `"use client"` only when needed
- Server Actions go in `app/actions.ts` or co-located `actions.ts` files
- API routes use Next.js Route Handlers (`route.ts`)
- Tailwind v4 uses `@import "tailwindcss"` — no `tailwind.config.js` needed
- TypeScript strict mode — no `any` types

## Commands
```bash
npm run dev    # start dev server on :3000
npm run build  # production build
npm run lint   # ESLint
```
