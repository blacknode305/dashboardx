import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {MIMIC_LESSONS,MIMIC_GROUPS} from '../client/js/module/Widget/MimicCourseData.js';
import {SOCIAL_LESSONS,SOCIAL_GROUPS,SOCIAL_SCENARIOS,SOCIAL_REFERENCES}
 from '../client/js/module/Widget/SocialSignalsData.js';

test('Mimic retains 28 FACS lessons and adds 20 lessons in four new social groups',()=>{
 assert.equal(MIMIC_LESSONS.length,28);
 assert.equal(SOCIAL_LESSONS.length,20);
 assert.equal(MIMIC_GROUPS.length,7);
 assert.equal(SOCIAL_GROUPS.length,4);
 assert.equal(new Set([...MIMIC_LESSONS,...SOCIAL_LESSONS].map(x=>x.id)).size,48);
 for(const group of SOCIAL_GROUPS){
  assert.equal(SOCIAL_LESSONS.filter(x=>x.group===group.id).length,5);
  assert.equal(SOCIAL_SCENARIOS.filter(x=>x.group===group.id).length,5);
 }
});
test('Each social lesson explains limits, real dialogues, alternatives and self-check',()=>{
 assert.equal(SOCIAL_SCENARIOS.length,20);
 for(const lesson of SOCIAL_LESSONS){
  assert.ok(lesson.explanation.length>=110,lesson.id);
  assert.ok(lesson.example.length>=60,lesson.id);
  assert.ok(lesson.deepDive.length>=70,lesson.id);
  assert.ok(lesson.pitfall.length>=55,lesson.id);
  assert.equal(lesson.quiz.options.length,3,lesson.id);
  assert.ok(Number.isInteger(lesson.quiz.answer)&&lesson.quiz.answer>=0&&lesson.quiz.answer<3,lesson.id);
  assert.ok(lesson.practice.length>=70,lesson.id);
 }
 for(const scene of SOCIAL_SCENARIOS){
  assert.equal(scene.options.length,3,scene.id);
  assert.ok(Number.isInteger(scene.answer)&&scene.answer>=0&&scene.answer<=2);
  assert.ok(scene.rationale.length>=95,scene.id);
  assert.ok(scene.response.length>40,scene.id);
 }
 assert.ok(SOCIAL_REFERENCES.some(x=>x.url.includes('30609913')));
 assert.ok(SOCIAL_REFERENCES.every(x=>x.url.startsWith('https://')));
});
test('Mimic interface exposes social training and local progress without resetting old lessons',()=>{
 const base=new URL('../client/',import.meta.url);
 const html=readFileSync(new URL('_mimic.html',base),'utf8');
 const js=readFileSync(new URL('js/module/Widget/StudyCourse.js',base),'utf8');
 const style=readFileSync(new URL('css/module/widget/study-course.css',base),'utf8');
 assert.match(html,/0 из 48 уроков/);
 assert.match(html,/data-course-tab="social"/);
 assert.match(html,/data-course-tab="lab"/);
 assert.match(html,/data-course-tab="observations"/);
 assert.match(js,/lessons:\[\.\.\.MIMIC_LESSONS,\.\.\.SOCIAL_LESSONS\]/);
 assert.match(js,/checkSocialScenario\(\)/);
 assert.match(js,/renderSocialScenarios\(\)/);
 assert.match(js,/socialState:\{index:this\.socialIndex/);
 assert.match(style,/dx-study-social-topics/);
});
