import { runQuery } from '../db/neo4j.js';

let warnedMissingFecKey = false;

export interface IngestedEntity {
  id: string;
  name: string;
  type: string;
  source: string;
  connections: number;
  [key: string]: unknown;
}

interface IngestedRelationship {
  fromId: string;
  toId: string;
  relationType: 'RELATED_TO' | 'DONATED_TO';
  source: string;
  kind: string;
  key: string;
  weight: number;
  amount?: number;
  currency?: string;
  date?: string;
}

async function upsertEntities(entities: IngestedEntity[]): Promise<void> {
  for (const e of entities) {
    await runQuery(
      `MERGE (n:Entity {id: $id})
       ON CREATE SET n.name = $name, n.type = $type, n.source = $source, n.createdAt = datetime()
       ON MATCH SET n.name = $name
       SET n.updatedAt = datetime()`,
      { id: e.id, name: e.name, type: e.type, source: e.source }
    );
  }
}

async function upsertRelationships(relationships: IngestedRelationship[]): Promise<void> {
  for (const rel of relationships) {
    if (rel.relationType === 'DONATED_TO') {
      await runQuery(
        `MATCH (a:Entity {id: $fromId}), (b:Entity {id: $toId})
         MERGE (a)-[r:DONATED_TO {key: $key}]->(b)
         ON CREATE SET r.source = $source, r.kind = $kind, r.createdAt = datetime()
         SET r.weight = $weight,
             r.amount = $amount,
             r.currency = $currency,
             r.date = $date,
             r.updatedAt = datetime()`,
        { ...rel }
      );
      continue;
    }
    await runQuery(
      `MATCH (a:Entity {id: $fromId}), (b:Entity {id: $toId})
       MERGE (a)-[r:RELATED_TO {key: $key}]->(b)
       ON CREATE SET r.source = $source, r.kind = $kind, r.createdAt = datetime()
       SET r.weight = $weight, r.updatedAt = datetime()`,
      { ...rel }
    );
  }
}

function buildSearchClusterData(query: string, entities: IngestedEntity[]) {
  const querySlug = query.toLowerCase().trim().replace(/\W+/g, '-');
  const clusterId = `searchcluster:${querySlug || 'unknown'}`;
  const clusterNode: IngestedEntity = {
    id: clusterId,
    name: `Search Cluster: ${query}`,
    type: 'search_cluster',
    source: 'river',
    connections: 0
  };
  const relationships: IngestedRelationship[] = entities.map((entity) => ({
    fromId: entity.id,
    toId: clusterId,
    relationType: 'RELATED_TO',
    source: 'river',
    kind: 'search_cooccurrence',
    key: `${entity.id}->${clusterId}`,
    weight: 1
  }));
  return { clusterNode, relationships };
}

export async function ensureSearchClusterLinks(query: string, entities: IngestedEntity[]): Promise<void> {
  const valid = entities.filter((e) => e.id && e.name);
  if (valid.length === 0) return;
  const { clusterNode, relationships } = buildSearchClusterData(query, valid);
  await upsertEntities([...valid, clusterNode]);
  await upsertRelationships(relationships);
}

function slug(input: string): string {
  return input.toLowerCase().trim().replace(/\W+/g, '-').replace(/^-+|-+$/g, '') || 'unknown';
}

function inferEntityTypeFromName(name: string): string {
  const n = name.toLowerCase();
  if (n.includes('committee') || n.includes('pac') || n.includes('campaign')) return 'pac';
  if (n.includes('inc') || n.includes('llc') || n.includes('corp') || n.includes('company')) return 'company';
  return 'person';
}

function getFecTwoYearPeriod(): string {
  const fromEnv = process.env.FEC_TWO_YEAR_TRANSACTION_PERIOD?.trim();
  if (fromEnv) return fromEnv;
  // Default to most recently completed election cycle for stability.
  return '2024';
}

