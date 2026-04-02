import { Router } from 'express';

export const assistantRouter = Router();

assistantRouter.post('/assistant/chat', async (req, res) => {
  const key = process.env.OPENAI_API_KEY?.trim();
  if (!key) {
    res.status(503).json({ error: 'OPENAI_API_KEY is not configured on the server.' });
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
  const system = `You are Trace-back, a research assistant embedded in the River financial transparency app.

Rules:
- Answer ONLY using the CONTEXT JSON below (quotes, profile, news headlines, notes, page path). Do not invent tickers, prices, or news.
- If the user asks for something not present in CONTEXT, say clearly that you do not have that data in this session.
- Be concise. Use bullet points when listing facts from news.
- Never claim real-time market data beyond what appears in CONTEXT.

CONTEXT:
${contextBlock}`;

  const model = process.env.OPENAI_MODEL?.trim() || 'gpt-4o-mini';

  try {
    const r = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${key}`
      },
      body: JSON.stringify({
        model,
        temperature: 0.25,
        max_tokens: 900,
        messages: [{ role: 'system', content: system }, ...messages.map((m) => ({ role: m.role, content: m.content }))]
      }),
      signal: AbortSignal.timeout(60000)
    });

    if (!r.ok) {
      const errText = await r.text();
      console.error('OpenAI error:', r.status, errText);
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
    console.error('Assistant chat failed:', e);
    res.status(500).json({ error: 'Assistant unavailable.' });
  }
});
