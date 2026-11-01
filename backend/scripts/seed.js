import {createPool} from '../src/database.js';
import {readFile} from 'node:fs/promises';
import {loadLocalEnv} from '../src/env.js';
import {configFromEnv} from '../src/config.js';
import {ContentRepository} from '../src/repository.js';
loadLocalEnv();
const config=configFromEnv();
if(!config.databaseUrl) throw new Error('DATABASE_URL is required');
const pool=createPool(config.databaseUrl);
try {const content=JSON.parse(await readFile(new URL('../seed/content.json',import.meta.url))); await new ContentRepository(pool).seed(content); console.log('Portfolio seed is present (existing edits preserved).');}
catch {console.error('Seed failed. Run migrations and check database connectivity.'); process.exitCode=1;}
finally {await pool.end();}
