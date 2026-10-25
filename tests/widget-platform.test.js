import test from 'node:test';
import assert from 'node:assert/strict';
import { getSpatialLayout, saveSpatialLayout, deleteSpatialLayout } from '../client/js/module/Spatial/SpatialLayout.js';

function memoryStorage() {
  const map = new Map();
  return {
    getItem: k => map.get(k) ?? null,
    setItem: (k, v) => map.set(k, v),
    removeItem: k => map.delete(k)
  };
}

test('spatial layout uses a different key than desktop widget settings', () => {
  const storage = memoryStorage();
  storage.setItem('datetimeWidget', '{"top":"50px","left":"10px"}');
  saveSpatialLayout('datetimeWidget', {
    position: [1, 2, -3], rotation: [0, 0, 0],
    widthMeters: 0.9, heightMeters: 0.5, anchorId: null
  }, storage);
  assert.equal(storage.getItem('datetimeWidget'), '{"top":"50px","left":"10px"}');
  assert.deepEqual(getSpatialLayout('datetimeWidget', storage).position, [1, 2, -3]);
  deleteSpatialLayout('datetimeWidget', storage);
  assert.equal(storage.getItem('datetimeWidget'), '{"top":"50px","left":"10px"}');
});

test('invalid spatial layout is rejected', () => {
  const storage = memoryStorage();
  assert.throws(() => saveSpatialLayout('datetimeWidget', {
    position: [NaN, 1, 2], rotation: [0, 0, 0],
    widthMeters: 0.7, heightMeters: 0.4
  }, storage));
  assert.deepEqual(getSpatialLayout('datetimeWidget', storage).position, [0, 1.5, -2]);
});
