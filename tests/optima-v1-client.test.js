import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const source = readFileSync(new URL('../client/js/module/Widget/OptimaPassport.js', import.meta.url), 'utf8');

test('Passport uses versioned Optima API without downloading legacy full DB', () => {
  assert.match(source, /\/api\/dashboardx\/optima\/v1\/products\?limit=1000/);
  assert.match(source, /\/api\/dashboardx\/optima\/v1\/passport\?productId=/);
  assert.doesNotMatch(source, /loadOptima\(/);
  assert.match(source, /new AbortController\(\)/);
  assert.match(source, /this\.detailController\?\.abort\(\)/);
  assert.match(source, /this\.seq/);
});
test('Passport still offers all five connected-data views', () => {
  const html = readFileSync(new URL('../client/_optimaPassport.html', import.meta.url), 'utf8');
  for (const tab of ['catalog', 'documents', 'stocks', 'orders', 'schedules'])
    assert.ok(html.includes('data-tab="' + tab + '"'));
  assert.match(source, /productCoverage|Связь не подтверждена/);
});
