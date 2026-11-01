import test from 'node:test';
import assert from 'node:assert/strict';
import {databaseConnectionString} from '../src/database.js';
test('Postgres SSL require alias is normalized to strict verification without exposing or changing credentials',()=>{
 const source='postgresql://example:secret%40value@db.example.test/portfolio?sslmode=require&channel_binding=require';
 const normalized=new URL(databaseConnectionString(source));
 assert.equal(normalized.searchParams.get('sslmode'),'verify-full');
 assert.equal(normalized.password,'secret%40value');
 assert.equal(normalized.searchParams.get('channel_binding'),'require');
 for(const mode of ['verify-full','verify-ca','disable']) assert.equal(databaseConnectionString(source.replace('sslmode=require','sslmode='+mode)),source.replace('sslmode=require','sslmode='+mode));
 assert.equal(databaseConnectionString('postgresql://postgres@localhost/test'),'postgresql://postgres@localhost/test');
});
