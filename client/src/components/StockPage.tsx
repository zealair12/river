import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import LiquidGlass from 'liquid-glass-react';
import { InteractivePriceChart } from './InteractivePriceChart';
import { NewsBubbleField } from './NewsBubbleField';
import type { OrbitNewsItem } from './NewsOrbitRow';
import { CHART_PRESETS, type ChartPresetKey } from '../chartPresets';
import { computeClientAnalysis } from '../utils/stockAnalysisClient';
import { useTraceBack } from '../context/TraceBackContext';

interface StockQuote {
  symbol: string;
  current: number;
  change: number;
  changePercent: number;
  high: number;
  low: number;
  open: number;
  previousClose: number;
}

interface StockCandle {
  timestamps: number[];
  closes: number[];
  volumes: number[];
}

interface CompanyProfile {
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

interface CompanyNewsItem {
  headline: string;
  summary: string;
  url: string;
  image: string;
  source: string;
  datetime: number;
}

interface StockAnalysis {
  periodReturnPct: number;
  periodHigh: number;
  periodLow: number;
  rangePct: number;
  volDailyPct: number;
  volumeVsAvg: number | null;
  bullets: string[];
}

interface AnalystRecommendationRow {
  period: string;
  strongBuy: number;
  buy: number;
  hold: number;
  sell: number;
  strongSell: number;
}

interface StockDetail {
  quote: StockQuote | null;
  candles: StockCandle | null;
  profile: CompanyProfile | null;
  news: CompanyNewsItem[];
  analysis: StockAnalysis | null;
  recommendations: AnalystRecommendationRow[];
}

function MetricChip({ acronym, title, value }: { acronym: string; title: string; value: string }) {
  return (
    <div
      title={title}
      style={{
        padding: '10px 12px',
        borderRadius: 10,
        background: 'rgba(0,0,0,0.28)',
        border: '1px solid rgba(255,255,255,0.08)',
        minWidth: 76,
        flex: '0 1 auto'
      }}
    >
      <div
        style={{
          fontSize: 9,
          opacity: 0.42,
          letterSpacing: '0.1em',
          marginBottom: 5,
          textTransform: 'uppercase'
        }}
      >
        {acronym}
      </div>
      <div style={{ fontSize: 13, fontWeight: 500, lineHeight: 1.25, wordBreak: 'break-word' }}>{value}</div>
    </div>
  );
}

function formatUsd(n: number): string {
  if (n >= 1e12) return `$${(n / 1e12).toFixed(2)}T`;
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  return `$${n.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

export default function StockPage() {
  const { symbol } = useParams<{ symbol: string }>();
  const navigate = useNavigate();
  const pageRef = useRef<HTMLDivElement>(null);
  const { registerPageContext } = useTraceBack();
  const [data, setData] = useState<StockDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [chartPreset, setChartPreset] = useState<ChartPresetKey>('3mo');
  const [chartCandles, setChartCandles] = useState<StockCandle | null>(null);
  const [chartLoading, setChartLoading] = useState(false);

  useEffect(() => {
    if (!symbol) return;
    const ac = new AbortController();
    setLoading(true);
    setData(null);
    setChartPreset('3mo');

    fetch(`/api/market/stock/${encodeURIComponent(symbol.toUpperCase())}`, { signal: ac.signal })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!ac.signal.aborted && d) {
          setData(d);
          if (d.candles) setChartCandles(d.candles);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!ac.signal.aborted) setLoading(false);
      });

    return () => ac.abort();
  }, [symbol]);

  useEffect(() => {
    if (!symbol || !data) return;
    const preset = CHART_PRESETS.find((p) => p.key === chartPreset);
    if (!preset) return;

    if (chartPreset === '3mo' && data.candles) {
      setChartCandles(data.candles);
      return;
    }

    const ac = new AbortController();
    setChartLoading(true);
    fetch(
      `/api/market/stock/${encodeURIComponent(symbol.toUpperCase())}/candles?range=${encodeURIComponent(preset.range)}&interval=${encodeURIComponent(preset.interval)}`,
      { signal: ac.signal }
    )
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!ac.signal.aborted && d?.candles) setChartCandles(d.candles);
      })
      .catch(() => {})
      .finally(() => {
        if (!ac.signal.aborted) setChartLoading(false);
      });

    return () => ac.abort();
  }, [symbol, chartPreset, data]);

  useEffect(() => {
    if (!data?.quote) {
      registerPageContext(null);
      return;
    }
    const sym = symbol?.toUpperCase() ?? '';
    registerPageContext({
      type: 'stock',
      symbol: sym,
      quote: data.quote,
      profile: data.profile,
      newsHeadlines: (data.news ?? []).slice(0, 20).map((n) => n.headline),
      newsSummaries: (data.news ?? []).slice(0, 8).map((n) => ({ headline: n.headline, source: n.source })),
      recommendations: data.recommendations?.slice(0, 3)
    });
    return () => registerPageContext(null);
  }, [data, symbol, registerPageContext]);

  const q = data?.quote;
  const p = data?.profile;
  const recommendations = data?.recommendations ?? [];
  const positive = (q?.changePercent ?? 0) >= 0;

  const displayAnalysis = useMemo(() => computeClientAnalysis(chartCandles), [chartCandles]);

  const orbitNews: OrbitNewsItem[] = (data?.news ?? []).map((article) => ({
    title: article.headline,
    url: article.url,
    source: article.source || 'News',
    imageUrl: article.image || null,
    dateLabel: article.datetime > 0 ? new Date(article.datetime * 1000).toLocaleDateString() : undefined
  }));

  return (
    <div
      ref={pageRef}
      style={{
        position: 'relative',
        minHeight: '100vh',
        width: '100%',
        maxWidth: '100vw',
        overflowX: 'hidden',
        overflowY: 'auto',
        boxSizing: 'border-box',
        background: '#060f0b'
      }}
    >
      <button
        type="button"
        onClick={() => navigate('/')}
        aria-label="Back"
        style={{
          position: 'fixed',
          top: 18,
          left: 20,
          zIndex: 40,
          background: 'rgba(0,0,0,0.4)',
          border: '1px solid rgba(255,255,255,0.12)',
          color: 'rgba(255,255,255,0.85)',
          width: 42,
          height: 42,
          borderRadius: 11,
          cursor: 'pointer',
          fontSize: 24,
          lineHeight: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          paddingBottom: 2
        }}
      >
        ‹
      </button>

      <div
        style={{
          padding: '64px clamp(16px, 3vw, 36px) 32px',
          maxWidth: 'min(1600px, 100%)',
          margin: '0 auto',
          boxSizing: 'border-box',
          width: '100%'
        }}
      >
        {loading && (
          <div style={{ textAlign: 'center', opacity: 0.5, paddingTop: 80 }}>Loading stock data...</div>
        )}

        {!loading && !data?.quote && (
          <div style={{ textAlign: 'center', opacity: 0.5, paddingTop: 80 }}>
            No data available for {symbol?.toUpperCase()}.
          </div>
        )}

        {!loading && q && (
          <>
            <LiquidGlass
              mouseContainer={pageRef}
              displacementScale={50}
              blurAmount={0.04}
              saturation={140}
              aberrationIntensity={1.5}
              elasticity={0.18}
              cornerRadius={18}
              padding="24px"
              style={{ marginBottom: 20 }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 12 }}>
                {p?.logo && (
                  <img
                    src={p.logo}
                    alt=""
                    style={{ width: 48, height: 48, borderRadius: 12, background: 'white', flexShrink: 0 }}
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                )}
                <div style={{ minWidth: 0 }}>
                  <h1 style={{ margin: 0, fontSize: 28, fontWeight: 400, lineHeight: 1.2, paddingTop: 2 }}>
                    {p?.name ?? symbol?.toUpperCase()}
                  </h1>
                  <div
                    style={{
                      display: 'flex',
                      gap: 8,
                      alignItems: 'center',
                      marginTop: 6,
                      opacity: 0.5,
                      fontSize: 13,
                      flexWrap: 'wrap'
                    }}
                  >
                    <span>{q.symbol}</span>
                    {p?.exchange && <span>· {p.exchange}</span>}
                    {p?.industry && <span>· {p.industry}</span>}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'baseline', gap: 16, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 36, fontWeight: 600 }}>{formatUsd(q.current)}</span>
                <span style={{ fontSize: 18, color: positive ? '#86efac' : '#fca5a5' }}>
                  {positive ? '+' : ''}
                  {q.change.toFixed(2)} ({positive ? '+' : ''}
                  {q.changePercent.toFixed(2)}%)
                </span>
              </div>
            </LiquidGlass>

            {recommendations.length > 0 && (
              <div
                style={{
                  padding: 20,
                  borderRadius: 16,
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.06)',
                  marginBottom: 20,
                  overflowX: 'auto'
                }}
              >
                <h3
                  style={{
                    margin: '0 0 12px',
                    fontSize: 13,
                    opacity: 0.4,
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em'
                  }}
                >
                  Analyst consensus (Finnhub)
                </h3>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, minWidth: 420 }}>
                  <thead>
                    <tr style={{ color: 'rgba(255,255,255,0.35)', textAlign: 'left' }}>
                      <th style={{ padding: '6px 8px' }}>Period</th>
                      <th style={{ padding: '6px 8px' }}>Str. buy</th>
                      <th style={{ padding: '6px 8px' }}>Buy</th>
                      <th style={{ padding: '6px 8px' }}>Hold</th>
                      <th style={{ padding: '6px 8px' }}>Sell</th>
                      <th style={{ padding: '6px 8px' }}>Str. sell</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recommendations.slice(0, 4).map((row) => (
                      <tr key={row.period} style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                        <td style={{ padding: '8px', opacity: 0.9 }}>{row.period}</td>
                        <td style={{ padding: '8px' }}>{row.strongBuy}</td>
                        <td style={{ padding: '8px' }}>{row.buy}</td>
                        <td style={{ padding: '8px' }}>{row.hold}</td>
                        <td style={{ padding: '8px' }}>{row.sell}</td>
                        <td style={{ padding: '8px' }}>{row.strongSell}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {chartCandles && chartCandles.closes.length > 1 && (
              <div
                style={{
                  padding: 20,
                  borderRadius: 16,
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.06)',
                  marginBottom: 20
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 12,
                    marginBottom: 14
                  }}
                >
                  <h3
                    style={{
                      margin: 0,
                      fontSize: 13,
                      opacity: 0.4,
                      textTransform: 'uppercase',
                      letterSpacing: '0.08em'
                    }}
                  >
                    Price chart
                  </h3>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {CHART_PRESETS.map((pr) => (
                      <button
                        key={pr.key}
                        type="button"
                        onClick={() => setChartPreset(pr.key)}
                        style={{
                          padding: '6px 11px',
                          borderRadius: 8,
                          border:
                            chartPreset === pr.key
                              ? '1px solid rgba(0,229,200,0.45)'
                              : '1px solid rgba(255,255,255,0.1)',
                          background: chartPreset === pr.key ? 'rgba(0,229,200,0.1)' : 'rgba(0,0,0,0.2)',
                          color: chartPreset === pr.key ? 'rgba(0,229,200,0.95)' : 'rgba(255,255,255,0.55)',
                          cursor: 'pointer',
                          fontSize: 11,
                          fontWeight: 600
                        }}
                      >
                        {pr.label}
                      </button>
                    ))}
                  </div>
                </div>
                {chartLoading && (
                  <div style={{ fontSize: 12, opacity: 0.4, marginBottom: 8 }}>Loading range…</div>
                )}
                <InteractivePriceChart candles={chartCandles} />
                {displayAnalysis && (
                  <div
                    style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: 8,
                      marginTop: 16,
                      paddingTop: 14,
                      borderTop: '1px solid rgba(255,255,255,0.06)'
                    }}
                  >
                    <MetricChip
                      acronym="RET"
                      title="Total return over selected chart range (first to last close)"
                      value={`${displayAnalysis.periodReturnPct >= 0 ? '+' : ''}${displayAnalysis.periodReturnPct.toFixed(1)}%`}
                    />
                    <MetricChip
                      acronym="RNG"
                      title="High–low range as % of period low"
                      value={`${displayAnalysis.rangePct.toFixed(1)}%`}
                    />
                    <MetricChip
                      acronym="H/L"
                      title="Period high and low (closes)"
                      value={`${formatUsd(displayAnalysis.periodLow)} → ${formatUsd(displayAnalysis.periodHigh)}`}
                    />
                    <MetricChip
                      acronym="σd"
                      title="Std. dev. of daily close-to-close returns (%)"
                      value={`${displayAnalysis.volDailyPct.toFixed(2)}%`}
                    />
                    <MetricChip
                      acronym="V/μ"
                      title="Latest volume vs average volume in range"
                      value={
                        displayAnalysis.volumeVsAvg != null
                          ? `${displayAnalysis.volumeVsAvg.toFixed(2)}×`
                          : '—'
                      }
                    />
                  </div>
                )}
              </div>
            )}

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
                gap: 10,
                marginBottom: 28
              }}
            >
              {[
                { label: 'Open', value: formatUsd(q.open) },
                { label: 'Previous Close', value: formatUsd(q.previousClose) },
                { label: 'Day High', value: formatUsd(q.high) },
                { label: 'Day Low', value: formatUsd(q.low) },
                ...(p
                  ? [
                      { label: 'Market Cap', value: formatUsd(p.marketCap) },
                      { label: 'Country', value: p.country },
                      { label: 'IPO Date', value: p.ipo }
                    ]
                  : [])
              ].map((stat) => (
                <div
                  key={stat.label}
                  style={{
                    padding: '14px 16px',
                    borderRadius: 12,
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.06)'
                  }}
                >
                  <div
                    style={{
                      fontSize: 10,
                      textTransform: 'uppercase',
                      opacity: 0.4,
                      marginBottom: 6,
                      letterSpacing: '0.05em'
                    }}
                  >
                    {stat.label}
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 500 }}>{stat.value}</div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {!loading && q && orbitNews.length > 0 && (
        <section
          style={{
            padding: '0 clamp(12px, 2.5vw, 28px) 48px',
            maxWidth: 'min(1600px, 100%)',
            margin: '0 auto',
            boxSizing: 'border-box',
            width: '100%'
          }}
        >
          <NewsBubbleField items={orbitNews} />
        </section>
      )}
    </div>
  );
}
