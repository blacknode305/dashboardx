import test from 'node:test';
import assert from 'node:assert/strict';
import GitHubControlWidget from '../client/js/module/Widget/GitHubControl.js';

test('GitHub network failure is represented as error state', async () => {
  const widget = new GitHubControlWidget({fetchImpl: async () => { throw new Error('offline'); }});
  const state = await widget.refresh();
  assert.equal(state.status,'error');
  assert.match(state.error,/offline/);
});
