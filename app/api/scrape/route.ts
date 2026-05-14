import Anthropic from '@anthropic-ai/sdk';
import { revalidatePath } from 'next/cache';
import { initSchema, sql } from '@/lib/db';
import type { Target } from '@/lib/db';
import { scrapeTwitterAccounts } from '@/lib/apify-scraper';
import { scrapeWebsites } from '@/lib/firecrawl-scraper';

interface ExtractedTrend {
  title: string;
  summary: string;
  source_url: string;
  score: number;
}

function readCronSecret(request: Request): string | null {
  const bearer = request.headers.get('authorization')?.match(/^Bearer\s+(.+)$/i)?.[1]?.trim();
  return (
    bearer ??
    request.headers.get('x-cron-secret')?.trim() ??
    request.headers.get('cron_secret')?.trim() ??
    null
  );
}

function isAuthorizedCronRequest(request: Request): boolean {
  const expected = process.env.CRON_SECRET?.trim();
  if (!expected) return true;

  return readCronSecret(request) === expected;
}

export async function POST(request: Request) {
  if (!isAuthorizedCronRequest(request)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await initSchema();

    const { rows: targetRows } = await sql<Target>`
      SELECT * FROM targets WHERE active = true
    `;
    const twitterHandles = targetRows
      .filter((t) => t.type === 'twitter')
      .map((t) => t.value);
    const websiteUrls = targetRows
      .filter((t) => t.type === 'website')
      .map((t) => t.value);

    const [tweetResult, pageResult] = await Promise.allSettled([
      twitterHandles.length > 0
        ? scrapeTwitterAccounts(twitterHandles)
        : Promise.resolve([]),
      websiteUrls.length > 0
        ? scrapeWebsites(websiteUrls)
        : Promise.resolve([]),
    ]);

    const scrapeErrors: string[] = [];
    const tweets = tweetResult.status === 'fulfilled' ? tweetResult.value : [];
    const pages = pageResult.status === 'fulfilled' ? pageResult.value : [];

    if (tweetResult.status === 'rejected') {
      scrapeErrors.push(
        `x: ${tweetResult.reason instanceof Error ? tweetResult.reason.message : 'Unknown error'}`
      );
    }

    if (pageResult.status === 'rejected') {
      scrapeErrors.push(
        `websites: ${pageResult.reason instanceof Error ? pageResult.reason.message : 'Unknown error'}`
      );
    }

    const tweetContext = tweets
      .map((t) => `@${t.author}: ${t.text}${t.url ? ` (${t.url})` : ''}`)
      .join('\n');

    const webContext = pages
      .map((p) => `### ${p.title}\nURL: ${p.url}\n\n${p.markdown}`)
      .join('\n\n---\n\n');

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return Response.json({ error: 'ANTHROPIC_API_KEY not set' }, { status: 500 });
    }

    const client = new Anthropic({ apiKey });

    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2048,
      messages: [
        {
          role: 'user',
          content: `You are a trend analyst. Extract the 5–10 most significant AI and marketing trends from the content below.

Return a JSON array only — no markdown, no explanation. Each item must have:
- "title": concise headline, max 10 words
- "summary": 2–3 sentences on why this matters commercially
- "source_url": the most relevant URL from the content for this trend
- "score": integer 1–100 reflecting signal strength and recency

TWEETS FROM TRACKED ACCOUNTS:
${tweetContext || '(none)'}

SCRAPED WEB CONTENT:
${webContext || '(none)'}`,
        },
      ],
    });

    const raw =
      message.content[0].type === 'text' ? message.content[0].text.trim() : '';

    let trends: ExtractedTrend[];
    try {
      // strip accidental markdown fences if present
      const cleaned = raw.replace(/^```[a-z]*\n?/i, '').replace(/```$/i, '').trim();
      trends = JSON.parse(cleaned);
    } catch {
      return Response.json({ error: 'Claude returned unparseable JSON', raw }, { status: 500 });
    }

    let inserted = 0;
    for (const trend of trends) {
      try {
        const { rowCount } = await sql`
          INSERT INTO trends (title, summary, source_url, score)
          VALUES (
            ${trend.title},
            ${trend.summary ?? null},
            ${trend.source_url ?? null},
            ${trend.score ?? null}
          )
          ON CONFLICT (source_url) DO NOTHING
        `;
        inserted += rowCount ?? 0;
      } catch {
        // skip rows that fail individual constraints
      }
    }

    revalidatePath('/');

    return Response.json({
      sources: {
        twitter_accounts: twitterHandles.length,
        websites: websiteUrls.length,
        tweets_scraped: tweets.length,
        pages_scraped: pages.length,
      },
      scrape_errors: scrapeErrors,
      trends_extracted: trends.length,
      trends_inserted: inserted,
    });
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
