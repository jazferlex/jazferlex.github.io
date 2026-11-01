import {createPool} from './database.js';
import {configFromEnv} from './config.js';
import {createAuth} from './auth.js';
import {ContentRepository} from './repository.js';
import {createApp} from './app.js';
let app;
export function getApp() {
  if(!app) {
    const config=configFromEnv();
    if(!config.databaseUrl) throw new Error('DATABASE_URL is required');
    const pool=createPool(config.databaseUrl,{max:3,idleTimeoutMillis:10000,connectionTimeoutMillis:10000});
    app=createApp({config,auth:createAuth(config,pool),repository:new ContentRepository(pool)});
  }
  return app;
}
export async function runtimeHandler(request) {
  try {return await getApp()(request);}
  catch {console.error('Portfolio API configuration unavailable'); return Response.json({error:'Service is not configured'},{status:503,headers:{'cache-control':'no-store'}});}
}
