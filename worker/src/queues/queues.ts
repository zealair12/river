import { Queue } from 'bullmq';
import { Redis } from 'ioredis';

const connection = new Redis(process.env.REDIS_URL ?? 'redis://localhost:6379', { maxRetriesPerRequest: null });

export const entitySearchQueue = new Queue('entity-search', { connection });
export const scheduledSyncQueue = new Queue('scheduled-sync', { connection });
export const blockchainActivityQueue = new Queue('blockchain-activity', { connection });
export const relationshipExpandQueue = new Queue('relationship-expand', { connection });