export async function ingestFecMoneyFlows(query: string): Promise<void> {
  const apiKey = process.env.FEC_API_KEY?.trim();
  if (!apiKey) {
    if (!warnedMissingFecKey) {
      console.warn('FEC_API_KEY is not set. Skipping money-flow ingestion.');
      warnedMissingFecKey = true;
    }
    return;
  }

  const params = new URLSearchParams({
    api_key: apiKey,
    contributor_name: query,
    per_page: '10',
    sort: '-contribution_receipt_amount',
    two_year_transaction_period: getFecTwoYearPeriod()
  });
  const url = `https://api.open.fec.gov/v1/schedules/schedule_a/?${params.toString()}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(12000) });
  if (!res.ok) {
    console.warn('FEC fetch failed:', res.status);
    return;
  }

  const data = (await res.json()) as {
    results?: Array<{
      contributor_name?: string;
      donor_committee_name?: string;
      committee_name?: string;
      committee_id?: string;
      contributor_id?: string;
      contributor?: { name?: string; committee_id?: string };
      committee?: { name?: string; committee_id?: string };
      contribution_receipt_amount?: number;
      contribution_receipt_date?: string;
    }>;
  };

  const entities = new Map<string, IngestedEntity>();
  const rels = new Map<string, IngestedRelationship>();

  for (const row of data.results ?? []) {
    const contributorName =
      row.contributor_name?.trim() ||
      row.donor_committee_name?.trim() ||
      row.contributor?.name?.trim() ||
      '';
    const committeeName = row.committee_name?.trim() || row.committee?.name?.trim() || '';
    const amount = Number(row.contribution_receipt_amount ?? 0);
    const date = row.contribution_receipt_date?.slice(0, 10) ?? '';
    if (!contributorName || !committeeName || !(amount > 0)) continue;

    const donorId = row.contributor_id?.trim()
      ? `fec:committee:${row.contributor_id.trim()}`
      : row.contributor?.committee_id?.trim()
        ? `fec:committee:${row.contributor.committee_id.trim()}`
        : `fec:donor:${slug(contributorName)}`;
    const committeeId = row.committee_id?.trim() || row.committee?.committee_id?.trim()
      ? `fec:committee:${(row.committee_id?.trim() || row.committee?.committee_id?.trim()) as string}`
      : `fec:committee:${slug(committeeName)}`;

    entities.set(donorId, {
      id: donorId,
      name: contributorName,
      type: donorId.startsWith('fec:committee:') ? 'pac' : inferEntityTypeFromName(contributorName),
      source: 'fec',
      connections: 0
    });
    entities.set(committeeId, {
      id: committeeId,
      name: committeeName,
      type: 'pac',
      source: 'fec',
      connections: 0
    });

    const key = `${donorId}->${committeeId}:${date}:${amount}`;
    rels.set(key, {
      fromId: donorId,
      toId: committeeId,
      relationType: 'DONATED_TO',
      source: 'fec',
      kind: 'campaign_contribution',
      key,
      weight: 1,
      amount,
      currency: 'USD',
      date
    });
  }

  if (entities.size === 0 || rels.size === 0) return;
  await upsertEntities([...entities.values()]);
  await upsertRelationships([...rels.values()]);
}

async function fetchSec(query: string): Promise<IngestedEntity[]> {
  const url = `https://efts.sec.gov/LATEST/search?q=${encodeURIComponent(query)}&forms=10-K,10-Q`;
  const res = await fetch(url, {
    headers: { 'User-Agent': 'River/1.0 (dev@river.local)' },
    signal: AbortSignal.timeout(8000)
  });
  if (!res.ok) return [];

  const data = (await res.json()) as {
    hits?: { hits?: Array<{ _source?: { entity_name?: string; file_num?: string } }> };
  };

  const seen = new Map<string, IngestedEntity>();
  for (const hit of data.hits?.hits ?? []) {
    const s = hit._source ?? {};
    const name = s.entity_name;
    if (!name || seen.has(name.toUpperCase())) continue;

    const fileNum = (s.file_num ?? '').replace(/-/g, '');
    seen.set(name.toUpperCase(), {
      id: `sec:${fileNum || name.toLowerCase().replace(/\W+/g, '-')}`,
      name,
      type: 'company',
      source: 'sec_edgar',
      connections: 0,
      cik: fileNum
    });
  }

  return [...seen.values()].slice(0, 10);
}

async function fetchPropublica(query: string): Promise<IngestedEntity[]> {
  const url = `https://projects.propublica.org/nonprofits/api/v2/search.json?q=${encodeURIComponent(query)}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
  if (!res.ok) return [];

  const data = (await res.json()) as {
    organizations?: Array<{ ein?: number; name?: string; city?: string; state?: string }>;
  };

  return (data.organizations ?? [])
    .filter((org) => org.name)
    .slice(0, 10)
    .map((org) => ({
      id: `propublica:${org.ein ?? org.name!.toLowerCase().replace(/\W+/g, '-')}`,
      name: org.name!,
      type: 'nonprofit',
      source: 'propublica',
      connections: 0,
      ein: String(org.ein ?? ''),
      city: org.city ?? '',
      state: org.state ?? ''
    }));
}

export async function fetchAndIngestEntities(query: string): Promise<IngestedEntity[]> {
  const results = await Promise.allSettled([fetchSec(query), fetchPropublica(query)]);

  const entities: IngestedEntity[] = [];
  for (const r of results) {
    if (r.status === 'fulfilled') entities.push(...r.value);
    else console.warn('Fetcher failed:', r.reason);
  }

  const { clusterNode, relationships } = buildSearchClusterData(query, entities);

  try {
    await upsertEntities([...entities, clusterNode]);
    await upsertRelationships(relationships);
  } catch (err) {
    console.warn('Neo4j upsert failed (returning fetched results anyway):', (err as Error).message);
  }

  return entities;
}
