import neo4j from 'neo4j-driver';

const driver = neo4j.driver(process.env.NEO4J_URI ?? 'bolt://localhost:7687', neo4j.auth.basic(process.env.NEO4J_USER ?? 'neo4j', process.env.NEO4J_PASSWORD ?? 'password'));

export async function runQuery(cypher: string, params: Record<string, unknown> = {}) {
  const session = driver.session();
  try {
    return await session.run(cypher, params);
  } finally {
    await session.close();
  }
}

export async function initNeo4j() {
  await runQuery('CREATE CONSTRAINT entity_id IF NOT EXISTS FOR (e:Entity) REQUIRE e.id IS UNIQUE');
  await runQuery('CREATE FULLTEXT INDEX entityNameIndex IF NOT EXISTS FOR (e:Entity) ON EACH [e.name]');
  await runQuery('CREATE INDEX entity_type IF NOT EXISTS FOR (e:Entity) ON (e.type)');
  await runQuery('CREATE INDEX rel_date IF NOT EXISTS FOR ()-[r:TRANSACTED_WITH]-() ON (r.date)');
}
