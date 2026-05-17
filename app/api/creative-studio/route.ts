import { revalidatePath } from 'next/cache';
import { initSchema, sql } from '@/lib/db';
import type { ContentVault } from '@/lib/db';
import {
  generateLinkedIn,
  generateInstagramCarousel,
  generateBlogOutline,
} from '@/lib/creativeStudio';
import type { TrendData } from '@/lib/creativeStudio';

export const dynamic = 'force-dynamic';

type ContentType = 'linkedin' | 'ig_carousel' | 'blog' | 'all';

interface RequestBody {
  trendData: TrendData;
  contentType: ContentType;
}

async function insertAsset(
  sourceId: string,
  contentType: 'linkedin' | 'ig_carousel' | 'blog',
  title: string,
  content: unknown
): Promise<ContentVault> {
  const { rows } = await sql<ContentVault>`
    INSERT INTO content_vault (source_id, content_type, title, generated_content)
    VALUES (${sourceId}, ${contentType}, ${title}, ${JSON.stringify(content)}::jsonb)
    RETURNING *
  `;
  return rows[0];
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as RequestBody;
    const { trendData, contentType } = body;

    if (!trendData?.title) {
      return Response.json({ error: 'trendData.title is required' }, { status: 400 });
    }
    if (!contentType) {
      return Response.json({ error: 'contentType is required' }, { status: 400 });
    }

    await initSchema();

    const sourceId = String(trendData.id ?? trendData.source_url ?? trendData.title);
    const title = trendData.title;

    if (contentType === 'all') {
      const [linkedin, carousel, blog] = await Promise.all([
        generateLinkedIn(trendData),
        generateInstagramCarousel(trendData),
        generateBlogOutline(trendData),
      ]);

      const [liRecord, csRecord, blRecord] = await Promise.all([
        insertAsset(sourceId, 'linkedin', title, linkedin),
        insertAsset(sourceId, 'ig_carousel', title, carousel),
        insertAsset(sourceId, 'blog', title, blog),
      ]);

      revalidatePath('/');
      return Response.json([liRecord, csRecord, blRecord], { status: 201 });
    }

    if (contentType === 'linkedin') {
      const content = await generateLinkedIn(trendData);
      const record = await insertAsset(sourceId, 'linkedin', title, content);
      revalidatePath('/');
      return Response.json(record, { status: 201 });
    }

    if (contentType === 'ig_carousel') {
      const content = await generateInstagramCarousel(trendData);
      const record = await insertAsset(sourceId, 'ig_carousel', title, content);
      revalidatePath('/');
      return Response.json(record, { status: 201 });
    }

    if (contentType === 'blog') {
      const content = await generateBlogOutline(trendData);
      const record = await insertAsset(sourceId, 'blog', title, content);
      revalidatePath('/');
      return Response.json(record, { status: 201 });
    }

    return Response.json({ error: 'Invalid contentType' }, { status: 400 });
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    await initSchema();
    const { rows } = await sql<ContentVault>`
      SELECT * FROM content_vault ORDER BY created_at DESC
    `;
    return Response.json(rows);
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
