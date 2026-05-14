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

export async function POST() {
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

    const [tweets, pages] = await Promise.all([
      twitterHandles.length > 0
        ? scrapeTwitterAccounts(twitterHandles)
        : Promise.resolve([]),
      websiteUrls.length > 0
        ? scrapeWebsites(websiteUrls)
        : Promise.resolve([]),
    ]);

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
