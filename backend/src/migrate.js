import { getMigrations } from 'better-auth/db/migration';
import { authOptions } from './auth.js';
export async function migrate(pool, config) {
  // Schema generation needs the real auth options, but not configured OAuth credentials.
  const migrations = await getMigrations(authOptions(config,pool));
  await migrations.runMigrations();
  await pool.query(`CREATE TABLE IF NOT EXISTS portfolio_content (
    id smallint PRIMARY KEY CHECK (id=1),
    content jsonb NOT NULL,
    revision integer NOT NULL DEFAULT 1 CHECK (revision > 0),
    updated_at timestamptz NOT NULL DEFAULT now()
  )`);
}
