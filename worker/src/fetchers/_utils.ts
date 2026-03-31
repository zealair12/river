import axios from 'axios';
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL ?? 'postgres://postgres:postgres@localhost:5432/river' });

export async function saveRaw(source: string, endpoint: string, body: unknown) {
  await pool.query('INSERT INTO raw_api_responses(source, endpoint, response_body, fetched_at) VALUES($1,$2,$3,now())', [source, endpoint, body]);
}

export async function withBackoff<T>(fn: () => Promise<T>, retries = 4): Promise<T> {
  let delay = 300;
  for (let i = 0; ; i++) {
    try { return await fn(); } catch (e: any) {
      if (i >= retries) throw e;
      await new Promise((r) => setTimeout(r, delay));
      delay *= 2;
    }
  }
}

export { axios };
