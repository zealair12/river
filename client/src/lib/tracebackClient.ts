import { createTracebackClient, type TracebackClient } from '@traceback/shared';

let cached: TracebackClient | null = null;
let cachedBase = '';

/**
 * Traceback HTTP API (sessions + branching messages) — same client as `traceback/client`.
 * Set `VITE_TRACEBACK_API_URL` (e.g. `/traceback-api` with Vite proxy, or `http://localhost:4000`).
 */
export function getTracebackClient(): TracebackClient | null {
  const base = (import.meta.env.VITE_TRACEBACK_API_URL as string | undefined)?.trim();
  if (!base) return null;
  if (cached && cachedBase === base) return cached;
  cachedBase = base;
  cached = createTracebackClient(base);
  return cached;
}

export function isTracebackApiConfigured(): boolean {
  return Boolean((import.meta.env.VITE_TRACEBACK_API_URL as string | undefined)?.trim());
}

/** Base URL of the Traceback web app (for “open in Traceback” links). */
export function getTracebackAppUrl(): string {
  const u = (import.meta.env.VITE_TRACEBACK_APP_URL as string | undefined)?.trim();
  return u || 'http://localhost:5173';
}
