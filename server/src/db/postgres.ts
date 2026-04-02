import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL ?? 'postgres://postgres:postgres@localhost:5433/river' });

export const query = (text: string, params?: unknown[]) => pool.query(text, params);

export async function initPostgres() {
  await query('CREATE EXTENSION IF NOT EXISTS "pgcrypto"');
  await query(`CREATE TABLE IF NOT EXISTS raw_api_responses(id uuid DEFAULT gen_random_uuid() PRIMARY KEY, source varchar, endpoint varchar, response_body jsonb, fetched_at timestamp DEFAULT now())`);
  await query(`CREATE TABLE IF NOT EXISTS ingestion_jobs(id uuid DEFAULT gen_random_uuid() PRIMARY KEY, job_type varchar, status varchar, started_at timestamp, completed_at timestamp, error text, records_created int)`);
  await query(`CREATE TABLE IF NOT EXISTS entity_aliases(entity_id varchar, alias varchar, source varchar)`);
}
