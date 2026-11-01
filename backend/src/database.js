import pg from 'pg';
export function databaseConnectionString(connectionString) {
  const url=new URL(connectionString);
  // pg currently treats sslmode=require as strict certificate validation.
  // Make that behavior explicit before the upcoming libpq-compatible default.
  if(url.searchParams.get('sslmode')==='require') {
    url.searchParams.set('sslmode','verify-full');
    return url.toString();
  }
  return connectionString;
}
export function createPool(connectionString,options={}) {
  if(!connectionString) throw new Error('DATABASE_URL is required');
  const pool=new pg.Pool({...options,connectionString:databaseConnectionString(connectionString)});
  pool.on('error',()=>console.error('PostgreSQL connection unavailable'));
  return pool;
}
