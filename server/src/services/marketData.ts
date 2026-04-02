import { searchNewsBroad, type NewsArticle } from './newsService.js';

const FINNHUB_KEY = () => process.env.FINNHUB_API_KEY?.trim() ?? '';
const COINGECKO_BASE = 'https://api.coingecko.com/api/v3';

function formatUsdBullet(n: number): string {
  if (n >= 1e12) return `$${(n / 1e12).toFixed(2)}T`;
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  return `$${n.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

export interface StockAnalysis {
  periodReturnPct: number;
  periodHigh: number;
  periodLow: number;
  rangePct: number;
  volDailyPct: number;
  volumeVsAvg: number | null;
  bullets: string[];
}

export interface AnalystRecommendationRow {
  period: string;
  strongBuy: number;
  buy: number;
  hold: number;
  sell: number;
  strongSell: number;
}

export function buildStockAnalysis(candles: StockCandle | null, _quote: StockQuote | null): StockAnalysis | null {
  if (!candles?.closes?.length) return null;
  const pairs: { c: number; v: number }[] = [];
  for (let i = 0; i < candles.closes.length; i++) {
    const c = candles.closes[i];
    if (c > 0) pairs.push({ c, v: candles.volumes[i] ?? 0 });
  }
  if (pairs.length < 5) return null;

  const closes = pairs.map((p) => p.c);
  const vols = pairs.map((p) => p.v);
  const first = closes[0];
  const last = closes[closes.length - 1];
  const periodReturnPct = ((last - first) / first) * 100;
  const periodHigh = Math.max(...closes);
  const periodLow = Math.min(...closes);
  const rangePct = periodLow > 0 ? ((periodHigh - periodLow) / periodLow) * 100 : 0;

  const returns: number[] = [];
  for (let i = 1; i < closes.length; i++) {
    if (closes[i - 1] > 0) returns.push((closes[i] - closes[i - 1]) / closes[i - 1]);
  }
  const mean = returns.length ? returns.reduce((a, b) => a + b, 0) / returns.length : 0;
  const variance = returns.length ? returns.reduce((s, r) => s + (r - mean) ** 2, 0) / returns.length : 0;
  const volDailyPct = Math.sqrt(variance) * 100;

  let volumeVsAvg: number | null = null;
  const validVols = vols.filter((v) => v > 0);
  if (validVols.length > 0) {
    const avgVol = validVols.reduce((a, b) => a + b, 0) / validVols.length;
    const lastVol = vols[vols.length - 1] ?? 0;
    if (avgVol > 0) volumeVsAvg = lastVol / avgVol;
  }

  const bullets: string[] = [];
  bullets.push(
    `Over the chart window, price moved ${periodReturnPct >= 0 ? '+' : ''}${periodReturnPct.toFixed(1)}% from the first to the last session close.`
  );
  bullets.push(
    `Closing range was ${formatUsdBullet(periodLow)} – ${formatUsdBullet(periodHigh)} (${rangePct.toFixed(1)}% span).`
  );
  bullets.push(`Realized daily volatility is about ${volDailyPct.toFixed(2)}% (std. dev. of daily returns).`);
  if (volumeVsAvg != null) {
    const rel = volumeVsAvg >= 1.2 ? 'above' : volumeVsAvg <= 0.8 ? 'below' : 'near';
    bullets.push(`Latest volume is ${rel} the period average (${volumeVsAvg.toFixed(2)}×).`);
  }

  return { periodReturnPct, periodHigh, periodLow, rangePct, volDailyPct, volumeVsAvg, bullets };
}

export async function getAnalystRecommendations(symbol: string): Promise<AnalystRecommendationRow[]> {
  const key = FINNHUB_KEY();
  if (!key) return [];

  const url = `https://finnhub.io/api/v1/stock/recommendation?symbol=${encodeURIComponent(symbol)}&token=${encodeURIComponent(key)}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
  if (!res.ok) return [];

  const data = (await res.json()) as Array<{
    period?: string;
    strongBuy?: number;
    buy?: number;
    hold?: number;
    sell?: number;
    strongSell?: number;
  }>;

  return (data ?? [])
    .map((r) => ({
      period: r.period ?? '',
      strongBuy: r.strongBuy ?? 0,
      buy: r.buy ?? 0,
      hold: r.hold ?? 0,
      sell: r.sell ?? 0,
      strongSell: r.strongSell ?? 0
    }))
    .filter((r) => r.period);
}

