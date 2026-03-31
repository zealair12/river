import type { Job } from 'bullmq';
import fetchSec from '../../fetchers/secEdgar.js';
import fetchFec from '../../fetchers/fecApi.js';
import fetchOpenSecrets from '../../fetchers/openSecrets.js';
import fetchPropublica from '../../fetchers/propublica.js';

export async function entitySearchProcessor(job: Job<{query:string;searchType:'name'|'address'|'ein'}>) {
  await Promise.allSettled([fetchSec(job.data.query), fetchFec(job.data.query), fetchOpenSecrets(job.data.query), fetchPropublica(job.data.query)]);
  return { created: 0 };
}
