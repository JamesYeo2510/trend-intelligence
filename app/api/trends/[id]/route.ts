import { sql, type Trend } from '@/lib/db';

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  const { id } = await params;
  const body = await request.json();
  const { manual_rating } = body;

  if (manual_rating === undefined || typeof manual_rating !== 'number') {
    return Response.json({ error: 'manual_rating (number) is required' }, { status: 400 });
  }

  const { rows } = await sql<Trend>`
    UPDATE trends SET manual_rating = ${manual_rating} WHERE id = ${id} RETURNING *
  `;

  if (rows.length === 0) {
    return Response.json({ error: 'Not found' }, { status: 404 });
  }

  return Response.json(rows[0]);
}

export async function DELETE(_request: Request, { params }: Params) {
  const { id } = await params;

  const { rowCount } = await sql`DELETE FROM trends WHERE id = ${id}`;

  if (rowCount === 0) {
    return Response.json({ error: 'Not found' }, { status: 404 });
  }

  return new Response(null, { status: 204 });
}