function newsArticleToCompanyItem(a: NewsArticle): CompanyNewsItem {
  return {
    headline: a.title,
    summary: a.description ?? '',
    url: a.url,
    image: a.imageUrl ?? '',
    source: a.source,
    datetime: a.publishedAt ? Math.floor(new Date(a.publishedAt).getTime() / 1000) : 0
  };
}

function mergeCompanyNews(finnhub: CompanyNewsItem[], extra: CompanyNewsItem[]): CompanyNewsItem[] {
  const seen = new Set<string>();
  const out: CompanyNewsItem[] = [];
  for (const item of [...finnhub, ...extra]) {
    const key = item.url.replace(/\?.*$/, '').toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
    if (out.length >= 28) break;
  }
  return out;
}

export interface StockQuote {
  symbol: string;
  current: number;
  change: number;
  changePercent: number;
  high: number;
  low: number;
  open: number;
  previousClose: number;
}

export interface CryptoQuote {
  id: string;
  symbol: string;
  name: string;
  current: number;
  change24h: number;
  changePercent24h: number;
  marketCap: number;
  volume24h: number;
  sparkline?: number[];
}

export async function getStockQuote(symbol: string): Promise<StockQuote | null> {
  const key = FINNHUB_KEY();
  if (!key) return null;

  const url = `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(symbol)}&token=${encodeURIComponent(key)}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
  if (!res.ok) return null;

  const data = (await res.json()) as {
    c?: number; d?: number; dp?: number; h?: number; l?: number; o?: number; pc?: number;
  };

  if (!data.c) return null;
  return {
    symbol: symbol.toUpperCase(),
    current: data.c ?? 0,
    change: data.d ?? 0,
    changePercent: data.dp ?? 0,
    high: data.h ?? 0,
    low: data.l ?? 0,
    open: data.o ?? 0,
    previousClose: data.pc ?? 0
  };
}

export async function getMultipleStockQuotes(symbols: string[]): Promise<StockQuote[]> {
  const results = await Promise.allSettled(symbols.map(getStockQuote));
  return results
    .filter((r): r is PromiseFulfilledResult<StockQuote | null> => r.status === 'fulfilled')
    .map((r) => r.value)
    .filter((q): q is StockQuote => q !== null);
}

export async function getCryptoQuotes(ids: string[] = ['bitcoin', 'ethereum', 'solana']): Promise<CryptoQuote[]> {
  const url = `${COINGECKO_BASE}/coins/markets?vs_currency=usd&ids=${ids.join(',')}&order=market_cap_desc&sparkline=true&price_change_percentage=24h`;
  const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
  if (!res.ok) return [];

  const data = (await res.json()) as Array<{
    id: string; symbol: string; name: string;
    current_price: number; price_change_24h: number; price_change_percentage_24h: number;
    market_cap: number; total_volume: number;
    sparkline_in_7d?: { price: number[] };
  }>;

  return data.map((coin) => ({
    id: coin.id,
    symbol: coin.symbol.toUpperCase(),
    name: coin.name,
    current: coin.current_price,
    change24h: coin.price_change_24h,
    changePercent24h: coin.price_change_percentage_24h,
    marketCap: coin.market_cap,
    volume24h: coin.total_volume,
    sparkline: coin.sparkline_in_7d?.price
  }));
}

export interface StockCandle {
  timestamps: number[];
  opens: number[];
  highs: number[];
  lows: number[];
  closes: number[];
  volumes: number[];
}

export interface CompanyProfile {
  name: string;
  ticker: string;
  logo: string;
  industry: string;
  marketCap: number;
  weburl: string;
  country: string;
  exchange: string;
  ipo: string;
}

export interface CompanyNewsItem {
  headline: string;
  summary: string;
  url: string;
  image: string;
  source: string;
  datetime: number;
}

/** Yahoo chart range/interval pairs (common presets). */
export async function getStockCandles(
  symbol: string,
  range: string = '3mo',
  interval: string = '1d'
): Promise<StockCandle | null> {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=${encodeURIComponent(range)}&interval=${encodeURIComponent(interval)}`;
    const res = await fetch(url, {
      signal: AbortSignal.timeout(8000),
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; River/1.0)' }
    });
    if (!res.ok) return null;

    const data = (await res.json()) as {
      chart?: {
        result?: Array<{
          timestamp?: number[];
          indicators?: {
            quote?: Array<{
              open?: (number | null)[];
              high?: (number | null)[];
              low?: (number | null)[];
              close?: (number | null)[];
              volume?: (number | null)[];
            }>;
          };
        }>;
      };
    };

    const result = data.chart?.result?.[0];
    if (!result?.timestamp) return null;
    const q = result.indicators?.quote?.[0];
    if (!q) return null;

    return {
      timestamps: result.timestamp,
      opens: (q.open ?? []).map((v) => v ?? 0),
      highs: (q.high ?? []).map((v) => v ?? 0),
      lows: (q.low ?? []).map((v) => v ?? 0),
      closes: (q.close ?? []).map((v) => v ?? 0),
      volumes: (q.volume ?? []).map((v) => v ?? 0)
    };
  } catch {
    return null;
  }
}

