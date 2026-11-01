import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {ECON_GROUPS,ECON_LESSONS,ECON_REFERENCES}
  from '../client/js/module/Widget/EconomicsCourseData.js';
import {STUDY_ARTICLES} from '../client/js/module/Widget/StudyArticlesData.js';
test('Economics has 32 exercises and correct choices in eight themes',()=>{
 assert.equal(ECON_GROUPS.length,8);
 assert.equal(ECON_LESSONS.length,32);
 assert.equal(new Set(ECON_LESSONS.map(lesson=>lesson.id)).size,32);
 for(const group of ECON_GROUPS)
   assert.equal(ECON_LESSONS.filter(x=>x.group===group.id).length,4,group.id);
 for(const lesson of ECON_LESSONS){
   assert.ok(lesson.explanation.length>=130,lesson.id);
   assert.ok(lesson.example.length>=70,lesson.id);
   assert.ok(lesson.practice.length>=55,lesson.id);
   assert.equal(lesson.quiz.options.length,3,lesson.id);
   assert.ok(Number.isInteger(lesson.quiz.answer)&&lesson.quiz.answer>=0&&lesson.quiz.answer<3,lesson.id);
 }
 assert.ok(ECON_REFERENCES.every(item=>item.url.startsWith('https://')));
});
test('Articles are curated original digests with exact primary links for all four courses',()=>{
 assert.equal(STUDY_ARTICLES.length,18);
 assert.equal(new Set(STUDY_ARTICLES.map(article=>article.id)).size,18);
 for(const [course,count] of [['psychology',4],['logic',4],['mimic',4],['economics',6]])
   assert.equal(STUDY_ARTICLES.filter(article=>article.course===course).length,count);
 for(const article of STUDY_ARTICLES){
   assert.match(article.url,/^https:\/\/(?:www\.)?(?:pubmed\.ncbi\.nlm\.nih\.gov|pmc\.ncbi\.nlm\.nih\.gov|psychologicalscience\.org|plato\.stanford\.edu|open\.umn\.edu|imf\.org|openstax\.org)\//);
   assert.equal(article.paragraphs.length,3);
   assert.ok(article.paragraphs.every(p=>p.length>=160),article.id);
   assert.equal(article.takeaways.length,3);
   assert.ok(article.task.length>=45,article.id);
 }
});
test('Study UI provides article reader, original source link, search and persisted progress',()=>{
 const base=new URL('../client/',import.meta.url);
 const js=readFileSync(new URL('js/module/Widget/StudyCourse.js',base),'utf8');
 const registry=readFileSync(new URL('js/module/WidgetLogic.js',base),'utf8');
 const index=readFileSync(new URL('js/index.js',base),'utf8');
 const styles=readFileSync(new URL('css/style.css',base),'utf8');
 for(const templateName of ['_psychology.html','_logic.html','_mimic.html','_economics.html']){
   const template=readFileSync(new URL(templateName,base),'utf8');
   assert.match(template,/data-course-tab="articles"/);
 }
 assert.match(js,/renderArticles\(\)/);
 assert.match(js,/filterArticles\(\)/);
 assert.match(js,/articleRead:\[\.\.\.this\.articleRead\]/);
 assert.match(js,/articleSaved:\[\.\.\.this\.articleSaved\]/);
 assert.match(js,/noopener noreferrer/);
 assert.match(registry,/EconomicsWidget:StudyCourseWidget/);
 assert.match(index,/economics:\s*\{category:'learning'/);
 assert.match(styles,/study-course\.css\?v=articles-economics/);
});
