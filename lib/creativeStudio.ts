import Anthropic from '@anthropic-ai/sdk';

export interface TrendData {
  id?: number;
  title: string;
  summary?: string | null;
  source_url?: string | null;
  score?: number | null;
  [key: string]: unknown;
}

export interface CarouselSlide {
  slide_number: number;
  heading: string;
  body: string;
}

export interface CarouselContent {
  slides: CarouselSlide[];
}

function getClient(): Anthropic {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY not set');
  return new Anthropic({ apiKey });
}

function stripFences(raw: string): string {
  return raw.replace(/^```[a-z]*\n?/i, '').replace(/```$/i, '').trim();
}

export async function generateLinkedIn(trendData: TrendData): Promise<string> {
  const client = getClient();
  try {
    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: `You are an elite Technical AI Consultant writing for a senior business audience on LinkedIn.

Write a LinkedIn post about this trend. Your tone must be analytical, data-driven, with zero hype and zero emojis. Focus on business efficiency and architectural impact. No filler phrases like "game-changer" or "revolutionary."

Trend: ${trendData.title}
Summary: ${trendData.summary ?? '(none)'}
Source: ${trendData.source_url ?? '(none)'}
Signal Score: ${trendData.score ?? 'N/A'}/100

Return clean Markdown only. No preamble, no "Here is your post:" wrapper.`,
        },
      ],
    });
    const raw = message.content[0].type === 'text' ? message.content[0].text.trim() : '';
    return raw;
  } catch (err) {
    throw new Error(
      `LinkedIn generation failed: ${err instanceof Error ? err.message : 'Unknown error'}`
    );
  }
}

export async function generateInstagramCarousel(trendData: TrendData): Promise<CarouselContent> {
  const client = getClient();
  try {
    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2048,
      messages: [
        {
          role: 'user',
          content: `Create a 7-slide Instagram carousel about this trend.

Return a JSON object only — no markdown fences, no explanation. The object must have a single "slides" key containing an array of exactly 7 objects. Each object must have:
- "slide_number": integer (1–7)
- "heading": short punchy headline, max 8 words
- "body": 2–3 sentences max, punchy and specific

Required slide structure:
1. Scroll-stopping Hook — make them stop scrolling
2. The Core Technical Problem — what developers actually struggle with
3. The Code Solution — the specific fix or approach with concrete details
4. The Strategic Edge — what this unlocks competitively or architecturally
5. The Business/Marketing Angle — ROI, revenue, or efficiency framing
6. The Immediate Action Step — one specific thing to do right now
7. Clear CTA — follow for more, save this, or link in bio prompt

Trend: ${trendData.title}
Summary: ${trendData.summary ?? '(none)'}
Source: ${trendData.source_url ?? '(none)'}`,
        },
      ],
    });

    const raw = message.content[0].type === 'text' ? message.content[0].text.trim() : '{}';
    return JSON.parse(stripFences(raw)) as CarouselContent;
  } catch (err) {
    throw new Error(
      `Instagram carousel generation failed: ${err instanceof Error ? err.message : 'Unknown error'}`
    );
  }
}

export async function generateBlogOutline(trendData: TrendData): Promise<string> {
  const client = getClient();
  try {
    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2048,
      messages: [
        {
          role: 'user',
          content: `Write a deep-dive structured technical blog outline in Markdown about this trend. This is a blueprint for a 2,000-word technical article — include section descriptions, not full prose.

Required structure:
- **Title** — SEO-optimized, specific, not generic
- **Target Audience** — who exactly will read this and why
- **Core Thesis** — one sentence: the specific argument this article makes
- **Introduction** — key hook, problem framing, what the reader will learn
- **Architecture** — technical breakdown: how it works, key components, design decisions
- **Business Impact** — ROI framing, efficiency gains, strategic implications with concrete numbers where possible
- **Conclusion** — key takeaways, next steps, call to action

Trend: ${trendData.title}
Summary: ${trendData.summary ?? '(none)'}
Source: ${trendData.source_url ?? '(none)'}
Signal Score: ${trendData.score ?? 'N/A'}/100

Return Markdown only. No preamble.`,
        },
      ],
    });
    const raw = message.content[0].type === 'text' ? message.content[0].text.trim() : '';
    return raw;
  } catch (err) {
    throw new Error(
      `Blog outline generation failed: ${err instanceof Error ? err.message : 'Unknown error'}`
    );
  }
}
