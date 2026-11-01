import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { contentSchema, saveSchema, publicContent } from '../src/schema.js';
const seed = JSON.parse(await readFile(new URL('../seed/content.json', import.meta.url)));

test('seed preserves the complete document and confirmed source facts', () => {
  assert.deepEqual(contentSchema.parse(seed), seed);
  assert.equal(seed.projects.length, 7);
  assert.equal(seed.projects.find(p => p.id === 'hackathon-rag').period, 'Oct 2025 – Dec 2025');
  assert.equal(seed.experience.length, 3);
});
test('rejects dangerous URL forms, oversized text, unknown keys and duplicate or reserved IDs', () => {
  for (const url of ['javascript:alert(1)', 'data:text/html,x', '//evil.com/x', 'https://user:pass@evil.com/', 'images\\evil.png', '/\\evil.com', 'https://good.com\n.evil.com', 'https://good.com/%0aevil']) {
    const value = structuredClone(seed); value.hero.portrait.url = url;
    assert.equal(contentSchema.safeParse(value).success, false, url);
  }
  for (const mutate of [v => v.extra = true, v => v.hero.description = 'x'.repeat(10001), v => v.projects[1].id = v.projects[0].id, v => v.projects[0].id = 'about', v => v.skillGroups[0].id = v.projects[0].id]) {
    const value = structuredClone(seed); mutate(value); assert.equal(contentSchema.safeParse(value).success, false);
  }
  assert.equal(saveSchema.safeParse({content: seed, revision: 0}).success, false);
});
test('plain HTML-looking text is retained as inert text; public envelope strips all draft collections', () => {
  const value = structuredClone(seed); value.hero.description = '<img src=x onerror=alert(1)>';
  for (const key of ['projects','experience','skillGroups']) value[key][0].status = 'draft';
  assert.equal(contentSchema.parse(value).hero.description, value.hero.description);
  const published = publicContent(value);
  for (const key of ['projects','experience','skillGroups']) assert.equal(published[key].length, value[key].length - 1);
  assert.equal(value.projects[0].status, 'draft');
});
