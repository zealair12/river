import { Router } from 'express';
import { getMarketOverview, getStockQuote, getStockDetail, getStockCandles } from '../services/marketData.js';
import { getTopBusinessNews, searchNewsBroad } from '../services/newsService.js';

export const marketRouter = Router();

marketRouter.get('/market/stock/:symbol', async (req, res) => {
  try {
    const detail = await getStockDetail(req.params.symbol.toUpperCase());
    res.json(detail);
  } catch (error) {
    console.error('Stock detail failed:', error);
    res.status(500).json({ error: 'Failed to fetch stock detail.' });
  }
});

marketRouter.get('/market/stock/:symbol/candles', async (req, res) => {
  try {
    const sym = req.params.symbol.toUpperCase();
    const range = typeof req.query.range === 'string' && req.query.range.trim() ? req.query.range.trim() : '3mo';
    const interval = typeof req.query.interval === 'string' && req.query.interval.trim() ? req.query.interval.trim() : '1d';
    const candles = await getStockCandles(sym, range, interval);
    res.json({ candles });
  } catch (error) {
    console.error('Stock candles failed:', error);
    res.status(500).json({ error: 'Failed to fetch candles.' });
  }
});

marketRouter.get('/market/overview', async (_req, res) => {
  try {
    const [market, news] = await Promise.allSettled([
      getMarketOverview(),
      getTopBusinessNews()
    ]);

    res.json({
      stocks: market.status === 'fulfilled' ? market.value.stocks : [],
      crypto: market.status === 'fulfilled' ? market.value.crypto : [],
      news: news.status === 'fulfilled' ? news.value : []
    });
  } catch (error) {
    console.error('Market overview failed:', error);
    res.status(500).json({ error: 'Failed to fetch market data.' });
  }
});

marketRouter.get('/market/search', async (req, res) => {
  try {
    const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
    if (!q) { res.json({ results: [] }); return; }

    const key = process.env.FINNHUB_API_KEY?.trim();
    if (!key) { res.json({ results: [] }); return; }

    const url = `https://finnhub.io/api/v1/search?q=${encodeURIComponent(q)}&token=${encodeURIComponent(key)}`;
    const r = await fetch(url, { signal: AbortSignal.timeout(6000) });
    if (!r.ok) { res.json({ results: [] }); return; }

    const data = (await r.json()) as {
      result?: Array<{ symbol?: string; description?: string; type?: string }>;
    };

    const results = (data.result ?? [])
      .filter((r) => r.symbol && r.type === 'Common Stock')
      .slice(0, 8)
      .map((r) => ({ symbol: r.symbol!, name: r.description ?? r.symbol! }));

    res.json({ results });
  } catch (error) {
    console.error('Symbol search failed:', error);
    res.json({ results: [] });
  }
});

marketRouter.get('/market/quote/:symbol', async (req, res) => {
  try {
    const quote = await getStockQuote(req.params.symbol);
    res.json(quote ?? { error: 'Quote not available.' });
  } catch (error) {
    console.error('Stock quote failed:', error);
    res.status(500).json({ error: 'Failed to fetch quote.' });
  }
});

marketRouter.get('/market/news', async (req, res) => {
  try {
    const query = typeof req.query.q === 'string' ? req.query.q.trim() : '';
    const articles = query ? await searchNewsBroad(query) : await getTopBusinessNews();
    res.json({ articles });
  } catch (error) {
    console.error('News fetch failed:', error);
    res.status(500).json({ error: 'Failed to fetch news.' });
  }
});
