import type { Job } from 'bullmq';

export async function relationshipExpandProcessor(job: Job<{entityId:string;depth:number}>) {
  if (job.data.depth > 3) return { skipped: true };
  return { expanded: job.data.entityId };
}
