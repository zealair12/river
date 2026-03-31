import 'dotenv/config';
import { Worker } from 'bullmq';
import { Redis } from 'ioredis';
import { entitySearchProcessor } from './processors/entitySearch.processor.js';
import { scheduledSyncProcessor } from './processors/scheduledSync.processor.js';
import { relationshipExpandProcessor } from './processors/relationshipExpand.processor.js';
import { scheduledSyncQueue } from './queues.js';

const connection = new Redis(process.env.REDIS_URL ?? 'redis://localhost:6379', { maxRetriesPerRequest: null });

export async function startWorkers() {
  new Worker('entity-search', entitySearchProcessor, { connection });
  new Worker('scheduled-sync', scheduledSyncProcessor, { connection });
  new Worker('blockchain-activity', entitySearchProcessor as any, { connection });
  new Worker('relationship-expand', relationshipExpandProcessor, { connection });
  await scheduledSyncQueue.add('nightly', {}, { repeat: { pattern: '0 2 * * *' } });
}

startWorkers();
