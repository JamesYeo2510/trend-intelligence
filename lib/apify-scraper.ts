export interface Tweet {
  text: string;
  url: string;
  author: string;
  createdAt: string;
}

interface ApifyTweetItem {
  text?: string;
  full_text?: string;
  url?: string;
  author?: { userName?: string; name?: string };
  user?: { screen_name?: string };
  createdAt?: string;
  created_at?: string;
}

export async function scrapeTwitterAccounts(usernames: string[]): Promise<Tweet[]> {
  const token = process.env.APIFY_TOKEN;
  if (!token) throw new Error('APIFY_TOKEN not set');

  const actor = process.env.APIFY_TWITTER_ACTOR ?? 'apidojo~tweet-scraper';

  const response = await fetch(
    `https://api.apify.com/v2/acts/${actor}/run-sync-get-dataset-items?token=${token}&waitSecs=120`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        twitterHandles: usernames,
        maxItems: 10,
        addUserInfo: false,
      }),
    }
  );

  if (!response.ok) {
    throw new Error(`Apify error ${response.status}: ${await response.text()}`);
  }

  const items = (await response.json()) as ApifyTweetItem[];

  return items
    .map((item) => ({
      text: item.full_text ?? item.text ?? '',
      url: item.url ?? '',
      author: item.author?.userName ?? item.user?.screen_name ?? '',
      createdAt: item.createdAt ?? item.created_at ?? '',
    }))
    .filter((t) => t.text.length > 0);
}
