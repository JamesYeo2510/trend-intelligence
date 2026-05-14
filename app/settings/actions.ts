'use server';

import { initSchema, sql } from '@/lib/db';
import { revalidatePath } from 'next/cache';

export async function addTarget(type: 'twitter' | 'website', value: string): Promise<void> {
  const trimmed = value.trim();
  if (!trimmed) return;
  await initSchema();
  await sql`
    INSERT INTO targets (type, value)
    VALUES (${type}, ${trimmed})
    ON CONFLICT (value) DO NOTHING
  `;
  revalidatePath('/settings');
  revalidatePath('/');
}

export async function deleteTarget(id: number): Promise<void> {
  await initSchema();
  await sql`DELETE FROM targets WHERE id = ${id}`;
  revalidatePath('/settings');
  revalidatePath('/');
}

export async function toggleTarget(id: number, active: boolean): Promise<void> {
  await initSchema();
  await sql`UPDATE targets SET active = ${active} WHERE id = ${id}`;
  revalidatePath('/settings');
  revalidatePath('/');
}
