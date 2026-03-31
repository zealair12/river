import type { Relationship } from '../../../shared/types.js';
import { axios, saveRaw, withBackoff } from './_utils.js';

export async function getSwaps(walletAddress: string): Promise<Relationship[]> {
  const u = 'https://api.thegraph.com/subgraphs/name/uniswap/uniswap-v3';
  const query = { query: `{ swaps(where: { origin: \"${walletAddress.toLowerCase()}\" }) { id amountUSD timestamp } }` };
  const r = await withBackoff(() => axios.post(u, query));
  await saveRaw('graph-uniswap', u, r.data);
  return [];
}

export async function getLoanActivity(walletAddress: string): Promise<Relationship[]> {
  const u = 'https://api.thegraph.com/subgraphs/name/graphprotocol/compound-v2';
  const query = { query: `{ borrows(where: { borrower: \"${walletAddress.toLowerCase()}\" }) { id amountUSD } }` };
  const r = await withBackoff(() => axios.post(u, query));
  await saveRaw('graph-compound', u, r.data);
  return [];
}
