import test from 'node:test';
import assert from 'node:assert/strict';
import {classifyVisit} from '../src/visits.js';
import {configFromEnv} from '../src/config.js';

test('classifies browser and OS families from overlapping compatibility tokens', () => {
  const agents = [
    ['Mozilla/5.0 (Linux; Android 14) Chrome/131.0 Mobile Safari/537.36 SamsungBrowser/27.0', 'Samsung Internet', 'Android'],
    ['Mozilla/5.0 (X11; CrOS x86_64 16093.0.0) Chrome/131.0 Safari/537.36', 'Chrome', 'ChromeOS'],
    ['Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Version/18.0 Safari/605.1.15', 'Safari', 'macOS'],
    ['Mozilla/5.0 (iPad; CPU OS 18_0 like Mac OS X) CriOS/131.0 Mobile Safari/604.1', 'Chrome', 'iOS'],
    ['Mozilla/5.0 (X11; Linux x86_64) Chrome/131.0 Safari/537.36 OPR/116.0', 'Opera', 'Linux']
  ];
  for (const [userAgent, browser, operatingSystem] of agents) {
    const visit = classifyVisit(new Headers({'user-agent': userAgent}));
    assert.deepEqual(visit, {country: 'Unknown', region: 'Unknown', browser, operatingSystem});
  }
});

test('accepts local HTTP public origins for development and HTTPS origins for production', () => {
  assert.equal(configFromEnv({PUBLIC_SITE_URL: 'http://127.0.0.1:3000'}).publicOrigin, 'http://127.0.0.1:3000');
  assert.throws(() => configFromEnv({
    NODE_ENV: 'production',
    BETTER_AUTH_URL: 'https://admin.example',
    PUBLIC_SITE_URL: 'http://127.0.0.1:3000'
  }), /Invalid application origin/);
  assert.throws(() => configFromEnv({PUBLIC_SITE_URL: 'http://public.example'}), /Invalid application origin/);
});
