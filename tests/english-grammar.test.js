import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source=readFileSync(new URL('../client/js/module/Widget/EnglishGrammarData.js',import.meta.url),'utf8');
const match=/export const GRAMMAR_GROUPS = Object\.freeze\(([\s\S]*?)\);\s*export const GRAMMAR_LESSONS/.exec(source);
assert.ok(match,'Grammar curriculum should contain a JSON-readable group array');
const groups=JSON.parse(match[1]);
const lessons=groups.flatMap(group=>group.lessons);

test('grammar guide covers A1 to C1 with complete lessons',()=>{
  assert.ok(groups.length>=10);
  assert.ok(lessons.length>=100);
  assert.equal(new Set(lessons.map(lesson=>lesson.id)).size,lessons.length);
  assert.deepEqual([...new Set(lessons.map(lesson=>lesson.level))].sort(),
    ['A1','A2','B1','B2','C1']);
  for(const lesson of lessons){
    for(const key of ['id','title','rule','formula','example','translation','mistake']){
      assert.ok(typeof lesson[key]==='string'&&lesson[key].trim(),lesson.id+' missing '+key);
    }
    assert.equal(lesson.quiz.options.length,3,lesson.id);
    assert.ok(lesson.quiz.options.every(option=>typeof option==='string'&&option.trim()),lesson.id);
    assert.ok(Number.isInteger(lesson.quiz.answer)&&lesson.quiz.answer>=0&&lesson.quiz.answer<3,lesson.id);
    assert.ok(lesson.quiz.question,lesson.id);
  }
});

test('learning widget is wired into catalog, template and module registry',()=>{
  const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
  assert.match(read('../client/js/index.js'),/englishLanguage:\s*\{category:'learning'/);
  assert.match(read('../client/js/module/WidgetLogic.js'),/EnglishLanguageWidget/);
  assert.match(read('../client/js/module/Widget\/Add.js'),/'learning'/);
  assert.match(read('../client/_englishLanguage.html'),/data-id="englishLanguage"/);
  assert.match(read('../client/css/style.css'),/english-language\.css/);
});

test('grammar progress lives in an instance-scoped widget state',()=>{
  const logic=readFileSync(new URL('../client/js/module/Widget/EnglishLanguage.js',import.meta.url),'utf8');
  assert.match(logic,/getWidgetState\(widget\.instanceId\)/);
  assert.match(logic,/updateWidgetState\(this\.widget\.instanceId/);
  assert.match(logic,/review-start/);
});


test('expanded guides cover all lessons with two translated examples each',()=>{
  const content=readFileSync(new URL('../client/js/module/Widget/EnglishGrammarExpanded.js',import.meta.url),'utf8');
  const match=/export const GRAMMAR_EXPANDED = Object\.freeze\(([\s\S]*?)\);\s*export const GRAMMAR_CHAPTER_GUIDES/.exec(content);
  assert.ok(match,'Expanded grammar JSON should be readable');
  const expanded=JSON.parse(match[1]);
  assert.deepEqual(Object.keys(expanded).sort(),lessons.map(item=>item.id).sort());
  for(const lesson of lessons){
    const item=expanded[lesson.id];
    assert.ok(item.usage.length>=25,lesson.id+' needs usage explanation');
    assert.equal(item.examples.length,2,lesson.id);
    for(const example of item.examples){
      assert.ok(example.english.trim(),lesson.id+' missing English example');
      assert.ok(example.russian.trim(),lesson.id+' missing Russian translation');
      assert.ok(example.english.split(/\s+/).length>=3,lesson.id+' example must be a phrase');
    }
  }
});

test('English practice includes sentence building and weakness reviews',()=>{
  const code=readFileSync(new URL('../client/js/module/Widget/EnglishLanguage.js',import.meta.url),'utf8');
  for(const expression of [/makeSentenceBuilder/,/checkBuilder/,/recordAttempt/,/review-mistakes/,/speechSynthesis/,/GRAMMAR_COMPARISONS/]){
    assert.match(code,expression);
  }
});
