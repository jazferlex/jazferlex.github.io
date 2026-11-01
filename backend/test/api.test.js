import test, {before, after} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {randomUUID, createHmac} from 'node:crypto';
import pg from 'pg';
import {configFromEnv} from '../src/config.js';
import {createAuth, authOptions, isOwner} from '../src/auth.js';
import {migrate} from '../src/migrate.js';
import {ContentRepository} from '../src/repository.js';
import {createApp} from '../src/app.js';
try { process.loadEnvFile(new URL('../.env.test.local',import.meta.url)); } catch {}
assert.ok(process.env.TEST_DATABASE_URL, 'TEST_DATABASE_URL required: use an isolated real Postgres database');
const pool = new pg.Pool({connectionString:process.env.TEST_DATABASE_URL});
const seed = JSON.parse(await readFile(new URL('../seed/content.json', import.meta.url)));
const config = configFromEnv({DATABASE_URL:process.env.TEST_DATABASE_URL, BETTER_AUTH_SECRET:'test-only-secret-for-isolated-database-12345678',BETTER_AUTH_URL:'http://localhost:3000',GOOGLE_CLIENT_ID:'test-google-client-id',GOOGLE_CLIENT_SECRET:'test-google-client-secret',PUBLIC_SITE_URL:'https://jazferlex.github.io'});
const auth=createAuth(config,pool), repo=new ContentRepository(pool), app=createApp({config,auth,repository:repo});
const request=(path,options={}) => app(new Request('http://localhost:3000'+path,options));
const put=(content,revision,cookie,extra={}) => request('/api/admin/content',{method:'PUT',headers:{origin:config.authOrigin,'content-type':'application/json',cookie,...extra},body:JSON.stringify({content,revision})});
async function session(email,verified=true) {
  const userId=randomUUID(),token=randomUUID();
  await pool.query('INSERT INTO "user" (id,name,email,"emailVerified","createdAt","updatedAt") VALUES ($1,$2,$3,$4,now(),now())',[userId,'Test',email,verified]);
  await pool.query('INSERT INTO "session" (id,token,"userId","expiresAt","createdAt","updatedAt") VALUES ($1,$2,$3,now()+interval \'1 day\',now(),now())',[randomUUID(),token,userId]);
  const signature=createHmac('sha256',config.authSecret).update(token).digest('base64');
  return `better-auth.session_token=${encodeURIComponent(token+'.'+signature)}`;
}
before(async()=>{await migrate(pool,config); await pool.query('TRUNCATE "session", "account", "user", portfolio_content CASCADE'); await repo.seed(seed);});
after(async()=>{await pool.end();});
test('configuration fails closed without Google but public content remains available',async()=>{
 const missing=configFromEnv({DATABASE_URL:process.env.TEST_DATABASE_URL}); assert.equal(missing.authReady,false);
 const handler=createApp({config:missing,auth:null,repository:repo});
 assert.equal((await handler(new Request('http://localhost:3000/api/auth/get-session'))).status,503);
 assert.equal((await handler(new Request('http://localhost:3000/api/content'))).status,200);
 assert.throws(()=>configFromEnv({ADMIN_EMAIL:'attacker@example.com'}));
});
test('real Better Auth config is Google only, secure and restricts verified user creation',async()=>{
 assert.deepEqual(Object.keys(auth.options.socialProviders),['google']);
 assert.equal(auth.options.emailAndPassword.enabled,false);
 assert.deepEqual(auth.options.trustedOrigins,[config.authOrigin]);
 assert.equal(auth.options.session.cookieCache.enabled,false);
 const context=await auth.$context;
 assert.equal(await context.internalAdapter.createUser({email:'other@example.com',name:'Other',emailVerified:true}),null);
 assert.equal(await context.internalAdapter.createUser({email:'jazferlex@gmail.com',name:'Owner',emailVerified:false}),null);
 assert.equal(isOwner({email:'jazferlex@gmail.com',emailVerified:true}),true);
 assert.equal(isOwner({email:'jazferlex@gmail.com',emailVerified:'true'}),false);
 const prod=authOptions({...config,authUrl:'https://jazfer-portfolio-admin.vercel.app',authOrigin:'https://jazfer-portfolio-admin.vercel.app'},pool);
 assert.equal(prod.advanced.useSecureCookies,true);
});
test('auth routes reject mutations outside the Google session flow',async()=>{
 for(const path of ['/api/auth/sign-up/email','/api/auth/sign-in/email','/api/auth/update-user','/api/auth/link-social','/api/auth/delete-user']) assert.equal((await request(path,{method:'POST',headers:{origin:config.authOrigin,'content-type':'application/json'},body:'{}'})).status,404);
});
test('real sessions deny anonymous, wrong owner, unverified owner and forged cookies',async()=>{
 assert.equal((await request('/api/admin/content')).status,401);
 const wrong=await session('different@example.com'); assert.equal((await put(seed,1,wrong)).status,403);
 const unverified=await session('jazferlex@gmail.com',false); assert.equal((await put(seed,1,unverified)).status,403);
 await pool.query('DELETE FROM "user" WHERE email=$1',['jazferlex@gmail.com']);
 assert.equal((await put(seed,1,'better-auth.session_token=forged')).status,401);
});
test('authorized writes persist atomically, filter drafts, reject stale revisions and hostile requests',async()=>{
 const cookie=await session('jazferlex@gmail.com');
 assert.equal((await request('/api/auth/get-session',{headers:{cookie}})).status,200);
 const before=await (await request('/api/admin/content',{headers:{cookie}})).json(); assert.equal(before.revision,1);
 for(const origin of ['https://evil.example','null','']) assert.equal((await put(seed,1,cookie,{origin})).status,403);
 assert.equal((await put(seed,1,cookie,{'content-type':'text/plain'})).status,415);
 const invalid=structuredClone(seed); invalid.hero.portrait.url='javascript:alert(1)'; assert.equal((await put(invalid,1,cookie)).status,400);
 const draft=structuredClone(seed); for(const key of ['projects','experience','skillGroups']) draft[key][0].status='draft'; draft.hero.description='Saved persistence test';
 const save=await put(draft,1,cookie); assert.equal(save.status,200); const saved=await save.json(); assert.equal(saved.revision,2);
 assert.deepEqual((await new ContentRepository(pool).read()).content,draft);
 const publicResponse=await request('/api/content',{headers:{origin:'https://jazferlex.github.io'}}); assert.equal(publicResponse.headers.get('access-control-allow-origin'),'https://jazferlex.github.io'); assert.equal(publicResponse.headers.get('access-control-allow-credentials'),null);
 const published=await publicResponse.json(); assert.equal(published.content.projects.length,6);
 assert.equal((await put(seed,1,cookie)).status,409);
 const parallel=await Promise.all([put(seed,2,cookie),put(draft,2,cookie)]); assert.deepEqual(parallel.map(r=>r.status).sort(),[200,409]);
 const large=await request('/api/admin/content',{method:'PUT',headers:{origin:config.authOrigin,'content-type':'application/json',cookie},body:'x'.repeat(131073)}); assert.equal(large.status,413);
 assert.equal((await request('/api/admin/content',{headers:{cookie}})).headers.get('cache-control'),'no-store');
 await pool.query('UPDATE "user" SET "emailVerified"=false WHERE email=$1',['jazferlex@gmail.com']);
 assert.equal((await put(seed,3,cookie)).status,403);
});
