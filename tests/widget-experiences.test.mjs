import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const src=name=>readFileSync(new URL('../'+name,import.meta.url),'utf8');
const userTypes=['audioPlayer','videoPlayer','telegramBot','serverConsole',
 'wishlistPrice','wishlistGames','torrentTracker','nesEmulator','calculator','binanceApi','datetime'];
test('all interactive native widget templates have the correct IDs',()=>{
 for(const id of userTypes){
  const template=src('client/_'+id+'.html');
  assert.match(template,new RegExp('data-widget[\\s\\S]{0,120}data-id="'+id+'"'),'Widget template ID: '+id);
 }
});
test('native widgets are in catalog without server-only fallback',()=>{
 const catalog=src('client/js/index.js');
 for(const id of userTypes){
  const line=catalog.split('\n').find(x=>new RegExp('^\\s*'+id+':').test(x));
  assert.ok(line,'Catalog entry '+id);
  assert.doesNotMatch(line,/serverOnly:\s*true/,id);
 }
});
test('all actual widget controllers are registered',()=>{
 const logic=src('client/js/module/WidgetLogic.js');
 for(const m of ['NesEmulatorWidget','TelegramBotWidget','CalculatorWidget',
  'BinanceApiWidget','DatetimeWidget','FinanceTableWidget','ServerConsoleWidget']){
  assert.match(logic,new RegExp('\\b'+m+'\\b'));
 }
 assert.match(logic,/WishlistGamesWidget:\s*LocalCollectionWidget/);
 assert.match(logic,/WishlistPriceWidget:\s*LocalCollectionWidget/);
 assert.match(logic,/TorrentTrackerWidget:\s*LocalCollectionWidget/);
 assert.match(logic,/AudioPlayerWidget:\s*MediaPlayerWidget/);
 assert.match(logic,/VideoPlayerWidget:\s*MediaPlayerWidget/);
});
test('NES hotkeys, state and scoping are present',()=>{
 const game=src('client/js/module/Widget/NesEmulator.js');
 for(const shortcut of ['KeyZ','KeyX','ArrowLeft','Enter','ShiftRight','KeyP','KeyR','KeyM','F5','F9']){
  assert.ok(game.includes(shortcut),'Missing NES keyboard control '+shortcut);
 }
 assert.match(game,/isTyping\(e.target\)/);
 assert.match(game,/this\.widget\.classList\.contains\('is-focus'\)/);
 assert.match(game,/this\.nes\.fromJSON\(/);
 assert.match(game,/this\.nes\.toJSON\(/);
 assert.match(game,/destroy\(\)/);
});
test('settings and optima data untouched by the native widget suite',()=>{
 const css=src('client/css/widget-experiences.css');
 assert.doesNotMatch(css,/optima-stock|optima-order|optima-supplier|optima-data/);
 assert.match(src('index.html'),/widget-experiences\.css/);
 const telegram=src('client/js/module/Widget/TelegramBot.js');
 assert.doesNotMatch(telegram,/getCredential|\/bot\$\{/);
});
