import test, {before, after} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {randomUUID, createHmac} from 'node:crypto';
import pg from 'pg';
import {configFromEnv} from '../src/config.js';
import {createAuth, authOptions, isOwner} from '../src/auth.js';
import {migrate} from '../src/migrate.js';
import {ContentRepository} from '../src/repository.js';
import {VisitRepository} from '../src/visits.js';
import {createApp} from '../src/app.js';
try { process.loadEnvFile(new URL('../.env.test.local',import.meta.url)); } catch {}
assert.ok(process.env.TEST_DATABASE_URL, 'TEST_DATABASE_URL required: use an isolated real Postgres database');
const pool = new pg.Pool({connectionString:process.env.TEST_DATABASE_URL});
const seed = JSON.parse(await readFile(new URL('../seed/content.json', import.meta.url)));
const config = configFromEnv({DATABASE_URL:process.env.TEST_DATABASE_URL, BETTER_AUTH_SECRET:'test-only-secret-for-isolated-database-12345678',BETTER_AUTH_URL:'http://localhost:3000',GOOGLE_CLIENT_ID:'test-google-client-id',GOOGLE_CLIENT_SECRET:'test-google-client-secret',PUBLIC_SITE_URL:'https://jazferlex.github.io'});
const auth=createAuth(config,pool), repo=new ContentRepository(pool), visits=new VisitRepository(pool);
const app=createApp({config,auth,repository:repo,visits});
const request=(path,options={}) => app(new Request('http://localhost:3000'+path,options));
const put=(content,revision,cookie,extra={}) => request('/api/admin/content',{method:'PUT',headers:{origin:config.authOrigin,'content-type':'application/json',cookie,...extra},body:JSON.stringify({content,revision})});
async function session(email,verified=true) {
  const userId=randomUUID(),token=randomUUID();
  await pool.query('INSERT INTO "user" (id,name,email,"emailVerified","createdAt","updatedAt") VALUES ($1,$2,$3,$4,now(),now())',[userId,'Test',email,verified]);
  await pool.query('INSERT INTO "session" (id,token,"userId","expiresAt","createdAt","updatedAt") VALUES ($1,$2,$3,now()+interval \'1 day\',now(),now())',[randomUUID(),token,userId]);
  const signature=createHmac('sha256',config.authSecret).update(token).digest('base64');
  return `better-auth.session_token=${encodeURIComponent(token+'.'+signature)}`;
}
before(async()=>{await migrate(pool,config); await pool.query('TRUNCATE "session", "account", "user", portfolio_content, portfolio_visit_counts CASCADE'); await repo.seed(seed);});
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

test('visit routes restrict recording to the public origin and reports to the verified owner',async()=>{
 assert.equal((await request('/api/visits')).status,405);
 for (const origin of [undefined, 'null', config.authOrigin, 'https://evil.example']) {
  const headers = origin === undefined ? {} : {origin};
  assert.equal((await request('/api/visits',{method:'POST',headers})).status,403);
 }
 assert.equal((await request('/api/visits',{method:'POST',headers:{origin:config.publicOrigin},body:'unexpected payload'})).status,400);
 assert.equal((await request('/api/admin/visits',{method:'POST'})).status,405);
 assert.equal((await request('/api/admin/visits')).status,401);
 const wrong=await session('visits-other@example.com');
 assert.equal((await request('/api/admin/visits',{headers:{cookie:wrong}})).status,403);
 await pool.query('DELETE FROM "user" WHERE email=$1',['jazferlex@gmail.com']);
 const unverified=await session('jazferlex@gmail.com',false);
 assert.equal((await request('/api/admin/visits',{headers:{cookie:unverified}})).status,403);
 await pool.query('DELETE FROM "user" WHERE email=$1',['jazferlex@gmail.com']);
});

test('concurrent views increment daily counts and keep independent location, browser, and OS breakdowns',async()=>{
 const headers = {
  origin: config.publicOrigin,
  'x-vercel-ip-country': 'PH',
  'x-vercel-ip-country-region': 'CEB',
  'x-vercel-ip-city': 'Cebu%20City',
  'x-forwarded-for': '192.0.2.10',
  'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/134.0.0.0 Safari/537.36 Edg/134.0.0.0'
 };
 const record = visitHeaders => request('/api/visits',{method:'POST',headers:visitHeaders});
 const results = await Promise.all(Array.from({length:12},()=>record(headers)));
 assert.ok(results.every(result=>result.status===204 && !result.headers.has('set-cookie')));
 assert.equal((await record({
  origin:config.publicOrigin,
  'x-vercel-ip-country':'US',
  'x-vercel-ip-country-region':'CA',
  'user-agent':'Mozilla/5.0 (iPhone; CPU iPhone OS 18_4 like Mac OS X) AppleWebKit/605.1.15 FxiOS/135.0 Mobile/15E148 Safari/605.1.15'
 })).status,204);
 assert.equal((await record({
  origin:config.publicOrigin,
  'x-vercel-ip-country':'not-a-country',
  'x-vercel-ip-country-region':'some arbitrary value',
  'user-agent':'Unknown custom agent'
 })).status,204);

 await pool.query(`INSERT INTO portfolio_visit_counts (day, dimension, label, views)
   VALUES ((now() AT TIME ZONE 'Asia/Manila')::date-29,'days','',2),
     ((now() AT TIME ZONE 'Asia/Manila')::date-30,'days','',500)`);
 const cookie=await session('jazferlex@gmail.com');
 const response=await request('/api/admin/visits',{headers:{cookie}});
 assert.equal(response.status,200);
 assert.equal(response.headers.get('cache-control'),'no-store');
 assert.equal(response.headers.get('access-control-allow-origin'),null);
 const report=await response.json();
 assert.equal(report.total,16);
 assert.equal(report.days.length,30);
 assert.deepEqual(report.days.map(day=>day.count),[2,...Array(28).fill(0),14]);
 const {rows:[{today}]}=await pool.query("SELECT to_char((now() AT TIME ZONE 'Asia/Manila')::date,'YYYY-MM-DD') AS today");
 assert.equal(report.days.at(-1).date,today);
 assert.deepEqual(report.countries,[{label:'PH',count:12},{label:'US',count:1},{label:'Unknown',count:1}]);
 assert.deepEqual(report.regions,[{label:'PH-CEB',count:12},{label:'US-CA',count:1},{label:'Unknown',count:1}]);
 assert.deepEqual(report.browsers,[{label:'Edge',count:12},{label:'Firefox',count:1},{label:'Unknown',count:1}]);
 assert.deepEqual(report.operatingSystems,[{label:'Windows',count:12},{label:'Unknown',count:1},{label:'iOS',count:1}]);
 const {rows} = await pool.query('SELECT * FROM portfolio_visit_counts');
 for (const row of rows) assert.deepEqual(Object.keys(row),['day','dimension','label','views']);
 const stored=JSON.stringify(rows);
 for(const value of ['192.0.2.10','Cebu','Mozilla','not-a-country','some arbitrary value','Unknown custom agent']) assert.ok(!stored.includes(value));
});
