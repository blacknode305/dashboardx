import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const read = name => readFileSync(new URL('../' + name, import.meta.url), 'utf8');

test('Optima widgets read and write only the shared dashboardx.optima state', () => {
  const api = read('client/js/module/OptimaAPI.js');
  const settings = read('client/js/module/Widget/OptimaSettings.js');
  const passport = read('client/js/module/Widget/OptimaPassport.js');
  assert.equal((api.match(/\/api\/dashboardx\/optima\/v1\/state/g) || []).length, 2);
  assert.doesNotMatch(api, /\/api\/admin\/db/);
  assert.match(api, /baseRevision:Number\(baseRevision\)/);
  assert.match(settings, /\/api\/dashboardx\/optima\/v1\/state/);
  assert.match(passport, /\/api\/dashboardx\/optima\/v1\/passport\?productId=/);
});

test('DashboardX version cache is bumped after canonical migration', () => {
  assert.match(read('index.html'), /index\.js\?v=optima-canonical-20261109/);
  assert.match(read('client/js/index.js'), /WidgetElement\.js\?v=optima-canonical-20261109/);
});
