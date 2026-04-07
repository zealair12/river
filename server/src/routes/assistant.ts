import { Router } from 'express';

export const assistantRouter = Router();

/** Groq uses an OpenAI-compatible chat endpoint. */
const GROQ_CHAT = 'https://api.groq.com/openai/v1/chat/completions';
const OPENAI_CHAT = 'https://api.openai.com/v1/chat/completions';

assistantRouter.post('/assistant/chat', async (req, res) => {
  const groqKey = process.env.GROQ_API_KEY?.trim();
  const openaiKey = process.env.OPENAI_API_KEY?.trim();
  const useGroq = Boolean(groqKey);
  const key = groqKey || openaiKey;

  if (!key) {
    res.status(503).json({
      error: 'No LLM key: set GROQ_API_KEY (e.g. in repo-root .env) or OPENAI_API_KEY.'
    });
    return;
  }

  const body = req.body as {
    messages?: Array<{ role: string; content: string }>;
    context?: Record<string, unknown>;
  };

  const messages = body.messages?.filter((m) => m?.content && (m.role === 'user' || m.role === 'assistant')) ?? [];
  if (messages.length === 0) {
    res.status(400).json({ error: 'At least one user or assistant message is required.' });
    return;
  }

  const contextBlock = JSON.stringify(body.context ?? {}, null, 2);
  const system = `You are Trace-back, embedded in River (financial transparency). Help the user learn and understand.

Style:
- Be brief and clear: short paragraphs, not essays. Enough detail to understand the idea—expand only if the user asks to go deeper.
- Use GitHub-flavored Markdown: **bold** for emphasis, \`code\` for tickers/symbols, bullet lists for facts, ### for small section titles when helpful.
- Inline math: use \\( ... \\) or \\[ ... \\] for LaTeX when formulas help; plain Unicode symbols are fine for simple expressions.
- Emojis sparingly (only when they add clarity).

Ground truth:
- For numbers, prices, company facts, or anything on-screen: use CONTEXT JSON below exactly. Do not invent quotes or live data.
- You may use general knowledge for concepts (what an IPO is, how volatility works) when not contradicting CONTEXT.
- If CONTEXT lacks a ticker-specific fact, say so and suggest viewing that company in River.

CONTEXT (may be partial):
${contextBlock}`;

  const model = useGroq
    ? (process.env.GROQ_MODEL?.trim() || 'llama-3.3-70b-versatile')
    : (process.env.OPENAI_MODEL?.trim() || 'gpt-4o-mini');

  const url = useGroq ? GROQ_CHAT : OPENAI_CHAT;

  const abortController = new AbortController();
  const timeoutMs = 60_000;
  const timeoutId = setTimeout(() => abortController.abort(), timeoutMs);

  try {
    const r = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${key}`
      },
      body: JSON.stringify({
        model,
        temperature: 0.28,
        max_tokens: 560,
        messages: [{ role: 'system', content: system }, ...messages.map((m) => ({ role: m.role, content: m.content }))]
      }),
      signal: abortController.signal
    });
    clearTimeout(timeoutId);

    if (!r.ok) {
      const errText = await r.text();
      console.error('LLM error:', r.status, errText);
      res.status(502).json({ error: 'Assistant request failed.' });
      return;
    }

    const data = (await r.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const text = data.choices?.[0]?.message?.content?.trim();
    if (!text) {
      res.status(502).json({ error: 'Empty assistant response.' });
      return;
    }
    res.json({ reply: text });
  } catch (e) {
    clearTimeout(timeoutId);
    const aborted = e instanceof Error && e.name === 'AbortError';
    console.error('Assistant chat failed:', e);
    res.status(500).json({
      error: aborted
        ? 'Assistant request timed out.'
        : 'Assistant unavailable. Check server logs and GROQ_API_KEY / OPENAI_API_KEY.'
    });
  }
});
