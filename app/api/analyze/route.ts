import Anthropic from '@anthropic-ai/sdk'
import { initSchema, sql } from '@/lib/db'
import type { TrendAnalysis } from '@/lib/db'

export const dynamic = 'force-dynamic'

const BANNED_PHRASES = [
  'revolutionary', 'game-changing', 'groundbreaking', 'paradigm shift',
  'disruptive', 'synergy', 'seamlessly', 'robust', 'leverage', 'unprecedented',
  'cutting-edge', 'next-generation', 'transformative', 'innovative ecosystem',
  'holistic', 'streamline',
]

function readCronSecret(request: Request): string | null {
  const bearer = request.headers.get('authorization')?.match(/^Bearer\s+(.+)$/i)?.[1]?.trim()
  return (
    bearer ??
    request.headers.get('x-cron-secret')?.trim() ??
    request.headers.get('cron_secret')?.trim() ??
    null
  )
}

function isAuthorized(request: Request): boolean {
  const expected = process.env.CRON_SECRET?.trim()
  if (!expected) return true
  return readCronSecret(request) === expected
}

// Walks balanced braces to extract the first complete JSON object from a string
function extractJson(text: string): TrendAnalysis {
  let depth = 0
  let start = -1
  let inString = false
  let escape = false

  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (escape) { escape = false; continue }
    if (ch === '\\' && inString) { escape = true; continue }
    if (ch === '"') { inString = !inString; continue }
    if (inString) continue
    if (ch === '{') { if (depth === 0) start = i; depth++ }
    else if (ch === '}') {
      depth--
      if (depth === 0 && start !== -1) return JSON.parse(text.slice(start, i + 1)) as TrendAnalysis
    }
  }
  throw new Error('No complete JSON object found in model response')
}

// Sanitize field values to avoid breaking JSON — truncate and strip control chars
function sanitize(value: unknown, maxLen = 300): string {
  return String(value ?? '').replace(/[\x00-\x1f\x7f]/g, ' ').slice(0, maxLen)
}

function buildContext(row: Record<string, unknown>, signalType: 'github' | 'reddit'): string {
  if (signalType === 'github') {
    return [
      `Repo: ${sanitize(row.name)}`,
      `Stars: ${row.stars ?? 'N/A'}`,
      `Language: ${sanitize(row.language) || 'N/A'}`,
      `Description: ${sanitize(row.description) || '(none)'}`,
      `AI-related: ${row.is_ai_dev ? 'yes' : 'no'}`,
      `Period: ${sanitize(row.period) || 'N/A'}`,
    ].join('\n')
  }
  return [
    `Subreddit: r/${sanitize(row.subreddit) || 'unknown'}`,
    `Title: ${sanitize(row.title)}`,
    `Score: ${row.score ?? 'N/A'}`,
    `Comments: ${row.num_comments ?? 'N/A'}`,
    `Body: ${sanitize(row.description) || '(none)'}`,
  ].join('\n')
}

async function analyzeOne(
  client: Anthropic,
  row: Record<string, unknown>,
  signalType: 'github' | 'reddit',
): Promise<TrendAnalysis> {
  const context = buildContext(row, signalType)
  const bannedList = BANNED_PHRASES.join(', ')

  const message = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 512,
    messages: [
      {
        role: 'user',
        content: `You are a sharp business intelligence analyst. Analyze this ${signalType} signal.

Return ONLY a valid JSON object with exactly these four string fields — no markdown, no explanation:
{
  "why_now": "1-2 sentences on what market condition makes this relevant THIS WEEK",
  "who_cares": "1-2 sentences on the specific audience and their commercial stake",
  "recommended_move": "1-2 sentences on the concrete action a builder or marketer should take",
  "content_angle": "1 sentence on the specific hook to publish about this"
}

Rules:
- Banned words (using any fails the task): ${bannedList}
- No filler like "This is significant because..."
- Be specific. Use numbers, names, or concrete details.
- Max 2 sentences per field.

Signal:
${context}`,
      },
      // Prefill forces the model to continue from '{' — guarantees JSON-first output
      { role: 'assistant', content: '{' },
    ],
  })

  const partial = message.content[0].type === 'text' ? message.content[0].text.trim() : ''
  const raw = '{' + partial

  return extractJson(raw)
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let signalType: 'github' | 'reddit'
  let limit: number

  try {
    const body = (await request.json()) as { signal_type?: string; limit?: number }
    if (body.signal_type !== 'github' && body.signal_type !== 'reddit') {
      return Response.json({ error: 'signal_type must be "github" or "reddit"' }, { status: 400 })
    }
    signalType = body.signal_type
    limit = typeof body.limit === 'number' && body.limit > 0 ? Math.min(body.limit, 20) : 10
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  await initSchema()

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  if (!process.env.ANTHROPIC_API_KEY) {
    return Response.json({ error: 'ANTHROPIC_API_KEY not set' }, { status: 500 })
  }

  let rows: Array<Record<string, unknown>>

  if (signalType === 'github') {
    const result = await sql`
      SELECT id, name, stars, language, description, is_ai_dev, period
      FROM github_intelligence
      WHERE analysis IS NULL
      ORDER BY scraped_at DESC, stars DESC NULLS LAST
      LIMIT ${limit}
    `
    rows = result.rows as Array<Record<string, unknown>>
  } else {
    const result = await sql`
      SELECT id, post_id, subreddit, title, description, score, num_comments
      FROM reddit_intelligence
      WHERE analysis IS NULL
      ORDER BY scraped_at DESC, score DESC NULLS LAST
      LIMIT ${limit}
    `
    rows = result.rows as Array<Record<string, unknown>>
  }

  if (rows.length === 0) {
    return Response.json({ analyzed: 0, message: 'No unanalyzed records found' })
  }

  let analyzed = 0
  let failed = 0

  for (const row of rows) {
    try {
      const analysis = await analyzeOne(client, row, signalType)
      const id = row.id as number

      if (signalType === 'github') {
        await sql`
          UPDATE github_intelligence
          SET analysis = ${JSON.stringify(analysis)}::jsonb
          WHERE id = ${id}
        `
      } else {
        await sql`
          UPDATE reddit_intelligence
          SET analysis = ${JSON.stringify(analysis)}::jsonb
          WHERE id = ${id}
        `
      }
      analyzed++
    } catch {
      failed++
    }
    // Small delay to avoid hitting Anthropic rate limits on batch runs
    await new Promise((r) => setTimeout(r, 200))
  }

  return Response.json({ analyzed, failed, total: rows.length })
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  await initSchema()

  const [gh, rd] = await Promise.all([
    sql`SELECT COUNT(*) AS total, COUNT(analysis) AS analyzed FROM github_intelligence`,
    sql`SELECT COUNT(*) AS total, COUNT(analysis) AS analyzed FROM reddit_intelligence`,
  ])

  return Response.json({
    github: gh.rows[0],
    reddit: rd.rows[0],
  })
}
