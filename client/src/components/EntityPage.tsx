import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import LiquidGlass from 'liquid-glass-react';
import FlowGraph from './FlowGraph';
import { NewsBubbleField } from './NewsBubbleField';
import type { OrbitNewsItem } from './NewsOrbitRow';
import { useTraceBack } from '../context/TraceBackContext';

interface EntityData {
  id: string;
  name: string;
  type: string;
  source: string;
  [key: string]: unknown;
}

interface GraphData {
  nodes: EntityData[];
  edges: Array<{
    id: string; fromId: string; toId: string; type: string;
    amount?: number; currency?: string; date?: string; source?: string; kind?: string;
  }>;
}

interface NewsArticle {
  title: string;
  description: string | null;
  url: string;
  imageUrl: string | null;
  source: string;
  publishedAt: string;
}

interface StockAnalysis {
  bullets: string[];
}

interface StockMatch {
  quote: { symbol: string; current: number; change: number; changePercent: number; high: number; low: number; open: number; previousClose: number } | null;
  candles: { timestamps: number[]; closes: number[] } | null;
  profile: { name: string; logo: string; industry: string; marketCap: number; exchange: string; ipo: string; weburl: string; country: string } | null;
  news: Array<{ headline: string; url: string; image: string; source: string; datetime: number }>;
  analysis?: StockAnalysis | null;
}

