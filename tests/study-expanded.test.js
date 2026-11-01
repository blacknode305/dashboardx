import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {MEMORY_LESSONS} from '../client/js/module/Widget/MemoryCourseData.js';
import {LOGIC_LESSONS} from '../client/js/module/Widget/LogicCourseData.js';
import {STUDY_EXTRA_MEMORY,STUDY_EXTRA_LOGIC,STUDY_GROUP_GUIDES} from '../client/js/module/Widget/StudyExpandedData.js';
import {MIMIC_LESSONS,MIMIC_GROUPS,MIMIC_UNITS,MIMIC_SCENARIOS,MIMIC_REFERENCES}
  from '../client/js/module/Widget/MimicCourseData.js';

test('Mnemonics and Logic keep 32 lessons each and gain 2 specific examples and a common mistake per lesson',()=>{
  for(const [lessons,extras] of [[MEMORY_LESSONS,STUDY_EXTRA_MEMORY],[LOGIC_LESSONS,STUDY_EXTRA_LOGIC]]){
    assert.equal(lessons.length,32);
    assert.equal(extras.length,lessons.length);
    for(const [i,entry] of extras.entries()){
      assert.equal(entry.length,3,lessons[i].id);
      for(const part of entry)assert.ok(part.length>=55,lessons[i].id);
    }
  }
  for(const course of Object.values(STUDY_GROUP_GUIDES)){
    assert.equal(course.length,8);
    for(const group of course)assert.equal(group.length,3);
  }
});

test('Mimic curriculum teaches observational AU descriptions rather than diagnosing emotion',()=>{
  assert.equal(MIMIC_LESSONS.length,28);
  assert.equal(MIMIC_GROUPS.length,7);
  assert.equal(new Set(MIMIC_LESSONS.map(item=>item.id)).size,MIMIC_LESSONS.length);
  assert.equal(MIMIC_UNITS.length,12);
  assert.equal(new Set(MIMIC_UNITS.map(item=>item.id)).size,MIMIC_UNITS.length);
  assert.equal(MIMIC_SCENARIOS.length,16);
  assert.ok(MIMIC_REFERENCES.some(item=>item.url.includes('PMC6640856')));
  assert.ok(MIMIC_REFERENCES.some(item=>item.url.includes('PMC7767987')));
  for(const lesson of MIMIC_LESSONS){
    assert.ok(lesson.explanation.length>=105,lesson.id);
    assert.ok(lesson.example.length>=65,lesson.id);
    assert.ok(lesson.secondExample.length>=50,lesson.id);
    assert.ok(lesson.pitfall.length>=50,lesson.id);
    assert.equal(lesson.quiz.options.length,3);
    assert.ok(lesson.quiz.answer>=0&&lesson.quiz.answer<=2);
  }
  for(const scenario of MIMIC_SCENARIOS){
    assert.ok(MIMIC_UNITS.some(item=>item.id===scenario.unit));
    assert.equal(scenario.options.length,3);
    assert.ok(Number.isInteger(scenario.answer)&&scenario.answer>=0&&scenario.answer<3);
    assert.ok(scenario.explanation.length>35);
  }
});

test('Mimic and Mnemonics titles and existing progress keys remain compatible',()=>{
  const base=new URL('../client/',import.meta.url);
  const html=readFileSync(new URL('_psychology.html',base),'utf8');
  const mimic=readFileSync(new URL('_mimic.html',base),'utf8');
  const registry=readFileSync(new URL('js/module/WidgetLogic.js',base),'utf8');
  const catalog=readFileSync(new URL('js/index.js',base),'utf8');
  const logic=readFileSync(new URL('js/module/Widget/StudyCourse.js',base),'utf8');
  const stylesheet=readFileSync(new URL('css/module/widget/study-course.css',base),'utf8');
  assert.match(html,/data-id="psychology"/); // existing instance data is preserved
  assert.match(html,/data-title="Мнемоника"/);
  assert.match(mimic,/data-id="mimic"/);
  for(const view of ['course','lab','observations','review','sources'])
    assert.match(mimic,new RegExp('data-course-tab="'+view+'"'));
  assert.match(registry,/MimicWidget:StudyCourseWidget/);
  assert.match(catalog,/mimic:\s*\{category:'learning'/);
  assert.match(logic,/renderFaceLab\(\)/);
  assert.match(logic,/renderFaceObservations\(\)/);
  assert.match(logic,/checkFaceObservation\(\)/);
  assert.match(logic,/notes:this\.notes/);
  assert.match(stylesheet,/dx-face-lab-layout/);
});
