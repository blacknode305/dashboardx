import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('existing dashboard widgets and new widgets remain registered', () => {
  const source=readFileSync(new URL('../client/js/index.js',import.meta.url),'utf8');
  const originals=['add','datetime','dayBalance','financeSummary','financeTable',
    'moneyConvertApi','binanceApi','calculator','wishlistPrice','wishlistGames',
    'audioPlayer','videoPlayer','serverConsole','telegramBot','dashboardSettings',
    'optimaSuppliers','optimaProducts','optimaProposals','optimaOffers',
    'optimaCompare','optimaStocks','optimaOrders','torrentTracker','nesEmulator'];
  for (const name of [...originals,'githubControl','serverMonitor','smartContacts','dashboardAi']) {
    assert.match(source,new RegExp('\\b'+name+'\\s*:\\s*\\{'),'Missing widget from catalog: '+name);
  }
});
test('all integration templates match their catalog ids', () => {
  for(const id of ['githubControl','serverMonitor','smartContacts','dashboardAi']){
    const html=readFileSync(new URL('../client/_'+id+'.html',import.meta.url),'utf8');
    assert.ok(html.includes('data-id="'+id+'"'));
    assert.ok(html.includes('data-widget'));
  }
});
test('base widget and registry both participate in lifecycle',()=>{
  const source=readFileSync(new URL('../client/js/module/WidgetElement.js',import.meta.url),'utf8');
  assert.match(source,/widgetRegistry\.register\(this\)/);
  assert.match(source,/widgetRegistry\.unregister\(this\)/);
});
