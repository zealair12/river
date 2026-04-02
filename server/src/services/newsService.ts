const NEWSAPI_KEY = () => process.env.NEWSAPI_KEY?.trim() ?? '';

export interface NewsArticle {
  title: string;
  description: string | null;
  url: string;
  imageUrl: string | null;
  source: string;
  publishedAt: string;
}

type RawArticle = {
  title?: string;
  description?: string;
  url?: string;
  urlToImage?: string;
  source?: { name?: string };
  publishedAt?: string;
};

function parseArticles(articles: RawArticle[] | undefined): NewsArticle[] {
  return (articles ?? [])
    .filter((a) => a.title && a.url && a.title !== '[Removed]')
    .map((a) => ({
      title: a.title!,
      description: a.description ?? null,
      url: a.url!,
      imageUrl: a.urlToImage ?? null,
      source: a.source?.name ?? 'Unknown',
      publishedAt: a.publishedAt ?? ''
    }));
}

function mergeByUrl(articles: NewsArticle[]): NewsArticle[] {
  const map = new Map<string, NewsArticle>();
  for (const a of articles) {
    const key = a.url.replace(/\?.*$/, '').toLowerCase();
    if (!map.has(key)) map.set(key, a);
  }
  return [...map.values()].sort((x, y) => {
    const tx = new Date(x.publishedAt).getTime();
    const ty = new Date(y.publishedAt).getTime();
    return ty - tx;
  });
}

export async function getTopBusinessNews(): Promise<NewsArticle[]> {
  const key = NEWSAPI_KEY();
  if (!key) return [];

  const url = `https://newsapi.org/v2/top-headlines?category=business&country=us&pageSize=12&apiKey=${encodeURIComponent(key)}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
  if (!res.ok) return [];

  const data = (await res.json()) as { articles?: RawArticle[] };
  return parseArticles(data.articles);
}

export async function searchNews(query: string): Promise<NewsArticle[]> {
  const key = NEWSAPI_KEY();
  if (!key) return [];

  const url = `https://newsapi.org/v2/top-headlines?q=${encodeURIComponent(query)}&pageSize=8&apiKey=${encodeURIComponent(key)}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
  if (!res.ok) return [];

  const data = (await res.json()) as { articles?: RawArticle[] };
  return parseArticles(data.articles);
}

/** Merges top-headlines, business headlines, and everything (when the key allows) for more source diversity. */
export async function searchNewsBroad(query: string): Promise<NewsArticle[]> {
  const key = NEWSAPI_KEY();
  if (!key || !query.trim()) return [];

  const q = query.trim();
  const enc = encodeURIComponent(q);

  const [headlines, business, everything] = await Promise.allSettled([
    fetch(`https://newsapi.org/v2/top-headlines?q=${enc}&pageSize=10&apiKey=${encodeURIComponent(key)}`, {
      signal: AbortSignal.timeout(8000)
    }).then(async (r) => (r.ok ? ((await r.json()) as { articles?: RawArticle[] }) : null)),
    fetch(`https://newsapi.org/v2/top-headlines?category=business&q=${enc}&pageSize=14&apiKey=${encodeURIComponent(key)}`, {
      signal: AbortSignal.timeout(8000)
    }).then(async (r) => (r.ok ? ((await r.json()) as { articles?: RawArticle[] }) : null)),
    fetch(`https://newsapi.org/v2/everything?q=${enc}&language=en&sortBy=publishedAt&pageSize=24&apiKey=${encodeURIComponent(key)}`, {
      signal: AbortSignal.timeout(8000)
    }).then(async (r) => (r.ok ? ((await r.json()) as { articles?: RawArticle[] }) : null))
  ]);

  const chunks: NewsArticle[] = [];
  if (headlines.status === 'fulfilled' && headlines.value?.articles) chunks.push(...parseArticles(headlines.value.articles));
  if (business.status === 'fulfilled' && business.value?.articles) chunks.push(...parseArticles(business.value.articles));
  if (everything.status === 'fulfilled' && everything.value?.articles) chunks.push(...parseArticles(everything.value.articles));

  return mergeByUrl(chunks).slice(0, 32);
}
