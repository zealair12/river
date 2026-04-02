import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

interface StockQuote {
  symbol: string;
  current: number;
  change: number;
  changePercent: number;
  high: number;
  low: number;
}

interface CryptoQuote {
  id: string;
  symbol: string;
  name: string;
  current: number;
  change24h: number;
  changePercent24h: number;
  marketCap: number;
  sparkline?: number[];
}

interface NewsArticle {
  title: string;
  description: string | null;
  url: string;
  imageUrl: string | null;
  source: string;
  publishedAt: string;
}

interface MarketData {
  stocks: StockQuote[];
  crypto: CryptoQuote[];
  news: NewsArticle[];
}

function formatUsd(n: number): string {
  if (n >= 1e12) return `$${(n / 1e12).toFixed(2)}T`;
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  return `$${n.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

function timeAgo(dateStr: string): string {
  const ms = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(ms / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function MiniSparkline({ data, color }: { data: number[]; color: string }) {
  if (data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const h = 32;
  const w = 80;
  const step = w / (data.length - 1);
  const points = data.map((v, i) => `${i * step},${h - ((v - min) / range) * h}`).join(' ');
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ display: 'block' }}>
      <polyline points={points} fill="none" stroke={color} strokeWidth={1.5} />
    </svg>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [data, setData] = useState<MarketData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/market/overview')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (d) setData(d); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div style={{ padding: 24, opacity: 0.5, textAlign: 'center' }}>
        Loading market data...
      </div>
    );
  }

  if (!data) return null;

  return (
    <div style={{ width: '100%', maxWidth: 900, margin: '0 auto' }}>
      {/* Stock ticker row */}
      {data.stocks.length > 0 && (
        <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 8, marginBottom: 20 }}>
          {data.stocks.map((s) => {
            const positive = s.changePercent >= 0;
            return (
              <button
                key={s.symbol}
                type="button"
                onClick={() => navigate(`/stock/${s.symbol}`)}
                style={{
                  minWidth: 130,
                  padding: '12px 14px',
                  borderRadius: 12,
                  background: 'var(--glass-bg)',
                  border: '1px solid var(--glass-border)',
                  flexShrink: 0,
                  cursor: 'pointer',
                  color: 'white',
                  textAlign: 'left',
                  transition: 'background 0.15s, transform 0.12s'
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--glass-bg)'; e.currentTarget.style.transform = 'none'; }}
              >
                <div style={{ fontSize: 11, opacity: 0.5, marginBottom: 4 }}>{s.symbol}</div>
                <div style={{ fontSize: 18, fontWeight: 600 }}>{formatUsd(s.current)}</div>
                <div style={{ fontSize: 12, color: positive ? '#86efac' : '#fca5a5', marginTop: 2 }}>
                  {positive ? '↑' : '↓'} {Math.abs(s.changePercent).toFixed(2)}%
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Crypto cards */}
      {data.crypto.length > 0 && (
        <>
          <h3 style={{ fontSize: 13, opacity: 0.4, textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 10px' }}>
            Crypto
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12, marginBottom: 24 }}>
            {data.crypto.map((c) => {
              const positive = c.changePercent24h >= 0;
              const color = positive ? '#86efac' : '#fca5a5';
              return (
                <a
                  key={c.id}
                  href={`https://www.coingecko.com/en/coins/${c.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    padding: 16,
                    borderRadius: 14,
                    background: 'var(--glass-bg)',
                    border: '1px solid var(--glass-border)',
                    color: 'white',
                    textDecoration: 'none',
                    cursor: 'pointer',
                    transition: 'background 0.15s, transform 0.12s',
                    display: 'block'
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--glass-bg)'; e.currentTarget.style.transform = 'none'; }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <div>
                      <div style={{ fontSize: 11, opacity: 0.5 }}>{c.symbol}</div>
                      <div style={{ fontSize: 16, fontWeight: 500 }}>{c.name}</div>
                    </div>
                    {c.sparkline && <MiniSparkline data={c.sparkline.slice(-48)} color={color} />}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                    <span style={{ fontSize: 20, fontWeight: 600 }}>{formatUsd(c.current)}</span>
                    <span style={{ fontSize: 13, color }}>
                      {positive ? '↑' : '↓'} {Math.abs(c.changePercent24h).toFixed(2)}%
                    </span>
                  </div>
                  <div style={{ fontSize: 11, opacity: 0.35, marginTop: 6 }}>
                    MCap {formatUsd(c.marketCap)}
                  </div>
                </a>
              );
            })}
          </div>
        </>
      )}

      {/* News */}
      {data.news.length > 0 && (
        <>
          <h3 style={{ fontSize: 13, opacity: 0.4, textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 10px' }}>
            Financial News
          </h3>
          <div style={{ display: 'grid', gap: 8, marginBottom: 24 }}>
            {data.news.map((article, i) => (
              <a
                key={i}
                href={article.url}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'flex',
                  gap: 12,
                  padding: '12px 14px',
                  borderRadius: 12,
                  background: 'var(--glass-bg)',
                  border: '1px solid var(--glass-border)',
                  color: 'white',
                  textDecoration: 'none',
                  transition: 'background 0.15s'
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--glass-bg)'; }}
              >
                {article.imageUrl && (
                  <img
                    src={article.imageUrl}
                    alt=""
                    style={{
                      width: 80,
                      height: 56,
                      objectFit: 'cover',
                      borderRadius: 8,
                      flexShrink: 0,
                      background: 'rgba(255,255,255,0.05)'
                    }}
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                  />
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 14,
                      fontWeight: 500,
                      lineHeight: 1.35,
                      overflow: 'hidden',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical'
                    }}
                  >
                    {article.title}
                  </div>
                  <div style={{ fontSize: 11, opacity: 0.4, marginTop: 4 }}>
                    {article.source} · {article.publishedAt ? timeAgo(article.publishedAt) : ''}
                  </div>
                </div>
              </a>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
