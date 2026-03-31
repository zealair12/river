import type { Entity, Relationship } from '../../../shared/types.js';
import { axios, saveRaw, withBackoff } from './_utils.js';
export interface SecResult { entities: Entity[]; relationships: Relationship[] }

export async function searchCompany(name: string) { const u = `https://efts.sec.gov/LATEST/search-index?q=${encodeURIComponent(name)}&dateRange=custom`; const r = await withBackoff(() => axios.get(u)); await saveRaw('sec', u, r.data); return r.data; }
export async function getFilings(cik: string) { const u = `https://data.sec.gov/submissions/CIK${cik}.json`; const r = await withBackoff(() => axios.get(u)); await saveRaw('sec', u, r.data); return r.data; }
export async function getInsiderTrades(cik: string) { return getFilings(cik); }

export default async function fetchSec(term: string): Promise<SecResult> { await searchCompany(term); return { entities: [], relationships: [] }; }
