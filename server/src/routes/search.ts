import { Router } from 'express';
import { z } from 'zod';
import { runQuery } from '../db/neo4j.js';
import { ensureSearchClusterLinks, fetchAndIngestEntities, ingestFecMoneyFlows } from '../services/entityIngest.js';

export const searchRouter = Router();

const bodySchema = z.object({ query: z.string(), filters: z.any().optional() });

function escapeLucene(s: string): string {
  return s.replace(/[+\-&|!(){}[\]^"~*?:\\/]/g, '\\$&');
}

searchRouter.post('/search', async (req, res) => {
  try {
    const parsed = bodySchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid request body. Expected { query: string }.' });
      return;
    }

    const query = parsed.data.query.trim();
    if (!query) {
      res.status(400).json({ error: 'Query cannot be empty.' });
      return;
    }

    void ingestFecMoneyFlows(query).catch((err) => {
      console.warn('FEC ingestion failed:', (err as Error).message);
    });

    const escaped = escapeLucene(query);
    const result = await runQuery(
      `CALL db.index.fulltext.queryNodes("entityNameIndex", $query) YIELD node, score
       WHERE coalesce(node.type, '') <> 'search_cluster'
       RETURN node, COUNT { (node)--() } AS connections
       ORDER BY connections DESC, score DESC LIMIT 30`,
      { query: escaped }
    );

    if (result.records.length > 0) {
      const entities = result.records.map((r) => ({
        ...r.get('node').properties,
        connections: Number(r.get('connections'))
      }));
      try {
        await ensureSearchClusterLinks(query, entities);
      } catch (err) {
        console.warn('Failed to ensure cluster links for cached entities:', (err as Error).message);
      }
      res.json({ entities, totalCount: entities.length });
      return;
    }

    const ingested = await fetchAndIngestEntities(query);

    const after = await runQuery(
      `CALL db.index.fulltext.queryNodes("entityNameIndex", $query) YIELD node, score
       WHERE coalesce(node.type, '') <> 'search_cluster'
       RETURN node, COUNT { (node)--() } AS connections
       ORDER BY connections DESC, score DESC LIMIT 30`,
      { query: escaped }
    );
    if (after.records.length > 0) {
      const entities = after.records.map((r) => ({
        ...r.get('node').properties,
        connections: Number(r.get('connections'))
      }));
      res.json({ entities, totalCount: entities.length });
      return;
    }

    res.json({ entities: ingested, totalCount: ingested.length });
  } catch (error) {
    console.error('Search failed:', error);
    res.status(500).json({
      error: 'Search failed. Verify Neo4j is running and entityNameIndex exists.'
    });
  }
});