function timeAgo(dateStr: string): string {
  const ms = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(ms / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function mergedOrbitNews(stock: StockMatch | null, apiNews: NewsArticle[]): OrbitNewsItem[] {
  const map = new Map<string, OrbitNewsItem>();
  const normKey = (u: string) => u.replace(/\?.*$/, '').toLowerCase();
  const put = (url: string, item: OrbitNewsItem) => {
    const k = normKey(url);
    if (!map.has(k)) map.set(k, item);
  };
  for (const a of stock?.news ?? []) {
    put(a.url, {
      title: a.headline,
      url: a.url,
      source: a.source || 'Finnhub',
      imageUrl: a.image || null,
      dateLabel: a.datetime > 0 ? new Date(a.datetime * 1000).toLocaleDateString() : undefined
    });
  }
  for (const a of apiNews) {
    put(a.url, {
      title: a.title,
      url: a.url,
      source: a.source,
      imageUrl: a.imageUrl,
      dateLabel: a.publishedAt ? timeAgo(a.publishedAt) : undefined
    });
  }
  return [...map.values()].slice(0, 24);
}

function formatUsd(n: number): string {
  if (n >= 1e12) return `$${(n / 1e12).toFixed(2)}T`;
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  return `$${n.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

function MiniChart({ closes }: { closes: number[] }) {
  if (closes.length < 2) return null;
  const W = 600, H = 180, PL = 50, PR = 10, PT = 10, PB = 24;
  const cw = W - PL - PR, ch = H - PT - PB;
  const min = Math.min(...closes), max = Math.max(...closes);
  const range = max - min || 1;
  const step = cw / (closes.length - 1);
  const pts = closes.map((v, i) => `${PL + i * step},${PT + ch - ((v - min) / range) * ch}`);
  const positive = closes[closes.length - 1] >= closes[0];
  const col = positive ? '#86efac' : '#fca5a5';
  const fill = positive ? 'rgba(134,239,172,0.06)' : 'rgba(252,165,165,0.06)';
  const area = [`${PL},${PT + ch}`, ...pts, `${PL + (closes.length - 1) * step},${PT + ch}`].join(' ');
  const yTicks = Array.from({ length: 4 }, (_, i) => {
    const val = min + (range * i) / 3;
    return { y: PT + ch - ((val - min) / range) * ch, label: `$${val.toFixed(val < 10 ? 2 : 0)}` };
  });
  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ display: 'block' }}>
      {yTicks.map((yl) => (
        <g key={yl.y}><line x1={PL} y1={yl.y} x2={W - PR} y2={yl.y} stroke="rgba(255,255,255,0.05)" />
        <text x={PL - 6} y={yl.y + 3} textAnchor="end" fill="rgba(255,255,255,0.25)" fontSize={9}>{yl.label}</text></g>
      ))}
      <polygon points={area} fill={fill} /><polyline points={pts.join(' ')} fill="none" stroke={col} strokeWidth={1.5} />
    </svg>
  );
}

const TYPE_COLORS: Record<string, string> = {
  company: '#34D399', nonprofit: '#67E8F9', person: '#60A5FA',
  pac: '#F59E0B', wallet: '#A78BFA', shell_company: '#FF4D6A', search_cluster: '#475569'
};

export default function EntityPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const pageRef = useRef<HTMLDivElement>(null);
  const { registerPageContext } = useTraceBack();
  const [entity, setEntity] = useState<EntityData | null>(null);
  const [graph, setGraph] = useState<GraphData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [news, setNews] = useState<NewsArticle[]>([]);
  const [stock, setStock] = useState<StockMatch | null>(null);

  const handleGraphNodeClick = useCallback(
    (nodeId: string) => navigate(`/entity/${encodeURIComponent(nodeId)}`), [navigate]
  );

  useEffect(() => {
    if (!id) return;
    const ac = new AbortController();
    setLoading(true); setError(null); setEntity(null); setGraph(null); setNews([]); setStock(null);
    const entityId = decodeURIComponent(id);

    Promise.allSettled([
      fetch(`/api/entity/${encodeURIComponent(entityId)}`, { signal: ac.signal }).then((r) => (r.ok ? r.json() : null)),
      fetch(`/api/graph/${encodeURIComponent(entityId)}`, { signal: ac.signal }).then((r) => (r.ok ? r.json() : null))
    ]).then(([entityResult, graphResult]) => {
      if (ac.signal.aborted) return;
      if (entityResult.status === 'fulfilled' && entityResult.value) {
        const ent = entityResult.value as EntityData;
        setEntity(ent);

        // Fetch news for entity name
        fetch(`/api/market/news?q=${encodeURIComponent(ent.name)}`, { signal: ac.signal })
          .then((r) => (r.ok ? r.json() : null))
          .then((d) => { if (!ac.signal.aborted && d?.articles) setNews(d.articles); })
          .catch(() => {});

        // Try to find a stock match via Finnhub symbol search
        fetch(`/api/market/search?q=${encodeURIComponent(ent.name)}`, { signal: ac.signal })
          .then((r) => (r.ok ? r.json() : null))
          .then((d) => {
            if (ac.signal.aborted) return;
            const match = d?.results?.[0];
            if (match?.symbol) {
              fetch(`/api/market/stock/${encodeURIComponent(match.symbol)}`, { signal: ac.signal })
                .then((r) => (r.ok ? r.json() : null))
                .then((sd) => { if (!ac.signal.aborted && sd?.quote) setStock(sd); })
                .catch(() => {});
            }
          })
          .catch(() => {});
      }
      if (graphResult.status === 'fulfilled' && graphResult.value?.nodes) setGraph(graphResult.value);
      if ((entityResult.status === 'rejected' || !entityResult.value) &&
          (graphResult.status === 'rejected' || !graphResult.value)) setError('Failed to load entity data.');
      setLoading(false);
    });

    return () => ac.abort();
  }, [id]);

  useEffect(() => {
    if (!entity) {
      registerPageContext(null);
      return;
    }
    const headlines = [
      ...news.slice(0, 12).map((a) => a.title),
      ...(stock?.news ?? []).slice(0, 8).map((a) => a.headline)
    ].filter(Boolean);
    registerPageContext({
      type: 'entity',
      entityId: entity.id,
      name: entity.name,
      entityType: entity.type,
      stockSymbol: stock?.quote?.symbol ?? null,
      newsHeadlines: [...new Set(headlines)].slice(0, 24)
    });
    return () => registerPageContext(null);
  }, [entity, news, stock, registerPageContext]);

  const color = TYPE_COLORS[entity?.type ?? ''] ?? '#94a3b8';
  const metaFields = entity
    ? Object.entries(entity).filter(([k]) => !['id', 'name', 'type', 'source', 'createdAt', 'updatedAt', 'connections'].includes(k))
    : [];

  const nodeById = new Map((graph?.nodes ?? []).map((n) => [n.id, n]));
  const moneyFlows = (graph?.edges ?? [])
    .filter((e) => e.type === 'DONATED_TO' && typeof e.amount === 'number')
    .map((e) => {
      const outgoing = e.fromId === entity?.id;
      const counterpartyId = outgoing ? e.toId : e.fromId;
      return { ...e, outgoing, counterpartyId, counterpartyName: nodeById.get(counterpartyId)?.name ?? counterpartyId };
    })
    .sort((a, b) => Number(b.amount ?? 0) - Number(a.amount ?? 0));

  const sq = stock?.quote;
  const positive = (sq?.changePercent ?? 0) >= 0;
  const orbitNewsItems = mergedOrbitNews(stock, news);

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
      <div style={{ maxWidth: 'min(1600px, 100%)', width: '100%', margin: '0 auto', padding: '64px clamp(16px, 3vw, 36px) 32px', boxSizing: 'border-box' }}>

        {loading && <div style={{ textAlign: 'center', opacity: 0.5, paddingTop: 80 }}>Loading...</div>}
        {error && <div style={{ textAlign: 'center', color: '#fca5a5', paddingTop: 80 }}>{error}</div>}

        {!loading && !error && entity && (
          <>
            <div className="entity-layout">
              <div style={{ minWidth: 0 }}>
              {/* Header — Liquid Glass */}
              <LiquidGlass
                mouseContainer={pageRef}
                displacementScale={50}
                blurAmount={0.04}
                saturation={140}
                aberrationIntensity={1.5}
                elasticity={0.18}
                cornerRadius={18}
                padding="24px"
                style={{ marginBottom: 16 }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 12 }}>
                  {stock?.profile?.logo && (
                    <img src={stock.profile.logo} alt="" style={{ width: 44, height: 44, borderRadius: 10, background: 'white' }}
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                  )}
                  <div style={{ flex: 1 }}>
                    <h1 style={{ margin: 0, fontSize: 26, fontWeight: 400, lineHeight: 1.2, paddingTop: 2 }}>{entity.name}</h1>
                    <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 10, padding: '2px 10px', borderRadius: 999, background: `${color}15`, color, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{entity.type}</span>
                      <span style={{ fontSize: 10, padding: '2px 10px', borderRadius: 999, background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.4)' }}>{entity.source}</span>
                      {stock?.profile?.industry && <span style={{ fontSize: 10, padding: '2px 10px', borderRadius: 999, background: 'rgba(0,229,200,0.08)', color: 'rgba(0,229,200,0.7)' }}>{stock.profile.industry}</span>}
                      {stock?.profile?.exchange && <span style={{ fontSize: 10, padding: '2px 10px', borderRadius: 999, background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.35)' }}>{stock.profile.exchange}</span>}
                    </div>
                  </div>
                </div>

                {sq && (
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 16, marginTop: 8, padding: '12px 0', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                    <span style={{ fontSize: 32, fontWeight: 600 }}>{formatUsd(sq.current)}</span>
                    <span style={{ fontSize: 16, color: positive ? '#86efac' : '#fca5a5' }}>
                      {positive ? '+' : ''}{sq.change.toFixed(2)} ({positive ? '+' : ''}{sq.changePercent.toFixed(2)}%)
                    </span>
                  </div>
                )}

                {metaFields.length > 0 && (
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
                    {metaFields.map(([key, value]) => (
                      <div key={key} style={{ padding: '6px 12px', borderRadius: 8, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.04)', fontSize: 12 }}>
                        <span style={{ opacity: 0.35, textTransform: 'uppercase', fontSize: 9, letterSpacing: '0.05em' }}>{key} </span>
                        <span>{String(value ?? '—')}</span>
                      </div>
                    ))}
                  </div>
                )}
              </LiquidGlass>

              {/* Stock chart */}
              {stock?.candles && (
                <div style={{ padding: 20, borderRadius: 16, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', marginBottom: 16 }}>
                  <div style={{ fontSize: 11, textTransform: 'uppercase', opacity: 0.3, letterSpacing: '0.08em', marginBottom: 10 }}>
                    90-Day Price Chart · {sq?.symbol}
                  </div>
                  {stock.analysis?.bullets?.length ? (
                    <ul style={{ margin: '0 0 14px', paddingLeft: 18, fontSize: 13, lineHeight: 1.5, opacity: 0.78 }}>
                      {stock.analysis.bullets.map((b, i) => (
                        <li key={i} style={{ marginBottom: 6 }}>{b}</li>
                      ))}
                    </ul>
                  ) : null}
                  <MiniChart closes={stock.candles.closes} />
                  {sq && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(0, 1fr))', gap: 8, marginTop: 12 }}>
                      {[{ l: 'Open', v: formatUsd(sq.open) }, { l: 'Close', v: formatUsd(sq.previousClose) }, { l: 'High', v: formatUsd(sq.high) }, { l: 'Low', v: formatUsd(sq.low) },
                        ...(stock.profile ? [{ l: 'Mkt Cap', v: formatUsd(stock.profile.marketCap) }, { l: 'IPO', v: stock.profile.ipo }, { l: 'Country', v: stock.profile.country }] : [])
                      ].map((s) => (
                        <div key={s.l} style={{ padding: '8px 10px', borderRadius: 8, background: 'rgba(255,255,255,0.02)' }}>
                          <div style={{ fontSize: 9, textTransform: 'uppercase', opacity: 0.3, marginBottom: 2 }}>{s.l}</div>
                          <div style={{ fontSize: 14, fontWeight: 500 }}>{s.v}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Flow graph */}
              {graph && graph.nodes.length > 1 && entity && (
                <FlowGraph nodes={graph.nodes} edges={graph.edges} currentEntityId={entity.id} onNodeClick={handleGraphNodeClick} />
              )}

              {/* Money flow list */}
              {moneyFlows.length > 0 && (
                <div style={{ marginTop: 16, padding: 20, borderRadius: 16, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <div style={{ fontSize: 11, textTransform: 'uppercase', opacity: 0.3, letterSpacing: '0.08em', marginBottom: 12 }}>
                    Money Flow ({moneyFlows.length})
                  </div>
                  <div style={{ display: 'grid', gap: 6 }}>
                    {moneyFlows.slice(0, 30).map((flow) => (
                      <button key={flow.id} type="button" onClick={() => navigate(`/entity/${encodeURIComponent(flow.counterpartyId)}`)}
                        style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '10px 12px', borderRadius: 8, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)', color: 'white', cursor: 'pointer', textAlign: 'left', transition: 'background 0.15s' }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(0,229,200,0.05)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.02)'; }}>
                        <span style={{ fontSize: 16, color: flow.outgoing ? '#fca5a5' : '#86efac', width: 16 }}>{flow.outgoing ? '→' : '←'}</span>
                        <span style={{ flex: 1, minWidth: 0, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{flow.counterpartyName}</span>
                        <span style={{ fontSize: 14, fontWeight: 600, flexShrink: 0 }}>${Number(flow.amount ?? 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                        <span style={{ fontSize: 10, opacity: 0.3, flexShrink: 0 }}>{flow.date ?? ''}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Connections */}
              {graph && graph.nodes.length > 1 && (
                <div style={{ marginTop: 16, padding: 20, borderRadius: 16, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <div style={{ fontSize: 11, textTransform: 'uppercase', opacity: 0.3, letterSpacing: '0.08em', marginBottom: 12 }}>
                    Connections ({graph.nodes.filter((n) => n.id !== entity.id && n.type !== 'search_cluster').length})
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {graph.nodes.filter((n) => n.id !== entity.id && n.type !== 'search_cluster').map((node) => (
                      <button key={node.id} type="button" onClick={() => navigate(`/entity/${encodeURIComponent(node.id)}`)}
                        style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 8, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', color: 'white', cursor: 'pointer', fontSize: 12, transition: 'background 0.15s' }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; }}>
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: TYPE_COLORS[node.type] ?? '#94a3b8' }} />
                        {node.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
            </div>

            {orbitNewsItems.length > 0 && (
              <section style={{ marginTop: 28, paddingBottom: 40 }}>
                <NewsBubbleField items={orbitNewsItems} />
              </section>
            )}
          </>
        )}

        {!loading && !error && !entity && (
          <div style={{ textAlign: 'center', opacity: 0.5, paddingTop: 80 }}>Entity not found.</div>
        )}
      </div>
    </div>
  );
}
