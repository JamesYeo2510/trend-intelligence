import { sql, type Trend } from '@/lib/db';

export async function GET() {
  const { rows } = await sql<Trend>`
    SELECT * FROM trends ORDER BY created_at DESC
  `;
  return Response.json(rows);
}

export async function POST(request: Request) {
  const body = await request.json();
  const { title, summary, source_url, score } = body;

  if (!title || typeof title !== 'string' || title.trim() === '') {
    return Response.json({ error: 'title is required' }, { status: 400 });
  }

  const { rows } = await sql<Trend>`
    INSERT INTO trends (title, summary, source_url, score)
    VALUES (${title.trim()}, ${summary ?? null}, ${source_url ?? null}, ${score ?? null})
    RETURNING *
  `;

  return Response.json(rows[0], { status: 201 });
}
