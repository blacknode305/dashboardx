import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

test('real-estate widget uses the short visible name, retaining its stable ID',async()=>{
  const template=await readFile(new URL('../client/_realtyRadar.html',import.meta.url),'utf8');
  const translations=await readFile(new URL('../client/js/module/i18n.js',import.meta.url),'utf8');
  const catalog=await readFile(new URL('../client/js/index.js',import.meta.url),'utf8');
  assert.match(template,/data-id="realtyRadar" data-category="tools" data-title="Недвижимость"/);
  assert.match(template,/<h2>Недвижимость<\/h2>/);
  assert.doesNotMatch(template,/REALTY RADAR|Недвижимость · Радар/);
  assert.equal((translations.match(/'widget\.realtyRadar':'Недвижимость'/g)||[]).length,3);
  assert.match(catalog,/realtyRadar:\s*\{category:'tools',\s*file:'_realtyRadar.html'\}/);
});
test('API is prepared but no credentials or deployment are hardcoded in widget',async()=>{
  const template=await readFile(new URL('../client/_realtyRadar.html',import.meta.url),'utf8');
  const controller=await readFile(new URL('../client/js/module/Widget/RealtyRadar.js',import.meta.url),'utf8');
  const backend=await readFile(new URL('../realty-search/server.mjs',import.meta.url),'utf8');
  assert.match(template,/Поисковый API ожидает подключения/);
  assert.match(template,/api\/realty\/feed\.json/);
  assert.match(controller,/if\(this\.feedUrl\)void this\.refresh\(false\)/);
  assert.match(backend,/DATAFORSEO_LOGIN/);
  assert.match(backend,/DATAFORSEO_PASSWORD/);
  assert.doesNotMatch(controller,/DATAFORSEO_PASSWORD/);
});
