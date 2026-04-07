import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import cors from 'cors';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
/** Traceback repo root (`GROQ_API_KEY`, etc.), then `river/.env`, then `river/server/.env` (later wins). */
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../.env'), override: true });
dotenv.config({ path: path.resolve(__dirname, '../.env'), override: true });
import express from 'express';
import helmet from 'helmet';
import http from 'http';
import { initNeo4j } from './db/neo4j.js';
import { initPostgres } from './db/postgres.js';
import { searchRouter } from './routes/search.js';
import { graphRouter } from './routes/graph.js';
import { entityRouter } from './routes/entity.js';
import { marketRouter } from './routes/market.js';
import { assistantRouter } from './routes/assistant.js';
import { setupWebsocket } from './routes/websocket.js';

const app = express();
app.use(helmet());
app.use(cors());
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api', searchRouter);
app.use('/api', graphRouter);
app.use('/api', entityRouter);
app.use('/api', marketRouter);
app.use('/api', assistantRouter);

const server = http.createServer(app);
setupWebsocket(server);

const port = Number(process.env.PORT ?? 3001);

try {
  await initNeo4j();
  console.log('Neo4j connected and indexes created.');
} catch (err) {
  console.warn('Neo4j unavailable — server will start but graph queries will fail.', (err as Error).message);
}

try {
  await initPostgres();
  console.log('Postgres connected and tables created.');
} catch (err) {
  console.warn('Postgres unavailable — server will start but Postgres queries will fail.', (err as Error).message);
}

server.listen(port, () => console.log(`River server listening on http://localhost:${port}`));
