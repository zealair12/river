import { useEffect, useState } from 'react';
import type { SessionResponse } from '@traceback/shared';
import { getTracebackAppUrl, getTracebackClient } from '../lib/tracebackClient';

/**
 * Lists Traceback chat sessions via `@traceback/shared` — same API as the Traceback app sidebar.
 */
export function TracebackSessionsSection() {
  const client = getTracebackClient();
  const [sessions, setSessions] = useState<SessionResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!client) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    client
      .fetchSessions()
      .then((rows) => {
        if (!cancelled) setSessions(rows);
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load sessions');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [client]);

  if (!client) return null;

  const appUrl = getTracebackAppUrl();

  return (
    <div style={{ marginBottom: 16, flexShrink: 0 }}>
      <div
        style={{
          fontSize: 10,
          opacity: 0.38,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          marginBottom: 8
        }}
      >
        Saved chats
      </div>
      {loading && <div style={{ fontSize: 12, opacity: 0.45 }}>Loading…</div>}
      {error && (
        <div style={{ fontSize: 11, opacity: 0.55, lineHeight: 1.4 }}>
          {error}
          <div style={{ marginTop: 6, opacity: 0.7 }}>
            Start the chat API (e.g. port 4000) and set <code style={{ fontSize: 10 }}>VITE_TRACEBACK_API_URL</code>.
          </div>
        </div>
      )}
      {!loading && !error && sessions.length === 0 && (
        <div style={{ fontSize: 12, opacity: 0.4 }}>No sessions yet.</div>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 160, overflowY: 'auto' }}>
        {sessions.slice(0, 40).map((s) => (
          <div
            key={s.id}
            style={{
              borderRadius: 8,
              padding: '8px 10px',
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.06)',
              fontSize: 12,
              lineHeight: 1.35,
              color: 'rgba(255,255,255,0.82)'
            }}
          >
            <span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {s.name?.trim() || 'Untitled'}
            </span>
            <span style={{ fontSize: 9, opacity: 0.35 }}>{new Date(s.updatedAt).toLocaleString()}</span>
          </div>
        ))}
      </div>
      <a
        href={appUrl}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          display: 'inline-block',
          marginTop: 10,
          fontSize: 11,
          color: 'rgba(0,229,200,0.85)',
          textDecoration: 'none',
          opacity: 0.9
        }}
      >
        Open full chat app →
      </a>
    </div>
  );
}