export async function getCompanyProfile(symbol: string): Promise<CompanyProfile | null> {
  const key = FINNHUB_KEY();
  if (!key) return null;

  const url = `https://finnhub.io/api/v1/stock/profile2?symbol=${encodeURIComponent(symbol)}&token=${encodeURIComponent(key)}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
  if (!res.ok) return null;

  const data = (await res.json()) as {
    name?: string; ticker?: string; logo?: string; finnhubIndustry?: string;
    marketCapitalization?: number; weburl?: string; country?: string; exchange?: string; ipo?: string;
  };
  if (!data.name) return null;

  return {
    name: data.name,
    ticker: data.ticker ?? symbol,
    logo: data.logo ?? '',
    industry: data.finnhubIndustry ?? '',
    marketCap: (data.marketCapitalization ?? 0) * 1e6,
    weburl: data.weburl ?? '',
    country: data.country ?? '',
    exchange: data.exchange ?? '',
    ipo: data.ipo ?? ''
  };
}

export async function getCompanyNews(symbol: string): Promise<CompanyNewsItem[]> {
  const key = FINNHUB_KEY();
  if (!key) return [];

  const to = new Date().toISOString().slice(0, 10);
  const from = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);
  const url = `https://finnhub.io/api/v1/company-news?symbol=${encodeURIComponent(symbol)}&from=${from}&to=${to}&token=${encodeURIComponent(key)}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
  if (!res.ok) return [];

  const data = (await res.json()) as Array<{
    headline?: string; summary?: string; url?: string; image?: string;
    source?: string; datetime?: number;
  }>;

  return (data ?? [])
    .filter((a) => a.headline && a.url)
    .slice(0, 15)
    .map((a) => ({
      headline: a.headline!,
      summary: a.summary ?? '',
      url: a.url!,
      image: a.image ?? '',
      source: a.source ?? '',
      datetime: a.datetime ?? 0
    }));
}

export async function getStockDetail(symbol: string) {
  const sym = symbol.toUpperCase();
  const [quote, candles, profile, newsFinn, recs] = await Promise.allSettled([
    getStockQuote(sym),
    getStockCandles(sym),
    getCompanyProfile(sym),
    getCompanyNews(sym),
    getAnalystRecommendations(sym)
  ]);

  const q = quote.status === 'fulfilled' ? quote.value : null;
  const c = candles.status === 'fulfilled' ? candles.value : null;
  const p = profile.status === 'fulfilled' ? profile.value : null;
  const fhNews = newsFinn.status === 'fulfilled' ? newsFinn.value : [];
  const recommendations = recs.status === 'fulfilled' ? recs.value : [];

  const queryForNews = p?.name?.trim() || sym;
  const extraNews = await searchNewsBroad(queryForNews);
  const mergedNews = mergeCompanyNews(fhNews, extraNews.map(newsArticleToCompanyItem));
  const analysis = buildStockAnalysis(c, q);

  return {
    quote: q,
    candles: c,
    profile: p,
    news: mergedNews,
    analysis,
    recommendations
  };
}

export async function getMarketOverview() {
  const [stocks, crypto] = await Promise.allSettled([
    getMultipleStockQuotes(['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'SPY', 'QQQ']),
    getCryptoQuotes()
  ]);

  return {
    stocks: stocks.status === 'fulfilled' ? stocks.value : [],
    crypto: crypto.status === 'fulfilled' ? crypto.value : []
  };
}
