import { revalidatePath } from 'next/cache';
import { initSchema, sql } from '@/lib/db';

export const dynamic = 'force-dynamic';

type TrendPeriod = 'weekly' | 'monthly';

type GitHubIntelligenceInput = {
  name: string;
  stars: number | null;
  description: string | null;
  language: string | null;
  url: string | null;
  is_ai_dev: boolean;
  marketing_angle: string | null;
};

type GitHubTrendPayload = {
  weekly?: unknown;
  monthly?: unknown;
};

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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function readString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : null;
}

function readNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? Math.round(value) : null;
}

function readBoolean(value: unknown): boolean {
  return typeof value === 'boolean' ? value : false;
}

function normalizeItem(value: unknown): GitHubIntelligenceInput | null {
  if (!isRecord(value)) return null;

  const name = readString(value.name) ?? readString(value.repo_name);
  if (!name) return null;

  return {
    name,
    stars: readNumber(value.stars),
    description: readString(value.description),
    language: readString(value.language),
    url: readString(value.url) ?? readString(value.repo_url),
    is_ai_dev: readBoolean(value.is_ai_dev),
    marketing_angle: readString(value.marketing_angle),
  };
}

function normalizePeriodItems(payload: GitHubTrendPayload, period: TrendPeriod): GitHubIntelligenceInput[] {
  const rawItems = payload[period];
  if (!Array.isArray(rawItems)) return [];

  return rawItems
    .map((item) => normalizeItem(item))
    .filter((item): item is GitHubIntelligenceInput => item !== null);
}

export async function POST(request: Request) {
  if (!isAuthorizedCronRequest(request)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await initSchema();

  let payload: GitHubTrendPayload;

  try {
    payload = (await request.json()) as GitHubTrendPayload;
  } catch {
    return Response.json({ error: 'Invalid JSON payload' }, { status: 400 });
  }

  const scrapedAt = new Date().toISOString();
  let inserted = 0;

  for (const period of ['weekly', 'monthly'] satisfies TrendPeriod[]) {
    const items = normalizePeriodItems(payload, period);

    for (const item of items) {
      await sql`
        INSERT INTO github_intelligence (
          name,
          stars,
          description,
          language,
          url,
          is_ai_dev,
          period,
          marketing_angle,
          scraped_at
        )
        VALUES (
          ${item.name},
          ${item.stars},
          ${item.description},
          ${item.language},
          ${item.url},
          ${item.is_ai_dev},
          ${period},
          ${item.marketing_angle},
          ${scrapedAt}
        )
      `;
      inserted += 1;
    }
  }

  revalidatePath('/');

  return Response.json({ inserted, scraped_at: scrapedAt });
}
