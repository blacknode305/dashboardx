import test from 'node:test';
import assert from 'node:assert/strict';
import GitHubControlWidget from '../client/js/module/Widget/GitHubControl.js';
import ServerMonitorWidget from '../client/js/module/Widget/ServerMonitor.js';

test('GitHub public repository response is normalized without secrets', async () => {
  const urls = [];
  const widget = new GitHubControlWidget({fetchImpl: async url => {
    urls.push(url);
    return {ok:true,json:async()=>({full_name:'blacknode305/dashboardx',stargazers_count:7,default_branch:'main'})};
  }});
  const result = await widget.refresh();
  assert.equal(result.status, 'ready');
  assert.equal(result.data.stars, 7);
  assert.equal(urls[0], 'https://api.github.com/repos/blacknode305/dashboardx');
});

test('GitHub errors become readable state', async () => {
  const widget = new GitHubControlWidget({fetchImpl: async()=>({ok:false,status:403})});
  assert.equal((await widget.refresh()).error, 'GitHub HTTP 403');
});
test('Server monitor reports successful response', async () => {
  const monitor = new ServerMonitorWidget({endpoint:'/health',fetchImpl:async()=>({ok:true,status:200})});
  assert.equal((await monitor.refresh()).status, 'online');
});
test('Server monitor rejects cross-origin endpoints', () => {
  assert.throws(()=>new ServerMonitorWidget({endpoint:'https://example.com'}));
});
