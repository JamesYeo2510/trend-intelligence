export interface ScrapedPage {
  url: string;
  markdown: string;
  title: string;
}

interface FirecrawlResponse {
  success: boolean;
  data?: {
    markdown?: string;
    metadata?: { title?: string; description?: string };
  };
}

export async function scrapeWebsites(urls: string[]): Promise<ScrapedPage[]> {
  const apiKey = process.env.FIRECRAWL_API_KEY;
  if (!apiKey) throw new Error('FIRECRAWL_API_KEY not set');

  const results = await Promise.all(
    urls.map(async (url): Promise<ScrapedPage | null> => {
      try {
        const response = await fetch('https://api.firecrawl.dev/v1/scrape', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({ url, formats: ['markdown'] }),
        });

        if (!response.ok) {
          console.error(`Firecrawl ${response.status} for ${url}`);
          return null;
        }

        const data = (await response.json()) as FirecrawlResponse;
        if (!data.success || !data.data?.markdown) return null;

        return {
          url,
          // cap per-page content so the Claude prompt stays manageable
          markdown: data.data.markdown.slice(0, 6000),
          title: data.data.metadata?.title ?? url,
        };
      } catch (err) {
        console.error(`Firecrawl fetch failed for ${url}:`, err);
        return null;
      }
    })
  );

  return results.filter((r): r is ScrapedPage => r !== null);
}
