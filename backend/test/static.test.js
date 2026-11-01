import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {fileURLToPath} from 'node:url';
import {createStaticHandler} from '../src/static.js';
test('local static server serves public files and rejects private backend, env, git, docs and traversal',async()=>{
 const server=createServer(createStaticHandler(fileURLToPath(new URL('../../',import.meta.url)),fileURLToPath(new URL('../public/',import.meta.url))));
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const base=`http://127.0.0.1:${server.address().port}`;
 try {
  assert.equal((await fetch(base+'/')).status,200);
  assert.equal((await fetch(base+'/images/profile.png')).status,200);
  for(const path of ['/.env.local','/.env.runtime.local','/.git/config','/backend/seed/content.json','/backend/.env.test.local','/docs/superpowers/specs/2026-11-01-dynamic-content.md','/admin/%2e%2e%2f%2e%2e%2f.env.local','/images/%2e%2e%2f.env.local']) assert.equal((await fetch(base+path)).status,404,path);
 } finally {await new Promise(resolve=>server.close(resolve));}
});
