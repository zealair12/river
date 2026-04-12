import type { ChatMessageRow } from './chatSessionsStorage';

function excerpt(s: string, max = 120): string {
  const t = s.trim().replace(/\s+/g, ' ');
  return t.length <= max ? t : `${t.slice(0, max - 1)}…`;
}

/** Visual map of this chat’s turns (what you asked vs what came back). */
export function LocalConversationTrace({ messages }: { messages: ChatMessageRow[] }) {
  const pairs: { q: string; a?: string }[] = [];
  for (let i = 0; i < messages.length; i++) {
    const m = messages[i];
    if (m.role === 'user') {
      const next = messages[i + 1];
      pairs.push({ q: m.content, a: next?.role === 'assistant' ? next.content : undefined });
      if (next?.role === 'assistant') i++;
    } else if (m.role === 'assistant' && (i === 0 || messages[i - 1].role !== 'user')) {
      pairs.push({ q: '(follow-up)', a: m.content });
    }
  }

  if (pairs.length === 0) {
    return (
      <div style={{ fontSize: 12, opacity: 0.38, padding: '12px 4px' }}>
        Send a message in Chat — this view maps each question and reply.
      </div>
    );
  }

  return (
    <div style={{ position: 'relative', paddingLeft: 12 }}>
      <div
        aria-hidden
        style={{
          position: 'absolute',
          left: 4,
          top: 10,
          bottom: 10,
          borderLeft: '1px dashed rgba(0,229,200,0.35)'
        }}
      />
      {pairs.map((p, idx) => (
        <div key={idx} style={{ position: 'relative', paddingLeft: 16, marginBottom: 14 }}>
          <div
            aria-hidden
            style={{
              position: 'absolute',
              left: -1,
              top: 10,
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: 'rgba(0,229,200,0.55)',
              border: '1px solid rgba(0,229,200,0.5)'
            }}
          />
          <div
            style={{
              borderRadius: 10,
              padding: '10px 12px',
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)'
            }}
          >
            <div style={{ fontSize: 9, opacity: 0.4, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6 }}>
              You
            </div>
            <div style={{ fontSize: 12, lineHeight: 1.4, color: 'rgba(255,255,255,0.88)' }}>{excerpt(p.q, 200)}</div>
            {p.a != null && (
              <>
                <div
                  style={{
                    fontSize: 9,
                    opacity: 0.4,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    marginTop: 10,
                    marginBottom: 6
                  }}
                >
                  Assistant
                </div>
                <div style={{ fontSize: 11, lineHeight: 1.45, opacity: 0.82 }}>{excerpt(p.a, 280)}</div>
              </>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
