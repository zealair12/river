const KEY = 'river-traceback-chat-sessions-v1';

export type ChatMessageRow = { role: 'user' | 'assistant'; content: string };

export type ChatSessionStored = {
  id: string;
  name: string;
  messages: ChatMessageRow[];
  updatedAt: number;
  tracebackSessionId?: string | null;
  tracebackParentId?: string | null;
};

export function loadChatSessionsState(): { activeId: string | null; sessions: ChatSessionStored[] } {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { activeId: null, sessions: [] };
    const p = JSON.parse(raw) as { activeId?: string | null; sessions?: ChatSessionStored[] };
    const sessions = Array.isArray(p.sessions) ? p.sessions : [];
    return { activeId: p.activeId ?? null, sessions };
  } catch {
    return { activeId: null, sessions: [] };
  }
}

export function saveChatSessionsState(activeId: string | null, sessions: ChatSessionStored[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ activeId, sessions }));
  } catch {
    /* ignore */
  }
}

export function createEmptySession(name?: string): ChatSessionStored {
  return {
    id: crypto.randomUUID(),
    name: name?.trim() || `Chat ${new Date().toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`,
    messages: [],
    updatedAt: Date.now(),
    tracebackSessionId: null,
    tracebackParentId: null
  };
}

/** Short title from first user message (and refined as the thread grows). */
export function deriveChatTitle(messages: ChatMessageRow[]): string {
  const firstUser = messages.find((m) => m.role === 'user');
  if (!firstUser?.content?.trim()) return 'New chat';
  let t = firstUser.content.trim().replace(/\s+/g, ' ');
  if (t.length > 56) t = `${t.slice(0, 54)}…`;
  return t;
}
