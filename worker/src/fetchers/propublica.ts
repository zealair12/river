import type { Entity, Relationship } from '../../../shared/types.js';
import { axios, saveRaw, withBackoff } from './_utils.js';
export interface PropublicaResult { entities: Entity[]; relationships: Relationship[] }
export async function searchNonprofits(name:string){const u=`https://projects.propublica.org/nonprofits/api/v2/search.json?q=${encodeURIComponent(name)}`;const r=await withBackoff(()=>axios.get(u));await saveRaw('propublica',u,r.data);return r.data;}
export async function get990(ein:string){const u=`https://projects.propublica.org/nonprofits/api/v2/organizations/${ein}.json`;const r=await withBackoff(()=>axios.get(u));await saveRaw('propublica',u,r.data);return r.data;}
export default async function fetchPropublica(term:string):Promise<PropublicaResult>{await searchNonprofits(term);return {entities:[],relationships:[]};}
