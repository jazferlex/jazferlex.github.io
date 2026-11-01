import test from 'node:test';
import assert from 'node:assert/strict';
import {rewriteApiUrl} from '../src/routing.js';
test('Vercel single function reconstructs captured API path and preserves OAuth query values',()=>{
 assert.equal(rewriteApiUrl('/api/index?__portfolio_route=content'),'/api/content');
 assert.equal(rewriteApiUrl('/api/index?__portfolio_route=admin%2Fcontent'),'/api/admin/content');
 assert.equal(rewriteApiUrl('/api/index?__portfolio_route=auth%2Fcallback%2Fgoogle&code=abc%2B123&state=x%2Fy'),'/api/auth/callback/google?code=abc%2B123&state=x%2Fy');
 assert.equal(rewriteApiUrl('/api/content'),'/api/content');
});
test('Vercel rewrite captures cannot escape the API path or redirect to arbitrary origins',()=>{
 for(const route of ['https://evil.example/x','../content','auth/../admin/content','//evil.example','auth\\get-session','content?admin=true','%2e%2e/content']) {
  assert.equal(rewriteApiUrl('/api/index?__portfolio_route='+encodeURIComponent(route)),null,route);
 }
 assert.equal(rewriteApiUrl('/api/index?__portfolio_route=content&__portfolio_route=admin/content'),null);
 assert.equal(rewriteApiUrl('/api/index'),null);
});
