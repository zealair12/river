import { Router } from 'express';
import { runQuery } from '../db/neo4j.js';

export const entityRouter = Router();

entityRouter.get('/entity/:id', async (req, res) => {
  try {
    const r = await runQuery('MATCH (e:Entity {id:$id}) RETURN e', { id: req.params.id });
    res.json(r.records[0]?.get('e')?.properties ?? null);
  } catch (error) {
    console.error('Entity lookup failed:', error);
    res.status(503).json({ error: 'Graph database unavailable.' });
  }
});

entityRouter.get('/entity/:id/timeline', async (req, res) => {
  try {
    const r = await runQuery(
      'MATCH (e:Entity {id:$id})-[rel]-(o:Entity) RETURN rel, o ORDER BY rel.date DESC',
      { id: req.params.id }
    );
    res.json(r.records.map((x) => ({ rel: x.get('rel').properties, other: x.get('o').properties })));
  } catch (error) {
    console.error('Entity timeline failed:', error);
    res.status(503).json({ error: 'Graph database unavailable.' });
  }
});

entityRouter.get('/entity/:id/flow', async (req, res) => {
  try {
    const r = await runQuery(
      'MATCH (e:Entity {id:$id})-[r:TRANSACTED_WITH*1..4]->(m) RETURN e,m,reduce(total=0, rel in r | total + coalesce(rel.amount,0)) as total ORDER BY total DESC LIMIT 1',
      { id: req.params.id }
    );
    res.json(
      r.records[0]
        ? { totalAmount: r.records[0].get('total').toNumber?.() ?? r.records[0].get('total'), currency: 'USD', path: [] }
        : { totalAmount: 0, currency: 'USD', path: [] }
    );
  } catch (error) {
    console.error('Entity flow failed:', error);
    res.status(503).json({ error: 'Graph database unavailable.' });
  }
});
