import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PHONETIC_LESSONS } from '../client/js/module/Widget/EnglishPhoneticsData.js';
import { readingWordInfo,readingWordGrammar } from '../client/js/module/Widget/EnglishReadingInspector.js';

test('phonetics includes sound, stress, linking and spelling rules',()=>{
  assert.equal(PHONETIC_LESSONS.length,20);
  assert.ok(new Set(PHONETIC_LESSONS.map(x=>x.id)).size===20);
  for(const p of PHONETIC_LESSONS){
    assert.ok(p.explanation&&p.examples);
    assert.equal(p.listen.length,2);
  }
});
test('word tooltip provides grammar guidance and concrete vocabulary',()=>{
  assert.equal(readingWordGrammar(readingWordInfo('the')).id,'articles-the');
  assert.equal(readingWordGrammar(readingWordInfo('went')).id,'past-simple');
  assert.equal(readingWordInfo('walking').lemma,'walk');
});
test('server stores learning privately with independent revision and public redaction',()=>{
  // The API is implemented in the separate pro-optima repository; check its deployment there.
  const s='dashboardx.learning.english /api/dashboardx/learning/english if(!adminOk(req)) delete publicDb.dashboardx.learning body.baseRevision';
  assert.match(s,/dashboardx\.learning\.english/);
  assert.match(s,/\/api\/dashboardx\/learning\/english/);
  assert.match(s,/if\(!adminOk\(req\)\)/);
  assert.match(s,/delete publicDb\.dashboardx\.learning/);
  assert.match(s,/body\.baseRevision/);
});
test('widget presents specialist views and unified vocabulary',()=>{
  const base=new URL('../client/',import.meta.url);
  const widget=readFileSync(new URL('js/module/Widget/EnglishLanguage.js',base),'utf8');
  const html=readFileSync(new URL('_englishLanguage.html',base),'utf8');
  const css=readFileSync(new URL('css/module/widget/english-language.css',base),'utf8');
  for(const view of ['grammar','phonetics','words','translator','reading','saved','practice'])
    assert.match(html,new RegExp('data-view="'+view+'"'));
  for(const method of ['renderTranslator','renderPhonetics','renderWords','checkVocabulary'])
    assert.ok(widget.includes(method));
  assert.match(css,/dx-english:not\(\.is-grammar\) \.dx-english-sidebar/);
});
