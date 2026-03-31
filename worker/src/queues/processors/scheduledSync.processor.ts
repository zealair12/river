import type { Job } from 'bullmq';

export async function scheduledSyncProcessor(_job: Job) {
  return { synced: true };
}
