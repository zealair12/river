import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { GlassPanel } from './GlassPanel';

interface SearchBarProps {
  onEntitySelected?: (entityId: string) => void;
}

interface SearchResult {
  id: string;
  name: string;
  type: string;
  source: string;
  detail?: string;
}

const TYPE_COLORS: Record<string, string> = {
  stock: '#00E5C8',
  company: '#34D399',
  pac: '#F59E0B',
  person: '#60A5FA',
  wallet: '#A78BFA',
  shell_company: '#FF4D6A',
  nonprofit: '#67E8F9'
};

export function SearchBar({ onEntitySelected }: SearchBarProps) {
  const navigate = useNavigate();
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<SearchResult[]>([]);

  const handleSearch = async () => {
    const trimmed = query.trim();
    if (!trimmed || loading) return;

    setLoading(true);
    setError(null);
    setResults([]);

    try {
      const [entityRes, stockRes] = await Promise.allSettled([
        fetch('/api/search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: trimmed })
        }),
        fetch(`/api/market/search?q=${encodeURIComponent(trimmed)}`)
      ]);

      const allResults: SearchResult[] = [];

      if (stockRes.status === 'fulfilled' && stockRes.value.ok) {
        const data = (await stockRes.value.json()) as {
          results?: Array<{ symbol: string; name: string }>;
        };
        (data.results ?? []).forEach((s) => {
          allResults.push({
            id: `stock:${s.symbol}`,
            name: s.symbol,
            type: 'stock',
            source: 'finnhub',
            detail: s.name
          });
        });
      }

      if (entityRes.status === 'fulfilled' && entityRes.value.ok) {
        const data = (await entityRes.value.json()) as {
          entities?: Array<{ id: string; name: string; type: string; source: string; connections?: number }>;
        };
        (data.entities ?? [])
          .filter((e) => (e.connections ?? 0) > 0 || e.type !== 'nonprofit')
          .forEach((e) => {
            allResults.push({
              id: e.id,
              name: e.name,
              type: e.type,
              source: e.source,
              detail: e.type === 'pac' ? 'Political Action Committee' : undefined
            });
          });
      }

      if (allResults.length === 0) {
        setError('No matching stocks or entities found.');
        return;
      }
      setResults(allResults);
    } catch {
      setError('Cannot reach server. Make sure the backend is running.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div ref={wrapperRef} style={{ width: '100%', position: 'relative', zIndex: 1 }}>
      <GlassPanel radius={22} style={{ width: '100%' }}>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleSearch(); }}
          placeholder="Search companies..."
          style={{
            width: '100%',
            padding: '22px 28px',
            background: 'rgba(0,0,0,0.25)',
            border: 'none',
            color: 'white',
            fontSize: 18,
            outline: 'none',
            boxSizing: 'border-box',
            borderRadius: 18
          }}
        />
      </GlassPanel>

      {loading && <p style={{ marginTop: 12, opacity: 0.5, fontSize: 14, textAlign: 'center' }}>Searching...</p>}
      {error && <p style={{ marginTop: 12, color: '#fca5a5', fontSize: 14, textAlign: 'center' }}>{error}</p>}

      {results.length > 0 && (
        <div style={{ marginTop: 8, position: 'relative', zIndex: 1 }}>
          <GlassPanel radius={18} style={{ width: '100%', maxHeight: 400, overflow: 'hidden' }}>
            <div style={{ maxHeight: 400, overflowY: 'auto' }}>
              {results.map((r, i) => {
                const color = TYPE_COLORS[r.type] ?? '#94a3b8';
                return (
                  <button
                    key={r.id + i}
                    type="button"
                    onClick={() => {
                      if (r.id.startsWith('stock:')) {
                        navigate(`/stock/${r.id.slice(6)}`);
                      } else {
                        onEntitySelected?.(r.id);
                      }
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      width: '100%',
                      padding: '14px 22px',
                      background: 'transparent',
                      border: 'none',
                      borderBottom: i < results.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none',
                      color: 'white',
                      cursor: 'pointer',
                      textAlign: 'left',
                      fontSize: 15,
                      transition: 'background 0.15s'
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(0,229,200,0.08)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                  >
                    <span style={{
                      width: 7, height: 7, borderRadius: '50%',
                      background: color, flexShrink: 0,
                      boxShadow: `0 0 6px ${color}`
                    }} />
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ fontWeight: 500 }}>{r.name}</span>
                      {r.detail && (
                        <span style={{ opacity: 0.35, marginLeft: 8, fontSize: 11 }}>{r.detail}</span>
                      )}
                    </span>
                    <span
                      style={{
                        fontSize: 9, padding: '2px 8px', borderRadius: 999,
                        background: `${color}15`, color,
                        textTransform: 'uppercase', letterSpacing: '0.05em', flexShrink: 0
                      }}
                    >
                      {r.type}
                    </span>
                  </button>
                );
              })}
            </div>
          </GlassPanel>
        </div>
      )}
    </div>
  );
}
