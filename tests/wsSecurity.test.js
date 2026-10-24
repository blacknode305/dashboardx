import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isWsConfigured,
  verifyWsToken,
  isAllowedWsOrigin,
  createClientSnapshot,
} from '../server/module/wsSecurity.js';

const token = 'a'.repeat(64);

test('WebSocket is disabled when token is missing or weak', () => {
  assert.equal(isWsConfigured(''), false);
  assert.equal(isWsConfigured('short'), false);
  assert.equal(isWsConfigured(token), true);
  assert.equal(verifyWsToken(token, ''), false);
});

test('WebSocket token verification accepts only an exact token', () => {
  assert.equal(verifyWsToken(token, token), true);
  assert.equal(verifyWsToken('b'.repeat(64), token), false);
  assert.equal(verifyWsToken({ token }, token), false);
  assert.equal(verifyWsToken('x'.repeat(1025), token), false);
});

test('WebSocket rejects cross-origin browser connections', () => {
  assert.equal(isAllowedWsOrigin('http://localhost:3030', 'localhost:3030'), true);
  assert.equal(isAllowedWsOrigin('https://dashboard.example', 'dashboard.example'), true);
  assert.equal(isAllowedWsOrigin('https://evil.example', 'dashboard.example'), false);
  assert.equal(isAllowedWsOrigin('null', 'dashboard.example'), false);
  assert.equal(isAllowedWsOrigin(undefined, 'localhost:3030'), true);
});

test('Client database snapshot excludes sensitive and internal fields', () => {
  const snapshot = createClientSnapshot({
    ROOT_PATH: '/private/path',
    telegram: [{ id: 123 }],
    mime: { '.json': 'application/json' },
    system: { theme: { active: 'black' }, workplace: [{ name: 'home' }], alarm: [{ secret: 'private' }] },
    finance: { table: [] },
    workplace: [{ name: 'home' }],
    playlist: [],
    games: {},
  });
  assert.deepEqual(Object.keys(snapshot).sort(), ['finance', 'games', 'playlist', 'system', 'workplace']);
  assert.deepEqual(Object.keys(snapshot.system).sort(), ['theme', 'workplace']);
  assert.equal(JSON.stringify(snapshot).includes('telegram'), false);
  assert.equal(JSON.stringify(snapshot).includes('private'), false);
});
