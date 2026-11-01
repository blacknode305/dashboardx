import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {MEMORY_LESSONS,MEMORY_GROUPS,MEMORY_REFERENCES} from '../client/js/module/Widget/MemoryCourseData.js';
import {LOGIC_LESSONS,LOGIC_GROUPS,LOGIC_REFERENCES} from '../client/js/module/Widget/LogicCourseData.js';
import {scoreMemoryRecall} from '../client/js/module/Widget/StudyCourse.js';

for(const [type,groups,lessons,refs] of [
 ['Мнемоника',MEMORY_GROUPS,MEMORY_LESSONS,MEMORY_REFERENCES],
 ['Логика',LOGIC_GROUPS,LOGIC_LESSONS,LOGIC_REFERENCES]
]){
 test(type+' includes an ordered, detailed curriculum with self-checks',()=>{
  assert.equal(groups.length,8);
  assert.equal(lessons.length,32);
  assert.equal(new Set(lessons.map(x=>x.id)).size,32);
  for(const group of groups)assert.ok(lessons.filter(x=>x.group===group.id).length>=3,
    'Empty curriculum group '+group.id);
  for(const lesson of lessons){
   assert.ok(lesson.title.length>=5,lesson.id);
   assert.ok(lesson.explanation.length>=60,lesson.id+' missing substantial explanation');
   assert.ok(lesson.example.length>=30,lesson.id+' missing worked example');
   assert.ok(lesson.practice.length>=25,lesson.id+' missing active exercise');
   assert.equal(lesson.quiz.options.length,3,lesson.id);
   assert.ok(Number.isInteger(lesson.quiz.answer)&&lesson.quiz.answer>=0&&lesson.quiz.answer<3);
   assert.ok(lesson.quiz.question.length>10,lesson.id);
   assert.ok(lesson.quiz.feedback.length>30,lesson.id);
  }
  assert.ok(refs.length>=2);
  assert.ok(refs.every(x=>x.url.startsWith('https://')));
 });
}

test('memory drill scores uniqueness and order separately',()=>{
 const target=['яблоко','кофе','гора','лимон'];
 assert.deepEqual(scoreMemoryRecall(target,'яблоко, кофе, гора, лимон'),{
  found:4,ordered:4,total:4,missing:[],entered:4
 });
 const result=scoreMemoryRecall(target,'гора, кофе, кофе, яблоко');
 assert.equal(result.found,3);
 assert.equal(result.ordered,1);
 assert.deepEqual(result.missing,['лимон']);
 assert.equal(scoreMemoryRecall(target,'Ёлка, яблоко').found,1);
});

test('study widgets are in Learning category and wired to one controller',()=>{
 const base=new URL('../client/',import.meta.url);
 const index=readFileSync(new URL('js/index.js',base),'utf8');
 const logic=readFileSync(new URL('js/module/WidgetLogic.js',base),'utf8');
 const css=readFileSync(new URL('css/style.css',base),'utf8');
 for(const [type,html] of [['psychology','_psychology.html'],['logic','_logic.html']]){
  const template=readFileSync(new URL(html,base),'utf8');
  assert.match(template,new RegExp('data-id="'+type+'"'));
  assert.match(template,/data-course-tab="course"/);
  assert.match(template,/data-course-tab="review"/);
  assert.match(index,new RegExp(type+':\\s*\\{category:\\x27learning\\x27'));
 }
 assert.match(logic,/PsychologyWidget:StudyCourseWidget/);
 assert.match(logic,/LogicWidget:StudyCourseWidget/);
 assert.match(css,/study-course\.css/);
});

test('Add Widget search filters names and category without affecting instances',()=>{
 const base=new URL('../client/',import.meta.url);
 const template=readFileSync(new URL('_add.html',base),'utf8');
 const controller=readFileSync(new URL('js/module/Widget/Add.js',base),'utf8');
 const css=readFileSync(new URL('css/style.css',base),'utf8');
 assert.match(template,/data-role="widget-search"/);
 assert.match(controller,/filterTypes\(\)/);
 assert.match(controller,/dataset\.searchText/);
 assert.match(controller,/dataset\.searchLabel/);
 assert.match(controller,/Ничего не найдено/);
 assert.match(css,/dx-picker-group\[hidden\]/);
});
