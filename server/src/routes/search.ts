import { Router } from 'express';
import { z } from 'zod';
import { runQuery } from '../db/neo4j.js';

export const searchRouter = Router();

const bodySchema = z.object({ query: z.string(), filters: z.any().optional() });

searchRouter.post('/search', async (req, res) => {
  const { query } = bodySchema.parse(req.body);
  const result = await runQuery(
    `CALL db.index.fulltext.queryNodes("entityNameIndex", $query) YIELD node, score
     RETURN node, size((node)--()) as connections
     ORDER BY score DESC LIMIT 20`,
    { query }
  );
  const entities = result.records.map((r) => ({ ...r.get('node').properties, connections: Number(r.get('connections')) }));
  res.json({ entities, totalCount: entities.length });
});
