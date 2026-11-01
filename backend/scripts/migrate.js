import {createPool} from '../src/database.js';
import {loadLocalEnv} from '../src/env.js';
import {configFromEnv} from '../src/config.js';
import {migrate} from '../src/migrate.js';
loadLocalEnv();
const config=configFromEnv();
if(!config.databaseUrl) throw new Error('DATABASE_URL is required');
const pool=createPool(config.databaseUrl);
try {await migrate(pool,config); console.log('Database schema is current.');}
catch {console.error('Migration failed. Check database connectivity and schema permissions.'); process.exitCode=1;}
finally {await pool.end();}
