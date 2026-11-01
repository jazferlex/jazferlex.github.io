import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {loadLocalEnv} from '../src/env.js';
test('explicit database/auth environment wins local files; runtime file wins only previously unset values',async()=>{
 const directory=await mkdtemp(join(tmpdir(),'portfolio-env-test-'));
 const files=[join(directory,'.env.local'),join(directory,'.env.runtime.local')];
 const keys=['DATABASE_URL','BETTER_AUTH_SECRET','PORTFOLIO_ENV_TEST_PRIORITY'];
 const original=Object.fromEntries(keys.map(key=>[key,process.env[key]]));
 try {
  process.env.DATABASE_URL='postgresql://localhost/isolated_test';
  process.env.BETTER_AUTH_SECRET='explicit-test-secret';
  delete process.env.PORTFOLIO_ENV_TEST_PRIORITY;
  await writeFile(files[0],'DATABASE_URL=postgresql://production.example/main\nBETTER_AUTH_SECRET=file-secret\nPORTFOLIO_ENV_TEST_PRIORITY=root\n');
  await writeFile(files[1],'DATABASE_URL=postgresql://production.example/main\nBETTER_AUTH_SECRET=runtime-secret\nPORTFOLIO_ENV_TEST_PRIORITY=runtime\n');
  loadLocalEnv(files);
  assert.equal(process.env.DATABASE_URL,'postgresql://localhost/isolated_test');
  assert.equal(process.env.BETTER_AUTH_SECRET,'explicit-test-secret');
  assert.equal(process.env.PORTFOLIO_ENV_TEST_PRIORITY,'runtime');
 }finally{
  for(const key of keys) {if(original[key]===undefined) delete process.env[key]; else process.env[key]=original[key];}
  await rm(directory,{recursive:true,force:true});
 }
});
