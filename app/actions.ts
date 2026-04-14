'use server'

import { sql } from '@/lib/db'
import { revalidatePath } from 'next/cache'

export async function updateManualRating(id: number, delta: number): Promise<void> {
  await sql`
    UPDATE trends
    SET manual_rating = COALESCE(manual_rating, 0) + ${delta}
    WHERE id = ${id}
  `
  revalidatePath('/')
}

export async function generateTrendImage(
  id: number,
  title: string,
): Promise<{ url: string | null; error?: string }> {
  const falKey = process.env.FAL_KEY
  if (!falKey) return { url: null, error: 'FAL_KEY not set' }

  const { fal } = await import('@fal-ai/client')
  fal.config({ credentials: falKey })

  const prompt = `Dark luxury editorial visual for the trend: "${title}".
Cinematic matte photography, deep black and charcoal tones, subtle dramatic lighting.
No text, no logos. Abstract, premium, sophisticated. High-contrast minimalism.`

  try {
    const result = (await fal.subscribe('fal-ai/flux/schnell', {
      input: { prompt, image_size: 'landscape_16_9', num_inference_steps: 4, num_images: 1 },
    })) as { images?: Array<{ url: string }> }

    const imageUrl = result.images?.[0]?.url ?? null
    if (imageUrl) {
      await sql`UPDATE trends SET image_url = ${imageUrl} WHERE id = ${id}`
      revalidatePath('/')
    }
    return { url: imageUrl }
  } catch (err) {
    return { url: null, error: err instanceof Error ? err.message : 'Unknown error' }
  }
}

export async function generateLinkedInDraft(
  trendId: number,
  title: string,
  summary: string,
): Promise<{ content: string | null; draftId: number | null; error?: string }> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return { content: null, draftId: null, error: 'ANTHROPIC_API_KEY not set' }

  const Anthropic = (await import('@anthropic-ai/sdk')).default
  const client = new Anthropic({ apiKey })

  const systemPrompt = `You are a Senior AI Strategist with 15 years of experience advising Fortune 500 companies on AI adoption, digital transformation, and the future of work. You write LinkedIn posts that are authoritative, thought-provoking, and commercially aware — never hype-driven or vague.

Your voice: confident, direct, occasionally contrarian. You challenge conventional wisdom with evidence. You speak to CMOs, VPs of Marketing, and C-suite leaders who make decisions worth millions.

Format rules:
- Exactly 3 paragraphs, no bullet points, no headers
- Paragraph 1: A bold, specific hook — a provocative insight or counterintuitive take on the trend
- Paragraph 2: The business implication — what this means for marketing leaders right now, with concrete stakes
- Paragraph 3: A forward-looking call to action or strategic framing — what the smart money is doing
- End with 3–5 relevant hashtags on a new line
- No fluff. No "I'm excited to share". No em-dashes used as decoration.`

  const userPrompt = `Write a LinkedIn post about this AI trend:

Title: ${title}

Context: ${summary}

Write for a Senior AI Strategist audience. Be specific, commercially grounded, and genuinely insightful.`

  try {
    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 600,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    })

    const content =
      message.content[0].type === 'text' ? message.content[0].text.trim() : null

    if (!content) return { content: null, draftId: null, error: 'Empty response from Claude' }

    const { rows } = await sql<{ id: number }>`
      INSERT INTO drafts (trend_id, content)
      VALUES (${trendId}, ${content})
      RETURNING id
    `
    revalidatePath('/drafts')

    return { content, draftId: rows[0].id }
  } catch (err) {
    return { content: null, draftId: null, error: err instanceof Error ? err.message : 'Unknown error' }
  }
}
