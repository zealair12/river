import type { Entity, Relationship } from '../../../shared/types.js';
import { axios, saveRaw, withBackoff } from './_utils.js';
export interface EtherscanResult { entities: Entity[]; relationships: Relationship[] }
let tokens=5; setInterval(()=>{tokens=5;},1000);
async function bucket(){while(tokens<=0) await new Promise(r=>setTimeout(r,100)); tokens--;}
export async function getWalletTransactions(address:string){await bucket();const u=`https://api.etherscan.io/api?module=account&action=txlist&address=${address}&apikey=${process.env.ETHERSCAN_API_KEY}`;const r=await withBackoff(()=>axios.get(u));await saveRaw('etherscan',u,r.data);return r.data;}
export async function getTokenTransfers(address:string){await bucket();const u=`https://api.etherscan.io/api?module=account&action=tokentx&address=${address}&apikey=${process.env.ETHERSCAN_API_KEY}`;const r=await withBackoff(()=>axios.get(u));await saveRaw('etherscan',u,r.data);return r.data;}
export async function getContractInfo(address:string){await bucket();const u=`https://api.etherscan.io/api?module=contract&action=getsourcecode&address=${address}&apikey=${process.env.ETHERSCAN_API_KEY}`;const r=await withBackoff(()=>axios.get(u));await saveRaw('etherscan',u,r.data);return r.data;}
export default async function fetchEtherscan(address:string):Promise<EtherscanResult>{await getWalletTransactions(address);return {entities:[],relationships:[]};}
