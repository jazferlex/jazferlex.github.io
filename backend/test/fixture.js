// Isolated local browser QA only. Never imported by runtime code.
import pg from 'pg';
import {randomBytes} from 'node:crypto';
import {readFile,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {makeSignature} from 'better-auth/crypto';
import {configFromEnv} from '../src/config.js';
import {createAuth} from '../src/auth.js';
import {migrate} from '../src/migrate.js';
import {ContentRepository} from '../src/repository.js';
try {process.loadEnvFile(fileURLToPath(new URL('../.env.test.local',import.meta.url)));} catch {}
const databaseUrl=process.env.TEST_DATABASE_URL;
const parsed=new URL(databaseUrl);
if(!['localhost','127.0.0.1'].includes(parsed.hostname) || !parsed.pathname.includes('test')) throw new Error('QA fixture requires an explicitly isolated localhost test database');
const env={DATABASE_URL:databaseUrl,BETTER_AUTH_URL:'http://127.0.0.1:3000',BETTER_AUTH_SECRET:randomBytes(48).toString('base64url'),GOOGLE_CLIENT_ID:'local-qa-fixture-not-a-real-oauth-client',GOOGLE_CLIENT_SECRET:randomBytes(32).toString('base64url'),PUBLIC_SITE_URL:'https://jazferlex.github.io'};
const config=configFromEnv(env),pool=new pg.Pool({connectionString:databaseUrl});
try {
 await migrate(pool,config);
 const repository=new ContentRepository(pool);
 const seed=JSON.parse(await readFile(new URL('../seed/content.json',import.meta.url)));
 const current=await repository.seed(seed);
 await repository.save(seed,current.revision);
 const auth=createAuth(config,pool),context=await auth.$context;
 let user=await context.internalAdapter.findUserByEmail('jazferlex@gmail.com');
 if(user) {await pool.query('UPDATE "user" SET "emailVerified"=true WHERE email=$1',['jazferlex@gmail.com']); user=user.user;}
 else user=await context.internalAdapter.createUser({name:'Jazfer QA',email:'jazferlex@gmail.com',emailVerified:true});
 const session=await context.internalAdapter.createSession(user.id);
 const token=session.token+'.'+await makeSignature(session.token,config.authSecret);
 const cookie={name:'better-auth.session_token',value:encodeURIComponent(token),domain:'127.0.0.1',path:'/',httpOnly:true,secure:false,sameSite:'Lax',expires:Math.floor(session.expiresAt.getTime()/1000)};
 await writeFile(new URL('../.env.qa.local',import.meta.url),Object.entries(env).map(([key,value])=>`${key}=${value}`).join('\n')+'\n',{mode:0o600});
 await writeFile(new URL('../.qa-session.json',import.meta.url),JSON.stringify([cookie],null,2)+'\n',{mode:0o600});
 console.log('Local QA fixture written to ignored backend/.env.qa.local and backend/.qa-session.json. No OAuth flow is simulated.');
}finally{await pool.end();}
