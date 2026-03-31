import crypto from 'node:crypto';
import { blockchainActivityQueue } from '../queues/queues.js';
import type { Request, Response } from 'express';

export async function alchemyWebhookHandler(req: Request, res: Response) {
  const sig = req.headers['x-alchemy-signature'] as string | undefined;
  const payload = JSON.stringify(req.body);
  const expected = crypto.createHmac('sha256', process.env.ALCHEMY_WEBHOOK_SECRET ?? '').update(payload).digest('hex');
  if (sig !== expected) return res.status(401).json({ error: 'invalid signature' });
  const address = req.body?.event?.activity?.[0]?.fromAddress;
  await blockchainActivityQueue.add('address_activity', { address, event: req.body });
  return res.status(200).json({ ok: true });
}
