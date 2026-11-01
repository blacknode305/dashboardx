import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { READING_ESSAYS, READING_THEMES, readingPairForDay } from '../client/js/module/Widget/EnglishReadingData.js';

test('each daily reading is a substantial original English passage with comprehension',()=>{
  assert.equal(READING_THEMES.length,6);
  assert.equal(READING_ESSAYS.length,24);
  assert.equal(new Set(READING_ESSAYS.map(story=>story.id)).size,24);
  for(const story of READING_ESSAYS){
    assert.ok(story.paragraphs.length>=4,story.id);
    assert.ok(story.wordCount>=300&&story.wordCount<=400,story.id);
    assert.equal(story.wordCount,story.paragraphs.join(' ').trim().split(/\s+/).length,story.id);
    assert.ok(READING_THEMES.some(theme=>theme.id===story.theme),story.id);
    assert.ok(story.title&&story.question,story.id);
    assert.equal(story.options.length,3,story.id);
    assert.ok(story.options.every(value=>typeof value==='string'&&value.trim()),story.id);
    assert.ok(Number.isInteger(story.answer)&&story.answer>=0&&story.answer<3,story.id);
  }
});

test('two different readings are assigned consistently to each date and topic',()=>{
  const seen=new Set();
  const base=Date.parse('2026-11-01T00:00:00Z');
  for(let day=0;day<24;day++){
    const date=new Date(base+day*86400000).toISOString().slice(0,10);
    const [first,second]=readingPairForDay(date);
    assert.notEqual(first.id,second.id,date);
    assert.deepEqual(readingPairForDay(date).map(story=>story.id),[first.id,second.id]);
    seen.add(first.id+'|'+second.id);
    for(const theme of READING_THEMES){
      const themed=readingPairForDay(date,theme.id);
      assert.equal(themed.length,2);
      assert.ok(themed.every(story=>story.theme===theme.id));
      assert.notEqual(themed[0].id,themed[1].id);
    }
  }
  assert.equal(seen.size,24);
});

test('daily reading UI preserves own translation and provides speech controls',()=>{
  const base=new URL('../client/',import.meta.url);
  const controller=readFileSync(new URL('js/module/Widget/EnglishLanguage.js',base),'utf8');
  const template=readFileSync(new URL('_englishLanguage.html',base),'utf8');
  assert.match(template,/data-view="reading"/);
  assert.match(controller,/readingDrafts/);
  assert.match(controller,/data-role="reading-draft"/);
  assert.match(controller,/readingSpeechChunks/);
  assert.match(controller,/reading-play/);
  assert.match(controller,/reading-pause/);
  assert.match(controller,/reading-stop/);
  assert.match(controller,/reading-check/);
  assert.match(controller,/Asia\/Almaty|readingDayKey/);
});


test('reading popup recognizes common vocabulary and possible grammar patterns',async()=>{
  const {readingWordInfo,readingGrammarHint}=await import('../client/js/module/Widget/EnglishReadingInspector.js');
  assert.equal(readingWordInfo('went').lemma,'go');
  assert.equal(readingWordInfo('walking').lemma,'walk');
  assert.equal(readingWordInfo('walking').form,'V-ing');
  assert.equal(readingWordInfo('books').form,'множественное число');
  assert.ok(readingWordInfo('the').meaning);
  assert.equal(readingGrammarHint('has been studying').id,'perfect-cont');
  assert.equal(readingGrammarHint('was watching').id,'past-cont');
  assert.equal(readingGrammarHint('will have finished').id,'future-perfect');
  assert.equal(readingGrammarHint('When I was reading', 'When I was reading').id,'past-cont');
});

test('selected text is sent to translation service only by an explicit click',()=>{
  const source=readFileSync(new URL('../client/js/module/Widget/EnglishReadingInspector.js',import.meta.url),'utf8');
  assert.match(source,/target\.dataset\.inspect!=='translate'/);
  assert.match(source,/api\.mymemory\.translated\.net\/get/);
  assert.match(source,/data-inspect/);
  assert.match(source,/encodeURIComponent\(text\)/);
  assert.match(source,/this\.onGrammar\?\.\(/);
});
