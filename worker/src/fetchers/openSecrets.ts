import type { Entity, Relationship } from '../../../shared/types.js';
import { axios, saveRaw, withBackoff } from './_utils.js';
export interface OpenSecretsResult { entities: Entity[]; relationships: Relationship[] }
export async function getLobbyists(name: string){const u=`https://www.opensecrets.org/api/?method=getLobbyist&name=${encodeURIComponent(name)}&apikey=${process.env.OPENSECRETS_API_KEY}&output=json`;const r=await withBackoff(()=>axios.get(u));await saveRaw('opensecrets',u,r.data);return r.data;}
export async function getOrgLobbying(orgname: string){const u=`https://www.opensecrets.org/api/?method=orgSummary&id=${encodeURIComponent(orgname)}&apikey=${process.env.OPENSECRETS_API_KEY}&output=json`;const r=await withBackoff(()=>axios.get(u));await saveRaw('opensecrets',u,r.data);return r.data;}
export default async function fetchOpenSecrets(name:string):Promise<OpenSecretsResult>{await getLobbyists(name);return {entities:[],relationships:[]};}
