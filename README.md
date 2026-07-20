# river
Building Stock Monitoring System. Scaling to asset tracer(perhaps to include blockchain technology). Embedding Traceback, to allow user learn more about stocks from LLM connected to relevant data, and interface to trace research history as tree - branching to allow for removal of context pollution 

---

## Architecture

River is built as three layers stacked on top of a shared data core. Each layer is independent enough to build and test on its own, but they compose into one product.

```
                    +------------------------------+
                    |            CLIENT            |
                    | React + Vite (browser app)   |
                    | - Stock dashboard and charts |
                    | - Entity graph (React Flow)  |
                    | - Traceback branching panel  |
                    +------------------------------+
                                    |  HTTP / WebSocket
                                    v
                    +-----------------------------+
                    |           SERVER            |
                    | Express API (read + serve)  |
                    | /market   /search   /entity |
                    | /graph    /assistant   /ws  |
                    +-----------------------------+
               +-------------------+----------------+
               v                                    v
  +------------------------+            +----------------------+
  |         WORKER         |            |    TRACEBACK API     |
  | BullMQ background jobs |            | (separate service)   |
  | - fetch external data  |            | sessions + branching |
  | - expand relationships |            | message tree         |
  +------------------------+            +----------------------+
               |
               v
  +------------------------+
  |      DATA STORES       |
  | Neo4j (entity graph)   |
  | Postgres (records)     |
  | Redis (queues + cache) |
  +------------------------+
```

### Layer 1: Data ingestion (the Worker)

Background jobs pull from public data sources and normalize everything into a single entity-and-relationship shape. This runs separately from the API so slow external calls never block the user.

- Runtime: BullMQ jobs on Redis, in `worker/src/queues`.
- Fetchers live in `worker/src/fetchers`, one file per source.
- Output: entities (company, person, PAC, wallet) and edges (DONATED_TO, OWNS, TRANSACTED_WITH, CONTROLS, LOBBIED) written to Neo4j.

### Layer 2: The entity graph (the money-flow core)

This is the differentiator. Every ingested fact becomes a node or an edge in a Neo4j graph, so "follow the money" becomes a graph traversal instead of a join across tables.

- Schema notes: `server/src/db/schema.cypher`.
- Read path: `server/src/routes/graph.ts` returns nodes and edges up to a depth for any entity id.
- The rule to keep: every edge should carry a `source` so any relationship can be traced back to the filing or transaction that proves it.

### Layer 3: Intelligence and Traceback

Two parts sit on top of the graph.

- Assistant: `server/src/routes/assistant.ts` proxies chat to an LLM (Groq or OpenAI) and grounds answers in on-screen context. Keep it grounded in the graph and market data, not free invention.
- Traceback: research history stored as a branching tree rather than a flat log. Each message is a node with a `parentId`, so a user can branch off to explore a tangent and prune it later to remove context pollution. The client talks to a separate Traceback API through the shared client in `packages/traceback-shared`.

## Monorepo layout

Managed as npm workspaces. Each folder is its own package.

| Path | Role | Key tech |
| --- | --- | --- |
| `client` | Browser app | React 19, Vite, Tailwind, React Query, Zustand, React Flow (`@xyflow/react`), Cytoscape, Framer Motion |
| `server` | Read API and LLM proxy | Express, neo4j-driver, pg, redis, ws, zod, helmet |
| `worker` | Background ingestion | BullMQ, ioredis, neo4j-driver, pg |
| `packages/traceback-shared` | Typed client for the Traceback branching API | axios |
| `shared` | Cross-cutting types | TypeScript |

## Data stores

| Store | Holds | Why |
| --- | --- | --- |
| Neo4j | Entities and their relationships | Graph traversal is the core query pattern for money flow |
| Postgres | Structured records and app state | Relational data that does not need graph traversal |
| Redis | Job queues and cache | BullMQ backend and fast lookups |

Start all three locally with `docker-compose up`. Then create a `.env` file in the repo root before running.

## Environment variables

Create `.env` in the repo root. Do not commit real keys.

```
# River API (market, assistant proxy, etc.)
PORT=3001

# Traceback branching API (Vite dev proxy maps /traceback-api to http://localhost:4000)
VITE_TRACEBACK_API_URL=/traceback-api

# Optional: open the full Traceback web UI from the panel link
# VITE_TRACEBACK_APP_URL=http://localhost:5173

# Third-party, only if you use those features
# FEC_API_KEY=
# FINNHUB_API_KEY=
# NEWSAPI_KEY=
# GROQ_API_KEY=
# OPENAI_API_KEY=
```

## Data sources

Public sources the worker pulls from. Fetcher files are in `worker/src/fetchers`.

Traditional finance and public records:
- SEC EDGAR full-text search: https://efts.sec.gov/LATEST/search-index.html and https://www.sec.gov/edgar/sec-api-documentation
- FEC campaign finance API: https://api.open.fec.gov/developers/
- OpenSecrets (money in politics): https://www.opensecrets.org/open-data/api
- ProPublica Nonprofit Explorer API: https://projects.propublica.org/nonprofits/api

On-chain (the asset-tracer direction):
- Etherscan API: https://docs.etherscan.io/
- Covalent unified API: https://www.covalenthq.com/docs/api/
- Alchemy (RPC, webhooks): https://docs.alchemy.com/
- The Graph (indexed subgraphs): https://thegraph.com/docs/

## Suggested build order

Build the spine first, then widen the data, then add intelligence.

1. Stand up infra: `docker-compose up`, confirm Neo4j, Postgres, and Redis are reachable, wire `.env`.
2. Stock monitoring MVP: `/market` and `/search` routes, dashboard and charts in the client. This proves the end-to-end path with no graph yet.
3. Entity graph read path: seed a few entities by hand in Neo4j, get `/graph/:entityId` rendering in React Flow.
4. Ingestion: turn on one fetcher at a time (start with FEC or SEC), verify nodes and edges land in Neo4j with a `source` on every edge.
5. Assistant grounding: connect `/assistant/chat`, feed it the current entity and market context, keep answers tied to real data.
6. Traceback tree: stand up the Traceback API, wire `packages/traceback-shared`, then branching and subtree deletion in the panel.
7. Blockchain expansion: add the on-chain fetchers (Etherscan, then Covalent or Alchemy) and introduce TRANSACTED_WITH edges to link wallets to entities.

## Useful resources and papers

Graph and relationship intelligence:
- Neo4j graph modeling guide: https://neo4j.com/developer/data-modeling/
- Cypher query language manual: https://neo4j.com/docs/cypher-manual/current/
- Prior art to study for the money-flow graph: Sayari Graph (https://sayari.com/platform/graph/) and Arkham on-chain entity labeling (https://arkm.com/api)

Branching conversations and context management (the Traceback thesis):
- Conversation Tree Architecture, a framework for context-isolated multi-branch LLM conversations: https://arxiv.org/abs/2603.21278
- Context Branching for LLM Conversations, a version-control approach that treats checkpoints as immutable snapshots: https://arxiv.org/abs/2512.13914

Grounded LLM assistants:
- Groq API (OpenAI-compatible chat used by the assistant): https://console.groq.com/docs
- Retrieval-Augmented Generation, the original grounding paper: https://arxiv.org/abs/2005.11401

Infrastructure:
- BullMQ (job queues on Redis): https://docs.bullmq.io/
- React Flow (`@xyflow/react`) for the graph UI: https://reactflow.dev/learn
