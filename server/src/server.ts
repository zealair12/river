import 'dotenv/config';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import http from 'http';
import { initNeo4j } from './db/neo4j.js';
import { initPostgres } from './db/postgres.js';
import { searchRouter } from './routes/search.js';
import { graphRouter } from './routes/graph.js';
import { entityRouter } from './routes/entity.js';
import { setupWebsocket } from './routes/websocket.js';

const app = express();
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use('/api', searchRouter);
app.use('/api', graphRouter);
app.use('/api', entityRouter);

const server = http.createServer(app);
setupWebsocket(server);

await initNeo4j();
await initPostgres();
server.listen(Number(process.env.PORT ?? 3001), () => console.log('server started'));
