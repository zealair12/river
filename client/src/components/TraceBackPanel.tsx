import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { MessageResponse } from '@traceback/shared';
import { useTraceBack } from '../context/TraceBackContext';
import { TracebackSessionsSection } from './TracebackSessionsSection';
import { getTracebackClient, isTracebackApiConfigured } from '../lib/tracebackClient';
import { ChatMarkdown } from './ChatMarkdown';
import { LocalConversationTrace } from './ChatConversationTrace';
import { TracebackConversationTree } from './traceback/TracebackConversationTree';
import {
  createEmptySession,
  deriveChatTitle,
  loadChatSessionsState,
  saveChatSessionsState,
  type ChatSessionStored
} from './chatSessionsStorage';

type TraceBackPanelProps = {
  panelWidth: number;
  caretWidth: number;
};

export function TraceBackPanel({ panelWidth, caretWidth }: TraceBackPanelProps) {
  const bootstrap = useMemo(() => {
    const loaded = loadChatSessionsState();
    const sessions = loaded.sessions.length ? loaded.sessions : [createEmptySession()];
    const activeId =
      loaded.activeId && sessions.some((s) => s.id === loaded.activeId) ? loaded.activeId : sessions[0].id;
    return { sessions, activeId };
  }, []);

  const { panelOpen, setPanelOpen, notes, setNotes, getAssistantContext } = useTraceBack();

  const [tab, setTab] = useState<'notes' | 'chat' | 'tree'>('notes');
  const [chatInput, setChatInput] = useState('');
  const [chatSessions, setChatSessions] = useState<ChatSessionStored[]>(bootstrap.sessions);
  const [activeChatId, setActiveChatId] = useState<string>(bootstrap.activeId);
  const [chatMessages, setChatMessages] = useState(() => {
    const cur = bootstrap.sessions.find((s) => s.id === bootstrap.activeId)!;
    return cur.messages;
  });
  const [chatLoading, setChatLoading] = useState(false);

  const activeBoot = bootstrap.sessions.find((s) => s.id === bootstrap.activeId)!;
  const tbSessionIdRef = useRef<string | null>(activeBoot.tracebackSessionId ?? null);
  const tbParentIdRef = useRef<string | null>(activeBoot.tracebackParentId ?? null);
  const chatSendingRef = useRef(false);
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const selectionMenuRef = useRef<HTMLDivElement | null>(null);

  const [selectionMenu, setSelectionMenu] = useState<null | { x: number; y: number; text: string }>(null);
  const [serverTraceMessages, setServerTraceMessages] = useState<MessageResponse[] | null>(null);
  /** Assistant message id for tree highlight (matches Traceback web app active leaf). */
  const [treeAssistantFocusId, setTreeAssistantFocusId] = useState<string | null>(null);

  const activeTracebackSessionId = useMemo(
    () => chatSessions.find((s) => s.id === activeChatId)?.tracebackSessionId ?? null,
    [chatSessions, activeChatId]
  );

  useEffect(() => {
    setChatSessions((prev) =>
      prev.map((s) =>
        s.id === activeChatId
          ? { ...s, messages: chatMessages, name: deriveChatTitle(chatMessages), updatedAt: Date.now() }
          : s
      )
    );
  }, [chatMessages, activeChatId]);

  useEffect(() => {
    if (tab !== 'tree') return;
    let cancelled = false;
    void (async () => {
      const client = getTracebackClient();
      if (!client || !activeTracebackSessionId) {
        if (!cancelled) setServerTraceMessages(null);
        return;
      }
      try {
        const msgs = await client.fetchSessionMessages(activeTracebackSessionId);
        if (!cancelled) setServerTraceMessages(msgs);
      } catch {
        if (!cancelled) setServerTraceMessages(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [tab, activeTracebackSessionId, chatMessages.length]);

  useEffect(() => {
    if (!serverTraceMessages?.length) return;
    setTreeAssistantFocusId((prev) => {
      if (prev && serverTraceMessages.some((m) => m.id === prev)) return prev;
      const assistants = serverTraceMessages.filter((m) => m.role === 'assistant');
      if (assistants.length === 0) return null;
      return assistants.reduce((a, b) => (a.depth >= b.depth ? a : b)).id;
    });
  }, [serverTraceMessages]);

  useEffect(() => {
    saveChatSessionsState(activeChatId, chatSessions);
  }, [activeChatId, chatSessions]);

  useEffect(() => {
    if (!selectionMenu) return;
    const close = (e: MouseEvent) => {
      if (selectionMenuRef.current?.contains(e.target as Node)) return;
      setSelectionMenu(null);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [selectionMenu]);

  const switchChat = useCallback((id: string) => {
    const s = chatSessions.find((x) => x.id === id);
    if (!s) return;
    setActiveChatId(id);
    setChatMessages(s.messages);
    tbSessionIdRef.current = s.tracebackSessionId ?? null;
    tbParentIdRef.current = s.tracebackParentId ?? null;
    setTreeAssistantFocusId(s.tracebackParentId ?? null);
  }, [chatSessions]);

  const newChatSession = useCallback(() => {
    const s = createEmptySession();
    setChatSessions((prev) => [s, ...prev]);
    setActiveChatId(s.id);
    setChatMessages([]);
    tbSessionIdRef.current = null;
    tbParentIdRef.current = null;
    setTreeAssistantFocusId(null);
    setServerTraceMessages(null);
  }, []);

  const sendChat = useCallback(async () => {
    const trimmed = chatInput.trim();
    if (!trimmed || chatLoading || chatSendingRef.current) return;
    chatSendingRef.current = true;
    setChatInput('');
    setChatLoading(true);
    const userMsg = { role: 'user' as const, content: trimmed };

    const client = getTracebackClient();
    if (client) {
      try {
        let sessionId = tbSessionIdRef.current;
        if (!sessionId) {
          const s = await client.createSession(deriveChatTitle([...chatMessages, userMsg]));
          sessionId = s.id;
          tbSessionIdRef.current = sessionId;
        }
        const parentId = tbParentIdRef.current;
        const result = await client.sendMessage(sessionId, trimmed, parentId);
        tbParentIdRef.current = result.assistantMessage.id;
        const assistantMsg = { role: 'assistant' as const, content: result.assistantMessage.content };
        const nextMsgs = [...chatMessages, userMsg, assistantMsg];
        setChatMessages(nextMsgs);
        const title = deriveChatTitle(nextMsgs);
        setChatSessions((prev) =>
          prev.map((s) =>
            s.id === activeChatId
              ? {
                  ...s,
                  name: title,
                  tracebackSessionId: sessionId,
                  tracebackParentId: result.assistantMessage.id,
                  updatedAt: Date.now()
                }
              : s
          )
        );
        try {
          await client.updateSessionName(sessionId, title);
        } catch {
          /* optional */
        }
        setTreeAssistantFocusId(result.assistantMessage.id);
        try {
          const msgs = await client.fetchSessionMessages(sessionId);
          setServerTraceMessages(msgs);
        } catch {
          /* ignore */
        }
      } catch (e) {
        setChatMessages((prev) => [
          ...prev,
          userMsg,
          {
            role: 'assistant',
            content: e instanceof Error ? e.message : 'Chat request failed.'
          }
        ]);
      } finally {
        chatSendingRef.current = false;
        setChatLoading(false);
      }
      return;
    }

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
          chatSendingRef.current = false;
          setChatLoading(false);
        }
      })();
      return next;
    });
  }, [chatInput, chatLoading, getAssistantContext, activeChatId, chatMessages]);

  const onChatMouseUp = useCallback(() => {
    const sel = window.getSelection();
    const text = sel?.toString().trim() ?? '';
    if (text.length < 2) {
      setSelectionMenu(null);
      return;
    }
    const anchor = sel?.anchorNode;
    if (!anchor) return;
    let el: Node | null = anchor;
    while (el && el !== document.body) {
      if (el instanceof Element && el.getAttribute('data-assistant-msg') === '1') break;
      el = el.parentNode;
    }
    if (!el || el === document.body) {
      setSelectionMenu(null);
      return;
    }
    const range = sel?.rangeCount ? sel.getRangeAt(0) : null;
    if (!range) return;
    const r = range.getBoundingClientRect();
    setSelectionMenu({
      x: Math.min(window.innerWidth - 160, Math.max(80, r.left + r.width / 2)),
      y: Math.max(8, r.top - 4),
      text
    });
  }, []);

  const copyText = useCallback((t: string) => {
    void navigator.clipboard.writeText(t);
    setSelectionMenu(null);
  }, []);

  const handleTraceTreeSelectUser = useCallback(
    (userMessageId: string) => {
      const msgs = serverTraceMessages;
      if (!msgs?.length) return;
      const assistant = msgs.find((m) => m.parentId === userMessageId && m.role === 'assistant');
      setTreeAssistantFocusId(assistant?.id ?? userMessageId);
      setTab('chat');
    },
    [serverTraceMessages]
  );

  const handleTraceTreeDelete = useCallback(
    async (userMessageId: string) => {
      const client = getTracebackClient();
      const sid = activeTracebackSessionId;
      if (!client || !sid) return;
      try {
        await client.deleteSubtree(userMessageId);
        const msgs = await client.fetchSessionMessages(sid);
        setServerTraceMessages(msgs);
        setTreeAssistantFocusId((prev) => {
          if (prev && msgs.some((m) => m.id === prev)) return prev;
          const assistants = msgs.filter((m) => m.role === 'assistant');
          return assistants.length ? assistants.reduce((a, b) => (a.depth >= b.depth ? a : b)).id : null;
        });
      } catch {
        /* ignore */
      }
    },
    [activeTracebackSessionId]
  );

  const zPanel = 90;
  const zCaret = 91;
  const zMenu = 200;

  return (
    <>
      <aside
        aria-hidden={!panelOpen}
        style={{
          position: 'fixed',
          top: 0,
          right: caretWidth,
          width: panelOpen ? panelWidth : 0,
          height: '100vh',
          maxHeight: '100vh',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          background: 'rgba(6, 15, 11, 0.98)',
          borderLeft: panelOpen ? '1px solid rgba(0,229,200,0.14)' : 'none',
          boxShadow: panelOpen ? '-8px 0 32px rgba(0,0,0,0.35)' : 'none',
          zIndex: zPanel,
          pointerEvents: panelOpen ? 'auto' : 'none',
          opacity: panelOpen ? 1 : 0,
          transition: 'width 0.28s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.2s ease, border-color 0.2s ease'
        }}
      >
        <div
          style={{
            width: panelWidth,
            minWidth: panelWidth,
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
          }}
        >
          <div
            style={{
              display: 'flex',
              gap: 4,
              padding: '12px 12px 10px',
              borderBottom: '1px solid rgba(255,255,255,0.06)',
              flexShrink: 0
            }}
          >
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
                {t === 'tree' ? 'trace' : t}
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
                    display: 'flex',
                    gap: 8,
                    alignItems: 'center',
                    flexShrink: 0,
                    flexWrap: 'wrap'
                  }}
                >
                  <label htmlFor="traceback-chat-session" style={{ fontSize: 10, opacity: 0.45, textTransform: 'uppercase' }}>
                    Chat
                  </label>
                  <select
                    id="traceback-chat-session"
                    value={activeChatId}
                    onChange={(e) => switchChat(e.target.value)}
                    style={{
                      flex: 1,
                      minWidth: 120,
                      padding: '6px 8px',
                      borderRadius: 8,
                      border: '1px solid rgba(255,255,255,0.12)',
                      background: 'rgba(0,0,0,0.35)',
                      color: 'rgba(255,255,255,0.88)',
                      fontSize: 12
                    }}
                  >
                    {chatSessions.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={newChatSession}
                    style={{
                      fontSize: 11,
                      padding: '6px 10px',
                      borderRadius: 8,
                      border: '1px solid rgba(0,229,200,0.35)',
                      background: 'rgba(0,229,200,0.08)',
                      color: 'rgba(0,229,200,0.9)',
                      cursor: 'pointer',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    + New
                  </button>
                </div>
                <div
                  ref={chatScrollRef}
                  onMouseUp={onChatMouseUp}
                  style={{
                    flex: 1,
                    overflowY: 'auto',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 8,
                    minHeight: 0,
                    userSelect: 'text'
                  }}
                >
                  {chatMessages.map((m, i) => (
                    <div
                      key={`${i}-${m.role}-${m.content.slice(0, 24)}`}
                      data-assistant-msg={m.role === 'assistant' ? '1' : undefined}
                      onContextMenu={
                        m.role === 'assistant'
                          ? (e) => {
                              e.preventDefault();
                              setSelectionMenu({
                                x: e.clientX,
                                y: e.clientY,
                                text: m.content
                              });
                            }
                          : undefined
                      }
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
                        whiteSpace: m.role === 'user' ? 'pre-wrap' : 'normal'
                      }}
                    >
                      {m.role === 'assistant' ? <ChatMarkdown content={m.content} /> : m.content}
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
              <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, gap: 12 }}>
                {isTracebackApiConfigured() && <TracebackSessionsSection />}
                {isTracebackApiConfigured() && activeTracebackSessionId ? (
                  serverTraceMessages === null ? (
                    <div style={{ fontSize: 12, opacity: 0.45 }}>Loading tree…</div>
                  ) : (
                    <TracebackConversationTree
                      messages={serverTraceMessages}
                      activeMessageId={treeAssistantFocusId}
                      onSelectUserNode={handleTraceTreeSelectUser}
                      onDeleteSubtree={handleTraceTreeDelete}
                    />
                  )
                ) : (
                  <>
                    <div
                      style={{
                        fontSize: 10,
                        opacity: 0.42,
                        letterSpacing: '0.08em',
                        textTransform: 'uppercase',
                        flexShrink: 0
                      }}
                    >
                      This chat (local)
                    </div>
                    <div style={{ flex: 1, overflowY: 'auto', minHeight: 0, paddingRight: 4 }}>
                      <LocalConversationTrace messages={chatMessages} />
                    </div>
                    {!isTracebackApiConfigured() && (
                      <div style={{ fontSize: 11, opacity: 0.4, lineHeight: 1.45, flexShrink: 0 }}>
                        Set <code style={{ fontSize: 10 }}>VITE_TRACEBACK_API_URL</code> (e.g.{' '}
                        <code style={{ fontSize: 10 }}>/traceback-api</code> with Vite proxy) and run the Traceback API on
                        port 4000 for the same branching tree as the standalone app.
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </aside>

      {selectionMenu && (
        <div
          ref={selectionMenuRef}
          role="menu"
          style={{
            position: 'fixed',
            left: selectionMenu.x,
            top: selectionMenu.y,
            transform: 'translate(-50%, -100%)',
            zIndex: zMenu,
            minWidth: 200,
            padding: '10px 0',
            borderRadius: 10,
            border: '1px solid rgba(255,255,255,0.1)',
            background: 'rgba(18, 22, 20, 0.96)',
            backdropFilter: 'blur(12px)',
            boxShadow: '0 12px 40px rgba(0,0,0,0.45)',
            fontSize: 12
          }}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <div style={{ padding: '0 12px 8px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <div style={{ fontSize: 9, opacity: 0.4, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Selected</div>
            <div
              style={{
                marginTop: 4,
                opacity: 0.92,
                maxHeight: 56,
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}
            >
              “{selectionMenu.text.slice(0, 120)}
              {selectionMenu.text.length > 120 ? '…' : ''}”
            </div>
          </div>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setChatInput(`Dig deeper: ${selectionMenu.text}`);
              setTab('chat');
              setSelectionMenu(null);
            }}
            style={{
              display: 'block',
              width: '100%',
              textAlign: 'left',
              padding: '8px 14px',
              border: 'none',
              background: 'transparent',
              color: 'rgba(255,255,255,0.88)',
              cursor: 'pointer',
              fontSize: 12
            }}
          >
            Dig deeper →
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setChatInput(`Explain: ${selectionMenu.text}`);
              setTab('chat');
              setSelectionMenu(null);
            }}
            style={{
              display: 'block',
              width: '100%',
              textAlign: 'left',
              padding: '8px 14px',
              border: 'none',
              background: 'transparent',
              color: 'rgba(255,255,255,0.88)',
              cursor: 'pointer',
              fontSize: 12
            }}
          >
            Ask about this…
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => copyText(selectionMenu.text)}
            style={{
              display: 'flex',
              width: '100%',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '8px 14px',
              border: 'none',
              background: 'transparent',
              color: 'rgba(255,255,255,0.88)',
              cursor: 'pointer',
              fontSize: 12
            }}
          >
            <span>Copy</span>
            <span style={{ opacity: 0.35, fontSize: 10 }}>⌘C</span>
          </button>
        </div>
      )}

      <button
        type="button"
        aria-expanded={panelOpen}
        title="Traceback"
        aria-label={panelOpen ? 'Close Traceback panel' : 'Open Traceback panel'}
        onClick={() => setPanelOpen((o) => !o)}
        style={{
          position: 'fixed',
          right: 0,
          top: 0,
          height: '100vh',
          width: caretWidth,
          zIndex: zCaret,
          padding: 0,
          margin: 0,
          border: 'none',
          borderLeft: '1px solid rgba(0,229,200,0.12)',
          background: panelOpen ? 'rgba(6, 15, 11, 0.55)' : 'rgba(6, 15, 11, 0.25)',
          color: 'rgba(0,229,200,0.85)',
          cursor: 'pointer',
          fontSize: 18,
          fontWeight: 400,
          lineHeight: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxSizing: 'border-box',
          transition: 'background 0.2s ease'
        }}
      >
        <span style={{ pointerEvents: 'none', opacity: 0.95 }}>{panelOpen ? '›' : '‹'}</span>
      </button>
    </>
  );
}
