import { useCallback, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTraceBack } from '../context/TraceBackContext';
import type { TraceEntry } from '../context/TraceBackContext';
import { TracebackSessionsSection } from './TracebackSessionsSection';
import { isTracebackApiConfigured } from '../lib/tracebackClient';

const ASIDE_W = 368;
const TOGGLE_W = 32;

export function TraceBackPanel() {
  const {
    panelOpen,
    setPanelOpen,
    entries,
    clearEntries,
    notes,
    setNotes,
    getAssistantContext
  } = useTraceBack();

  const navigate = useNavigate();
  const location = useLocation();

  const [tab, setTab] = useState<'notes' | 'chat' | 'tree'>('notes');
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([]);
  const [chatLoading, setChatLoading] = useState(false);

  const sortedEntries = useMemo(
    () => [...entries].sort((a, b) => b.ts - a.ts),
    [entries]
  );

  const sendChat = useCallback(async () => {
    const trimmed = chatInput.trim();
    if (!trimmed || chatLoading) return;
    setChatInput('');
    setChatLoading(true);
    const userMsg = { role: 'user' as const, content: trimmed };
    setChatMessages((prev) => {
      const next = [...prev, userMsg];
      void (async () => {
        try {
          const r = await fetch('/api/assistant/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              messages: next,
              context: getAssistantContext()
            })
          });
          const data = (await r.json()) as { reply?: string; error?: string };
          if (!r.ok) throw new Error(data.error || 'Request failed');
          setChatMessages((p) => [...p, { role: 'assistant', content: data.reply ?? '' }]);
        } catch (e) {
          setChatMessages((p) => [
            ...p,
            { role: 'assistant', content: e instanceof Error ? e.message : 'Something went wrong.' }
          ]);
        } finally {
          setChatLoading(false);
        }
      })();
      return next;
    });
  }, [chatInput, chatLoading, getAssistantContext]);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'row',
        flex: 1,
        minWidth: 0,
        height: '100vh',
        maxHeight: '100vh',
        overflow: 'hidden'
      }}
    >
      <aside
        style={{
          width: panelOpen ? ASIDE_W : 0,
          minWidth: 0,
          flexShrink: 0,
          height: '100%',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          background: 'transparent',
          opacity: panelOpen ? 1 : 0,
          pointerEvents: panelOpen ? 'auto' : 'none',
          transition: 'width 0.28s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.2s ease'
        }}
      >
        <div style={{ display: 'flex', gap: 4, padding: '12px 12px 10px', borderBottom: '1px solid rgba(255,255,255,0.06)', flexShrink: 0 }}>
          {(['notes', 'chat', 'tree'] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              style={{
                flex: 1,
                padding: '8px 6px',
                borderRadius: 8,
                border: 'none',
                cursor: 'pointer',
                fontSize: 11,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                background: tab === t ? 'rgba(0,229,200,0.14)' : 'transparent',
                color: tab === t ? 'rgba(0,229,200,0.95)' : 'rgba(255,255,255,0.4)'
              }}
            >
              {t}
            </button>
          ))}
        </div>

        <div
          style={{
            flex: 1,
            minHeight: 0,
            display: 'flex',
            flexDirection: 'column',
            padding: 14,
            overflow: 'hidden',
            boxSizing: 'border-box'
          }}
        >
          {tab === 'notes' && (
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Notes..."
              style={{
                flex: 1,
                width: '100%',
                minHeight: 0,
                boxSizing: 'border-box',
                padding: 12,
                borderRadius: 10,
                border: '1px solid rgba(255,255,255,0.08)',
                background: 'rgba(0,0,0,0.25)',
                color: 'rgba(255,255,255,0.9)',
                fontSize: 13,
                lineHeight: 1.5,
                resize: 'none',
                overflowY: 'auto',
                fontFamily: 'inherit'
              }}
            />
          )}

          {tab === 'chat' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, flex: 1, minHeight: 0 }}>
              <div
                style={{
                  flex: 1,
                  overflowY: 'auto',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                  minHeight: 0
                }}
              >
                {chatMessages.map((m, i) => (
                  <div
                    key={i}
                    style={{
                      alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
                      maxWidth: '92%',
                      padding: '8px 11px',
                      borderRadius: 10,
                      fontSize: 12,
                      lineHeight: 1.45,
                      background: m.role === 'user' ? 'rgba(0,229,200,0.12)' : 'rgba(255,255,255,0.05)',
                      border: '1px solid rgba(255,255,255,0.06)',
                      color: 'rgba(255,255,255,0.9)',
                      whiteSpace: 'pre-wrap'
                    }}
                  >
                    {m.content}
                  </div>
                ))}
                {chatLoading && <div style={{ fontSize: 11, opacity: 0.4 }}>Thinking…</div>}
              </div>
              <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                <input
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      sendChat();
                    }
                  }}
                  placeholder="Ask.."
                  style={{
                    flex: 1,
                    padding: '10px 12px',
                    borderRadius: 10,
                    border: '1px solid rgba(255,255,255,0.1)',
                    background: 'rgba(0,0,0,0.3)',
                    color: 'white',
                    fontSize: 13
                  }}
                />
                <button
                  type="button"
                  onClick={sendChat}
                  disabled={chatLoading}
                  style={{
                    padding: '10px 14px',
                    borderRadius: 10,
                    border: '1px solid rgba(0,229,200,0.35)',
                    background: 'rgba(0,229,200,0.12)',
                    color: 'rgba(0,229,200,0.95)',
                    cursor: chatLoading ? 'wait' : 'pointer',
                    fontSize: 12
                  }}
                >
                  Send
                </button>
              </div>
            </div>
          )}

          {tab === 'tree' && (
            <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
              {isTracebackApiConfigured() && <TracebackSessionsSection />}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: 8,
                  flexShrink: 0,
                  gap: 8
                }}
              >
                <span
                  style={{
                    fontSize: 10,
                    opacity: 0.38,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase'
                  }}
                >
                  River trail
                </span>
                <button
                  type="button"
                  onClick={clearEntries}
                  style={{
                    fontSize: 10,
                    padding: '4px 10px',
                    borderRadius: 6,
                    border: '1px solid rgba(255,255,255,0.12)',
                    background: 'transparent',
                    color: 'rgba(255,255,255,0.45)',
                    cursor: 'pointer'
                  }}
                >
                  Clear
                </button>
              </div>
              <div
                style={{
                  flex: 1,
                  overflowY: 'auto',
                  minHeight: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 4,
                  paddingRight: 4
                }}
              >
                {sortedEntries.length === 0 && (
                  <div style={{ fontSize: 12, opacity: 0.35, padding: '8px 4px' }}> </div>
                )}
                {sortedEntries.map((e) => (
                  <TrailRow key={e.id} entry={e} active={location.pathname === e.path} onPick={() => navigate(e.path)} />
                ))}
              </div>
            </div>
          )}
        </div>
      </aside>

      <button
        type="button"
        aria-expanded={panelOpen}
        aria-label={panelOpen ? 'Close side panel' : 'Open side panel'}
        onClick={() => setPanelOpen((o) => !o)}
        style={{
          width: TOGGLE_W,
          flexShrink: 0,
          alignSelf: 'stretch',
          border: 'none',
          borderLeft: '1px solid rgba(0,229,200,0.2)',
          background: 'rgba(6, 15, 11, 0.96)',
          color: 'rgba(0,229,200,0.9)',
          cursor: 'pointer',
          fontSize: 18,
          fontWeight: 300,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 0,
          boxSizing: 'border-box'
        }}
      >
        {panelOpen ? '›' : '‹'}
      </button>
    </div>
  );
}

function TrailRow({ entry, active, onPick }: { entry: TraceEntry; active: boolean; onPick: () => void }) {
  return (
    <div
      style={{
        borderRadius: 8,
        padding: '8px 10px',
        background: active ? 'rgba(38,38,42,0.95)' : 'transparent',
        border: active ? '1px solid rgba(0,229,200,0.22)' : '1px solid transparent',
        transition: 'background 0.15s ease'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <button
          type="button"
          onClick={onPick}
          style={{
            flex: 1,
            minWidth: 0,
            textAlign: 'left',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: 0,
            fontSize: 13,
            lineHeight: 1.35,
            color: active ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.45)',
            fontWeight: active ? 500 : 400
          }}
        >
          <span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{entry.label}</span>
        </button>
      </div>
      <div style={{ fontSize: 9, opacity: 0.32, marginTop: 4, paddingLeft: 0 }}>{new Date(entry.ts).toLocaleString()}</div>
    </div>
  );
}
