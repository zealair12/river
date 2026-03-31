import { Router } from 'express';
import { runQuery } from '../db/neo4j.js';

export const graphRouter = Router();

graphRouter.get('/graph/:entityId', async (req, res) => {
  const depth = Math.max(1, Math.min(3, Number(req.query.depth ?? 2)));
  const limit = Math.min(200, Number(req.query.limit ?? 200));
  const result = await runQuery(
    `MATCH p=(n:Entity {id:$id})-[r*1..${depth}]-(m:Entity)
     RETURN p LIMIT $limit`,
    { id: req.params.entityId, limit }
  );
  const nodes = new Map<string, any>();
  const edges: any[] = [];
  result.records.forEach((record) => {
    const path = record.get('p');
    path.segments.forEach((s: any) => {
      nodes.set(s.start.properties.id, { ...s.start.properties, connections: 0 });
      nodes.set(s.end.properties.id, { ...s.end.properties, connections: 0 });
      edges.push({ id: s.relationship.identity.toString(), fromId: s.start.properties.id, toId: s.end.properties.id, type: s.relationship.type, ...s.relationship.properties });
    });
  });
  res.json({ nodes: [...nodes.values()], edges });
});
