import type { Entity, Relationship } from '../../../shared/types.js';
import { axios, saveRaw, withBackoff } from './_utils.js';
export interface FecResult { entities: Entity[]; relationships: Relationship[] }
const base='https://api.open.fec.gov/v1';
export async function searchDonors(name: string){const u=`${base}/schedules/schedule_a/?contributor_name=${encodeURIComponent(name)}&api_key=${process.env.FEC_API_KEY}`;const r=await withBackoff(()=>axios.get(u));await saveRaw('fec',u,r.data);return r.data;}
export async function getDonationsByCommittee(committeeId: string){const u=`${base}/schedules/schedule_a/?committee_id=${committeeId}&api_key=${process.env.FEC_API_KEY}`;const r=await withBackoff(()=>axios.get(u));await saveRaw('fec',u,r.data);return r.data;}
export default async function fetchFec(term:string):Promise<FecResult>{await searchDonors(term);return {entities:[],relationships:[]};}
