import type { Entity, Relationship } from '../../../shared/types.js';
import { axios, saveRaw, withBackoff } from './_utils.js';
export interface CovalentResult { entities: Entity[]; relationships: Relationship[] }
export async function getMultiChainTransactions(address: string, chainIds: number[]){
  const all = await Promise.all(chainIds.map(async (chainId)=>{const u=`https://api.covalenthq.com/v1/${chainId}/address/${address}/transactions_v2/`; const r=await withBackoff(()=>axios.get(u,{auth:{username:process.env.COVALENT_API_KEY??'',password:''}})); await saveRaw('covalent',u,r.data); return r.data;}));
  return all;
}
export default async function fetchCovalent(address:string):Promise<CovalentResult>{await getMultiChainTransactions(address,[1,137,56,43114,42161]);return {entities:[],relationships:[]};}
