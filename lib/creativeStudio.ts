import Anthropic from '@anthropic-ai/sdk';

export interface TrendData {
  id?: number;
  source_id?: string | null;
  title: string;
  summary?: string | null;
  source_url?: string | null;
  score?: number | null;
  signal_type?: 'github' | 'reddit' | 'scraped';
  // GitHub-specific
  repo_name?: string | null;
  stars?: number | null;
  forks?: number | null;
  language?: string | null;
  // Reddit-specific
  subreddit?: string | null;
  upvotes?: number | null;
  num_comments?: number | null;
  // Pre-computed intelligence (enriches AI generation when present)
  analysis?: {
    why_now?: string | null;
    who_cares?: string | null;
    recommended_move?: string | null;
    content_angle?: string | null;
  } | null;
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

function buildSignalContext(t: TrendData): string {
  const type = t.signal_type ?? 'scraped';
  let base: string;

  if (type === 'github') {
    base = [
      `Repo: ${t.repo_name ?? t.title}`,
      `Stars: ${t.stars ?? 'N/A'}`,
      `Forks: ${t.forks ?? 'N/A'}`,
      `Language: ${t.language ?? 'N/A'}`,
      `Description: ${t.summary ?? '(none)'}`,
      `URL: ${t.source_url ?? '(none)'}`,
    ].join('\n');
  } else if (type === 'reddit') {
    base = [
      `Subreddit: r/${t.subreddit ?? 'unknown'}`,
      `Post: ${t.title}`,
      `Upvotes: ${t.upvotes ?? t.score ?? 'N/A'}`,
      `Comments: ${t.num_comments ?? 'N/A'}`,
      `Body: ${t.summary ?? '(none)'}`,
      `Link: ${t.source_url ?? '(none)'}`,
    ].join('\n');
  } else {
    base = [
      `Trend: ${t.title}`,
      `Summary: ${t.summary ?? '(none)'}`,
      `Source: ${t.source_url ?? '(none)'}`,
      `Signal Score: ${t.score ?? 'N/A'}/100`,
    ].join('\n');
  }

  if (t.analysis) {
    const intel = [
      t.analysis.why_now && `Why now: ${t.analysis.why_now}`,
      t.analysis.who_cares && `Who cares: ${t.analysis.who_cares}`,
      t.analysis.recommended_move && `Recommended move: ${t.analysis.recommended_move}`,
      t.analysis.content_angle && `Content angle: ${t.analysis.content_angle}`,
    ].filter(Boolean).join('\n');

    if (intel) {
      base += `\n\nIntelligence analysis (use this to sharpen the output — do not quote it verbatim):\n${intel}`;
    }
  }

  return base;
}

// ── LinkedIn ────────────────────────────────────────────────────────────────────

function linkedInSystemPrompt(type: TrendData['signal_type']): string {
  if (type === 'reddit') {
    return `You are an elite Community Intelligence Analyst writing for product leaders on LinkedIn.

Your signal comes from Reddit — raw, unfiltered community discourse. Translate grassroots sentiment into strategic insight.

Focus on:
- The core frustration, debate, or excitement driving engagement in this thread
- What this community signal means for product strategy, positioning, or market timing
- What smart builders and marketers should do RIGHT NOW based on this sentiment velocity

Voice: analytical, direct, commercially grounded. No hype. No emojis. No code architecture talk.
Format: 3 tight paragraphs + 3–5 hashtags on a new line. No "Here is your post:" wrapper.`;
  }
  if (type === 'github') {
    return `You are an elite Technical AI Consultant writing for a senior engineering and business audience on LinkedIn.

Your signal comes from GitHub trending — a real-time pulse of developer momentum.

Focus on:
- What this repo's traction signals about architectural shifts or developer pain points
- The business and competitive implications for teams building on this stack
- Concrete action: adopt, watch, or avoid — and why

Voice: analytical, data-driven, zero hype, zero emojis. Challenge conventional wisdom with evidence.
Format: 3 tight paragraphs + 3–5 hashtags on a new line. No "Here is your post:" wrapper.`;
  }
  return `You are an elite Technical AI Consultant writing for a senior business audience on LinkedIn.

Write a LinkedIn post that is analytical, data-driven, with zero hype and zero emojis. Focus on business efficiency and architectural impact. No filler phrases like "game-changer" or "revolutionary."

Format: 3 tight paragraphs + 3–5 hashtags on a new line. No preamble, no wrapper.`;
}

export async function generateLinkedIn(trendData: TrendData): Promise<string> {
  const client = getClient();
  const type = trendData.signal_type ?? 'scraped';
  try {
    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: `${linkedInSystemPrompt(type)}\n\n---\n${buildSignalContext(trendData)}\n\nReturn clean Markdown only.`,
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

// ── Instagram Carousel ──────────────────────────────────────────────────────────

function carouselSlideStructure(type: TrendData['signal_type']): string {
  if (type === 'reddit') {
    return `Required slide structure (community sentiment lens):
1. The Viral Hook — what's driving this community's raw engagement right now
2. The Core Frustration — what users are actually complaining about or struggling with
3. The Underlying Desire — what they're really asking for beneath the surface
4. The Market Gap — what product or solution this discourse reveals is missing
5. The Strategic Response — how founders/marketers should react to this signal
6. The Sentiment Velocity — is this frustration growing, peaking, or fading, and what that means
7. Clear CTA — follow for community intelligence, save for reference, or link in bio`;
  }
  if (type === 'github') {
    return `Required slide structure (developer momentum lens):
1. Scroll-stopping Hook — the repo metric or fact that stops developers cold
2. The Core Technical Problem it solves — what developers actually struggle with
3. The Architecture Solution — the specific technical approach with concrete details
4. The Competitive Edge — what adopting this unlocks vs. staying on the old stack
5. The Business/Marketing Angle — ROI, velocity, or efficiency framing for non-engineers
6. The Immediate Action Step — one specific thing to do or evaluate right now
7. Clear CTA — follow for more, save this, or link in bio`;
  }
  return `Required slide structure:
1. Scroll-stopping Hook — make them stop scrolling
2. The Core Technical Problem — what developers actually struggle with
3. The Code Solution — the specific fix or approach with concrete details
4. The Strategic Edge — what this unlocks competitively or architecturally
5. The Business/Marketing Angle — ROI, revenue, or efficiency framing
6. The Immediate Action Step — one specific thing to do right now
7. Clear CTA — follow for more, save this, or link in bio`;
}

export async function generateInstagramCarousel(trendData: TrendData): Promise<CarouselContent> {
  const client = getClient();
  const type = trendData.signal_type ?? 'scraped';
  try {
    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2048,
      messages: [
        {
          role: 'user',
          content: `Create a 7-slide Instagram carousel about this signal.

Return a JSON object only — no markdown fences, no explanation. The object must have a single "slides" key containing an array of exactly 7 objects. Each object must have:
- "slide_number": integer (1–7)
- "heading": short punchy headline, max 8 words
- "body": 2–3 sentences max, punchy and specific

${carouselSlideStructure(type)}

---
${buildSignalContext(trendData)}`,
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

// ── Blog Outline ────────────────────────────────────────────────────────────────

function blogOutlinePrompt(type: TrendData['signal_type']): string {
  if (type === 'reddit') {
    return `Write a deep-dive structured blog outline in Markdown. This is a blueprint for a 2,000-word community intelligence article — include section descriptions, not full prose.

This signal comes from Reddit. The article should read as community sentiment analysis: what is this community actually saying, feeling, and demanding?

Required structure:
- **Title** — SEO-optimized, framed around community pulse (e.g. "What r/LocalLLaMA is Actually Saying About X")
- **Target Audience** — who reads this: founders, PMs, marketers tracking community signals
- **Core Thesis** — one sentence: the specific insight this article surfaces from the community noise
- **Introduction** — the hook, what's driving engagement in this community right now
- **The Signal** — the core frustration, excitement, or debate: quotes, context, volume
- **The Underlying Need** — what users really want beneath the surface-level complaints
- **The Market Implication** — what product gaps, timing windows, or pivots this sentiment reveals
- **Conclusion** — strategic takeaways, who should act, how fast

Return Markdown only. No preamble.`;
  }
  if (type === 'github') {
    return `Write a deep-dive structured technical blog outline in Markdown. This is a blueprint for a 2,000-word technical article — include section descriptions, not full prose.

This signal comes from GitHub trending. The article should focus on why this repo is gaining momentum and what it means architecturally and commercially.

Required structure:
- **Title** — SEO-optimized, specific, not generic (include repo name + problem solved)
- **Target Audience** — senior engineers, tech leads, and CTOs evaluating the stack
- **Core Thesis** — one sentence: what this repo's traction reveals about the ecosystem
- **Introduction** — hook: why this repo is trending now and what problem it exposes
- **Architecture** — technical breakdown: how it works, key components, design decisions, tradeoffs
- **Ecosystem Fit** — how it compares to alternatives, when to use it, when to avoid it
- **Business Impact** — ROI framing, adoption velocity, team efficiency implications
- **Conclusion** — key takeaways, next steps, call to action

Return Markdown only. No preamble.`;
  }
  return `Write a deep-dive structured technical blog outline in Markdown about this trend. This is a blueprint for a 2,000-word technical article — include section descriptions, not full prose.

Required structure:
- **Title** — SEO-optimized, specific, not generic
- **Target Audience** — who exactly will read this and why
- **Core Thesis** — one sentence: the specific argument this article makes
- **Introduction** — key hook, problem framing, what the reader will learn
- **Architecture** — technical breakdown: how it works, key components, design decisions
- **Business Impact** — ROI framing, efficiency gains, strategic implications with concrete numbers where possible
- **Conclusion** — key takeaways, next steps, call to action

Return Markdown only. No preamble.`;
}

export async function generateBlogOutline(trendData: TrendData): Promise<string> {
  const client = getClient();
  const type = trendData.signal_type ?? 'scraped';
  try {
    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2048,
      messages: [
        {
          role: 'user',
          content: `${blogOutlinePrompt(type)}\n\n---\n${buildSignalContext(trendData)}`,
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
