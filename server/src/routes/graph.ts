import { Router } from 'express';
import { runQuery } from '../db/neo4j.js';

export const graphRouter = Router();

graphRouter.get('/graph/:entityId', async (req, res) => {
  try {
    const depth = Math.max(1, Math.min(3, Math.trunc(Number(req.query.depth ?? 2))));
    const limit = Math.max(1, Math.min(200, Math.trunc(Number(req.query.limit ?? 200))));
    const result = await runQuery(
      `MATCH p=(n:Entity {id:$id})-[r*1..${depth}]-(m:Entity)
       RETURN p LIMIT toInteger($limit)`,
      { id: req.params.entityId, limit }
    );
    const nodes = new Map<string, any>();
    const edges = new Map<string, any>();
    result.records.forEach((record) => {
      const path = record.get('p');
      path.segments.forEach((s: any) => {
        nodes.set(s.start.properties.id, { ...s.start.properties, connections: 0 });
        nodes.set(s.end.properties.id, { ...s.end.properties, connections: 0 });
        const edgeId = s.relationship.identity.toString();
        edges.set(edgeId, {
          id: edgeId,
          fromId: s.start.properties.id,
          toId: s.end.properties.id,
          type: s.relationship.type,
          ...s.relationship.properties
        });
      });
    });
    res.json({ nodes: [...nodes.values()], edges: [...edges.values()] });
  } catch (error) {
    console.error('Graph query failed:', error);
    res.status(503).json({ error: 'Graph database unavailable.' });
  }
});
