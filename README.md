# river

Inspired by Ulle Dag Charles.

## Traceback (branching chat) inside River

The sliding **Traceback** panel uses the same HTTP API as the standalone Traceback app (`sessions`, `/message/send`, Groq on the Traceback server — not River’s `/api/assistant/chat`).

1. Run the Traceback API from the **traceback** repo: `cd server && npm run dev` (default port **4000**).
2. In this repo, copy `.env.example` → `.env` and set `VITE_TRACEBACK_API_URL=/traceback-api` (the Vite dev server proxies that to `http://localhost:4000`).
3. Start River’s client; open the Traceback panel → **trace** tab for the React Flow conversation tree.

Shared types and `createTracebackClient` live in `packages/traceback-shared` (vendored here; source of truth in the [traceback](https://github.com/zealair12/traceback) repo).

## Environment

Never commit `.env`. Use `.env.example` as a template. Optional keys (FEC, Finnhub, NewsAPI, Groq on River’s assistant route, etc.) are only needed for those features.
