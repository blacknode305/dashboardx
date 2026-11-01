import { MEMORY_GROUPS, MEMORY_LESSONS, MEMORY_REFERENCES } from './MemoryCourseData.js?v=study-course-20261101';
import { LOGIC_GROUPS, LOGIC_LESSONS, LOGIC_REFERENCES } from './LogicCourseData.js?v=study-course-20261101';
import { STUDY_EXTRA_MEMORY, STUDY_EXTRA_LOGIC, STUDY_GROUP_GUIDES } from './StudyExpandedData.js?v=study-expanded-20261101';
import { MIMIC_GROUPS,MIMIC_LESSONS,MIMIC_UNITS,MIMIC_SCENARIOS,MIMIC_REFERENCES } from './MimicCourseData.js?v=study-expanded-20261101';
import { createMimicFace } from './MimicFaceVisual.js?v=study-expanded-20261101';

const courseMap={
  psychology:{groups:MEMORY_GROUPS,lessons:MEMORY_LESSONS,refs:MEMORY_REFERENCES,extra:STUDY_EXTRA_MEMORY,guide:STUDY_GROUP_GUIDES.memory},
  logic:{groups:LOGIC_GROUPS,lessons:LOGIC_LESSONS,refs:LOGIC_REFERENCES,extra:STUDY_EXTRA_LOGIC,guide:STUDY_GROUP_GUIDES.logic},
  mimic:{groups:MIMIC_GROUPS,lessons:MIMIC_LESSONS,refs:MIMIC_REFERENCES,extra:[],guide:[]}
};
const studyWords=Object.freeze([
 'яблоко','мост','телескоп','кофейник','гора','монета','окно','пчела','ключ','книга',
 'лимон','компас','река','велосипед','облако','парус','скрипка','фонарь','карта','дерево',
 'перчатка','собака','самолёт','зонтик','радуга','карандаш','гитара','свеча','ромашка','часы',
 'лестница','колесо','арбуз','бабочка','чемодан','зеркало','магнит','чайник','башня','робот',
 'корабль','печенье','трамвай','апельсин','океан','барабан','луна','камень','трава','галактика',
 'сапог','плакат','кактус','кружка','библиотека','глобус','тигр','кольцо','тетрадь','планета'
]);
const make=(tag,cls='',value)=>{
 const element=document.createElement(tag);
 if(cls)element.className=cls;
 if(value!==undefined)element.textContent=String(value);
 return element;
};
const btn=(label,action,cls='')=>{
 const element=make('button',cls,label);element.type='button';
 if(action)element.dataset.courseAction=action;
 return element;
};
const normalize=value=>String(value||'').trim().toLocaleLowerCase('ru').replace(/ё/g,'е').replace(/[.,!?;:]/g,'');
export function scoreMemoryRecall(original,entered){
 const answer=String(entered||'').split(/[,\n;]+/).map(normalize).filter(Boolean);
 const target=original.map(normalize);
 let hits=0,ordered=0;
 const available=new Set(target),used=new Set();
 for(let index=0;index<answer.length;index++){
  const item=answer[index];
  if(available.has(item)&&!used.has(item)){hits++;used.add(item);}
  if(index<target.length&&item===target[index])ordered++;
 }
 return {found:hits,ordered,total:target.length,missing:original.filter(x=>!used.has(normalize(x))),entered:answer.length};
}
function shuffled(source){
 const out=[...source];
 for(let i=out.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[out[i],out[j]]=[out[j],out[i]];}
 return out;
}
export default class StudyCourseWidget{
 constructor(widget){
  this.widget=widget;this.root=widget.querySelector('.dx-study');
  this.type=widget.templateId;
  const cfg=courseMap[this.type];
  if(!cfg||!this.root)throw Error('Учебный курс не найден');
  this.groups=cfg.groups;this.lessons=cfg.lessons;this.references=cfg.refs;
  this.extra=cfg.extra;this.guides=cfg.guide;
  this.ids=new Set(this.lessons.map(x=>x.id));
  this.byId=new Map(this.lessons.map(x=>[x.id,x]));
  this.store=window.dashboardxStore;this.instanceId=widget.instanceId;
  const old=this.store?.getWidgetState(this.instanceId)?.studyCourse||{};
  this.completed=new Set((Array.isArray(old.completed)?old.completed:[]).filter(id=>this.ids.has(id)));
  this.bookmarks=new Set((Array.isArray(old.bookmarks)?old.bookmarks:[]).filter(id=>this.ids.has(id)));
  this.errors=Object.fromEntries(Object.entries(old.errors||{}).filter(([id,count])=>this.ids.has(id)&&Number.isInteger(count)&&count>0));
  this.active=this.ids.has(old.active)?old.active:this.lessons[0].id;
  this.view=['course','memory','practice','review','sources','lab','observations'].includes(old.view)?old.view:'course';
  if(this.type==='logic'&&['memory','lab','observations'].includes(this.view))this.view='course';
  if(this.type==='psychology'&&['practice','lab','observations'].includes(this.view))this.view='course';
  if(this.type==='mimic'&&['memory','practice'].includes(this.view))this.view='course';
  this.faceUnit=MIMIC_UNITS.some(x=>x.id===old.faceUnit)?old.faceUnit:'AU12';
  this.faceIndex=Math.max(0,Math.min(MIMIC_SCENARIOS.length-1,Number(old.faceIndex)||0));
  this.faceChoice=null;this.faceFeedback=null;
  const faceHistory=old.faceHistory||{};
  this.faceHistory={solved:Array.isArray(faceHistory.solved)?
      [...new Set(faceHistory.solved.filter(x=>Number.isInteger(x)&&x>=0&&x<MIMIC_SCENARIOS.length))]:[],
    attempts:Math.max(0,Number(faceHistory.attempts)||0),
    correct:Math.max(0,Number(faceHistory.correct)||0)};
  this.notes=Object.fromEntries(Object.entries(old.notes||{}).filter(([id,value])=>
    this.ids.has(id)&&typeof value==='string').map(([id,value])=>[id,value.slice(0,3000)]));
  this.stats={attempts:Math.max(0,Number(old.stats?.attempts)||0),
    perfect:Math.max(0,Number(old.stats?.perfect)||0),best:Math.max(0,Number(old.stats?.best)||0)};
  this.feedback=null;this.selectedChoice=null;this.review=null;
  this.round=null;this.timer=null;this.destroyed=false;
  this.search=this.root.querySelector('[data-role="course-search"]');
  this.sidebar=this.root.querySelector('[data-role="course-chapters"]');
  this.main=this.root.querySelector('[data-role="course-main"]');
  this.percent=this.root.querySelector('[data-role="course-percent"]');
  this.progress=this.root.querySelector('[data-role="course-progress"]');
  this.bar=this.root.querySelector('[data-role="course-progress-bar"]');
  this.searchChanged=()=>this.renderSidebar();
  this.noteChanged=event=>{
    const note=event.target.closest('[data-role="study-notes"]');
    if(!note||!this.main.contains(note))return;
    this.notes[this.active]=note.value.slice(0,3000);
    clearTimeout(this.noteTimer);
    this.noteTimer=setTimeout(()=>this.persist(),550);
  };
  this.clicked=event=>this.handleClick(event);
  this.submitted=event=>{
   if(event.target.matches('[data-role="memory-form"]')){event.preventDefault();this.checkMemory();}
  };
  this.search.addEventListener('input',this.searchChanged);
  this.root.addEventListener('click',this.clicked);
  this.root.addEventListener('submit',this.submitted);
  this.main.addEventListener('input',this.noteChanged);
  this.render();
 }
 persist(){
  this.store?.updateWidgetState(this.instanceId,{studyCourse:{
   completed:[...this.completed],bookmarks:[...this.bookmarks],errors:this.errors,
   active:this.active,view:this.view,stats:this.stats,
   notes:this.notes,faceUnit:this.faceUnit,faceIndex:this.faceIndex,faceHistory:this.faceHistory
  }});
 }
 handleClick(event){
  const tab=event.target.closest('[data-course-tab]');
  if(tab&&this.root.contains(tab)){
   const next=tab.dataset.courseTab;
   if(next===this.view)return;
   this.clearTimer();this.round=null;this.feedback=null;this.selectedChoice=null;this.review=null;
   this.faceChoice=null;this.faceFeedback=null;
   this.view=next;this.persist();this.render();return;
  }
  const jump=event.target.closest('[data-course-lesson]');
  if(jump&&this.root.contains(jump)){
   if(!this.ids.has(jump.dataset.courseLesson))return;
   this.active=jump.dataset.courseLesson;this.view='course';this.feedback=null;this.selectedChoice=null;
   this.persist();this.render();this.main.scrollTop=0;return;
  }
  const answer=event.target.closest('[data-course-answer]');
  if(answer&&this.main.contains(answer)){
   this.selectedChoice=Number(answer.dataset.courseAnswer);
   if(this.view==='review'&&this.review?.answered)return;
   this.feedback=null;this.renderContent(true);return;
  }
  const faceUnit=event.target.closest('[data-face-unit]');
  if(faceUnit&&this.type==='mimic'&&this.main.contains(faceUnit)){
    const id=faceUnit.dataset.faceUnit;
    if(MIMIC_UNITS.some(unit=>unit.id===id)){
      this.faceUnit=id;this.persist();this.renderContent(true);
    }
    return;
  }
  const faceChoice=event.target.closest('[data-face-choice]');
  if(faceChoice&&this.type==='mimic'&&this.main.contains(faceChoice)){
    if(!this.faceFeedback){
      this.faceChoice=Number(faceChoice.dataset.faceChoice);
      this.renderContent(true);
    }
    return;
  }
  const action=event.target.closest('[data-course-action]');
  if(!action||!this.root.contains(action))return;
  switch(action.dataset.courseAction){
   case 'face-check':this.checkFaceObservation();break;
   case 'face-next':this.faceIndex=(this.faceIndex+1)%MIMIC_SCENARIOS.length;
    this.faceChoice=null;this.faceFeedback=null;this.persist();this.renderContent(true);break;
   case 'face-restart':this.faceIndex=0;this.faceChoice=null;this.faceFeedback=null;
    this.persist();this.renderContent();break;
   case 'quiz-check':this.checkAnswer();break;
   case 'complete':this.completed.has(this.active)?this.completed.delete(this.active):this.completed.add(this.active);
    this.persist();this.render();break;
   case 'bookmark':this.bookmarks.has(this.active)?this.bookmarks.delete(this.active):this.bookmarks.add(this.active);
    this.persist();this.render();break;
   case 'previous':this.moveLesson(-1);break;
   case 'next':this.moveLesson(1);break;
   case 'review-start':this.startReview(false);break;
   case 'review-weak':this.startReview(true);break;
   case 'review-next':this.nextReview();break;
   case 'review-exit':this.review=null;this.feedback=null;this.renderContent();break;
   case 'memory-start':this.startMemory();break;
   case 'memory-hide':this.hideMemory();break;
   case 'memory-again':this.startMemory();break;
   case 'memory-check':this.checkMemory();break;
   case 'practice-start':this.startReview(false);break;
  }
 }
 moveLesson(delta){
  const index=this.lessons.findIndex(x=>x.id===this.active);
  const next=this.lessons[index+delta];
  if(!next)return;
  this.active=next.id;this.feedback=null;this.selectedChoice=null;
  this.persist();this.render();this.main.scrollTop=0;
 }
 render(){
  if(this.destroyed)return;
  this.root.classList.toggle('is-course',this.view==='course');
  this.root.querySelectorAll('[data-course-tab]').forEach(tab=>{
   tab.setAttribute('aria-pressed',String(tab.dataset.courseTab===this.view));
  });
  const count=this.completed.size,total=this.lessons.length;
  this.percent.textContent=Math.round(100*count/total)+'%';
  this.progress.textContent=count+' из '+total+' уроков';
  this.bar.style.width=Math.round(100*count/total)+'%';
  this.renderSidebar();
  this.renderContent();
 }
 renderSidebar(){
  const query=this.search.value.trim().toLocaleLowerCase('ru');
  this.sidebar.replaceChildren();let visible=0;
  for(const group of this.groups){
   const selected=this.lessons.filter(lesson=>lesson.group===group.id&&((
    lesson.title+' '+lesson.explanation+' '+group.title).toLocaleLowerCase('ru').includes(query)));
   if(!selected.length)continue;
   visible+=selected.length;
   const details=make('details','dx-study-group');
   details.open=Boolean(query)||selected.some(x=>x.id===this.active);
   const summary=make('summary');
   summary.append(make('span','',group.title),make('small','',selected.length));
   details.append(summary);
   for(const lesson of selected){
    const item=btn(lesson.title,null,'dx-study-lesson');
    item.dataset.courseLesson=lesson.id;
    item.classList.toggle('is-selected',lesson.id===this.active);
    const label=make('span','',lesson.title);
    const symbol=make('small','',this.completed.has(lesson.id)?'✓':this.errors[lesson.id]?'↻':this.bookmarks.has(lesson.id)?'★':'');
    item.replaceChildren(label,symbol);
    details.append(item);
   }
   this.sidebar.append(details);
  }
  if(!visible)this.sidebar.append(make('p','dx-study-subtle','По этому запросу уроков нет.'));
 }
 renderContent(keepScroll=false){
  const top=keepScroll?this.main.scrollTop:0;
  this.main.replaceChildren();
  if(this.view==='course')this.renderLesson();
  if(this.view==='memory')this.renderMemory();
  if(this.view==='practice'||this.view==='review')this.renderReview();
  if(this.view==='sources')this.renderSources();
  if(this.view==='lab')this.renderFaceLab();
  if(this.view==='observations')this.renderFaceObservations();
  if(keepScroll)this.main.scrollTop=top;
 }
 section(label,value,cls=''){
  const block=make('section','dx-study-panel '+cls);
  block.append(make('h4','',label),make('p','',value));
  return block;
 }
 renderLesson(){
  const lesson=this.byId.get(this.active),index=this.lessons.indexOf(lesson);
  const group=this.groups.find(x=>x.id===lesson.group);
  const page=make('article','dx-study-article');
  const meta=make('div','dx-study-meta');
  meta.append(make('span','dx-study-pill','Урок '+(index+1)+' / '+this.lessons.length),
   make('span','',group?.title||''));
  page.append(meta,make('h3','',lesson.title),
   this.section('Разбор',lesson.explanation),
   this.section('Пример с пояснением',lesson.example,'dx-study-example'));
  if(this.type==='mimic'){
    page.append(this.section('Понимание и границы применения',lesson.deepDive||'',
      'dx-study-deep'));
    page.append(this.section('Дополнительная ситуация',lesson.secondExample||'',
      'dx-study-example'));
    page.append(this.section('Не делайте такой вывод',lesson.pitfall||'',
      'dx-study-pitfall'));
  }else{
    const extra=this.extra[index]||[];
    const groupIndex=this.groups.findIndex(x=>x.id===lesson.group);
    const guide=this.guides[groupIndex]||[];
    if(guide.length){
      page.append(this.section('Глубже: как работает приём',guide[0],'dx-study-deep'));
      page.append(this.section('Как отработать технику',guide[1],'dx-study-activity'));
    }
    if(extra.length){
      const examples=make('section','dx-study-panel dx-study-multi-examples');
      examples.append(make('h4','','Ещё два разобранных примера'));
      const list=make('ol');
      list.append(make('li','',extra[0]),make('li','',extra[1]));
      examples.append(list);page.append(examples);
      page.append(this.section('Типичная ошибка',extra[2],'dx-study-pitfall'));
    }
    if(guide[2])page.append(make('p','dx-study-tip','Обратите внимание: '+guide[2]));
  }
  page.append(this.section('Практическое задание',lesson.practice,'dx-study-activity'));
  page.append(this.quiz(lesson));
  const notes=make('section','dx-study-panel dx-study-notes');
  notes.append(make('h4','','Мои заметки и собственный пример'),
    make('p','dx-study-subtle','Запишите пример из своей жизни. Текст сохраняется в браузере вместе с прогрессом.'));
  const textarea=make('textarea');
  textarea.dataset.role='study-notes';textarea.rows=4;textarea.maxLength=3000;
  textarea.placeholder='Мой пример, вывод, ассоциация или ошибка…';
  textarea.value=this.notes[lesson.id]||'';
  textarea.setAttribute('aria-label','Заметки к уроку');
  notes.append(textarea);page.append(notes);
  const actions=make('div','dx-study-actions');
  actions.append(btn(this.bookmarks.has(lesson.id)?'★ Избранное':'☆ В избранное','bookmark'),
   btn(this.completed.has(lesson.id)?'✓ Изучено · снять':'Отметить изученным','complete','dx-study-primary'));
  page.append(actions);
  const nav=make('div','dx-study-lesson-nav');
  const prev=btn('← Предыдущий','previous'),next=btn('Следующий →','next');
  prev.disabled=index===0;next.disabled=index===this.lessons.length-1;
  nav.append(prev,next);page.append(nav);
  this.main.append(page);
 }
 quiz(lesson,isReview=false){
  const quiz=make('section','dx-study-panel dx-study-quiz');
  quiz.append(make('small','dx-study-kicker',isReview?'Проверка знаний':'Контрольный вопрос'),
   make('h4','',lesson.quiz.question));
  const choices=make('div','dx-study-answers');
  lesson.quiz.options.forEach((option,index)=>{
   const button=btn(String.fromCharCode(65+index)+'. '+option,null,'dx-study-answer');
   button.dataset.courseAnswer=String(index);
   button.classList.toggle('is-chosen',index===this.selectedChoice);
   button.setAttribute('aria-pressed',String(index===this.selectedChoice));
   button.disabled=Boolean(isReview&&this.review?.answered);
   choices.append(button);
  });
  quiz.append(choices);
  if(this.feedback){
   const correct=this.feedback.correct;
   const result=make('div','dx-study-feedback '+(correct?'is-correct':'is-wrong'));
   result.setAttribute('role','status');
   result.append(make('strong','',correct?'✓ Верно':'Пока неверно'),
    make('p','',correct?lesson.quiz.feedback:
      'Правильный ответ: '+lesson.quiz.options[lesson.quiz.answer]+'. '+lesson.quiz.feedback));
   quiz.append(result);
  }
  const submit=btn('Проверить ответ','quiz-check','dx-study-primary');
  submit.disabled=this.selectedChoice===null||Boolean(isReview&&this.review?.answered);
  quiz.append(submit);
  return quiz;
 }
 checkAnswer(){
  const lesson=this.view==='course'?this.byId.get(this.active):this.currentReviewLesson();
  if(!lesson||this.selectedChoice===null)return;
  if(this.review?.answered&&this.view!=='course')return;
  const correct=this.selectedChoice===lesson.quiz.answer;
  this.feedback={correct};
  if(correct){
   this.completed.add(lesson.id);
   if(this.errors[lesson.id]){
    if(this.errors[lesson.id]>1)this.errors[lesson.id]--;
    else delete this.errors[lesson.id];
   }
  }else this.errors[lesson.id]=Math.min(9,(this.errors[lesson.id]||0)+1);
  if(this.view!=='course'&&this.review){
   this.review.answered=true;
   if(correct)this.review.score++;
  }
  this.persist();this.renderSidebar();
  this.renderContent(true);
  this.percent.textContent=Math.round(100*this.completed.size/this.lessons.length)+'%';
  this.progress.textContent=this.completed.size+' из '+this.lessons.length+' уроков';
  this.bar.style.width=Math.round(100*this.completed.size/this.lessons.length)+'%';
 }
 currentReviewLesson(){
  if(!this.review)return null;
  return this.byId.get(this.review.ids[this.review.index])||null;
 }
 startReview(weakOnly=false){
  const pool=this.lessons.filter(x=>!weakOnly||this.errors[x.id]>0);
  if(!pool.length){this.feedback=null;this.review=null;this.renderContent();return;}
  this.review={ids:shuffled(pool).slice(0,Math.min(10,pool.length)).map(x=>x.id),
   index:0,score:0,answered:false,weakOnly};
  this.selectedChoice=null;this.feedback=null;
  this.renderContent();
 }
 nextReview(){
  if(!this.review)return;
  this.review.index++;this.review.answered=false;
  this.selectedChoice=null;this.feedback=null;
  this.renderContent();
 }
 renderReview(){
  const page=make('section','dx-study-article');
  const weakCount=this.lessons.filter(x=>this.errors[x.id]>0).length;
  if(!this.review){
   page.append(make('span','dx-study-pill',this.type==='logic'?'Задачи по логике':'Повторение'),
    make('h3','',this.type==='logic'&&this.view==='practice'?'Тренировка выводов':'Проверка изученных тем'),
    make('p','dx-study-subtle','До 10 вопросов. Ошибки накапливаются для последующего повторения. Ответ разбирается сразу после проверки.'));
   const row=make('div','dx-study-actions');
   row.append(btn('Начать 10 вопросов',this.view==='practice'?'practice-start':'review-start','dx-study-primary'));
   const weak=btn('Повторить ошибки · '+weakCount,'review-weak');weak.disabled=!weakCount;
   row.append(weak);page.append(row);
   if(!weakCount)page.append(make('p','dx-study-subtle','Пока нет неверно решённых тем.'));
   this.main.append(page);return;
  }
  const round=this.review;
  if(round.index>=round.ids.length){
   page.append(make('span','dx-study-pill','Результат'),make('h3','',
      round.score+' из '+round.ids.length+' правильных ответов'));
   page.append(make('p','dx-study-subtle','Откройте повторение ошибок, чтобы разобрать сложные темы.'));
   const actions=make('div','dx-study-actions');
   actions.append(btn('Ещё вопросы','review-start','dx-study-primary'),btn('К выбору','review-exit'));
   page.append(actions);this.main.append(page);return;
  }
  const lesson=this.currentReviewLesson();
  page.append(make('span','dx-study-pill','Вопрос '+(round.index+1)+' / '+round.ids.length),
    make('h3','',lesson.title),this.quiz(lesson,true));
  if(round.answered)page.append(btn(round.index===round.ids.length-1?'Завершить':'Следующий вопрос →','review-next','dx-study-primary'));
  this.main.append(page);
 }
 clearTimer(){if(this.timer!==null){clearInterval(this.timer);this.timer=null;}}
 startMemory(){
  this.clearTimer();
  const count=Number(this.main.querySelector('[data-role="memory-count"]')?.value||8);
  const duration=Number(this.main.querySelector('[data-role="memory-time"]')?.value||30);
  const safeCount=[8,12,16].includes(count)?count:8;
  this.round={words:shuffled(studyWords).slice(0,safeCount),
    status:'study',seconds:[20,30,60].includes(duration)?duration:30,result:null};
  this.renderContent();
  this.timer=setInterval(()=>{
   if(this.destroyed||!this.round||this.round.status!=='study'){this.clearTimer();return}
   this.round.seconds--;
   const counter=this.main.querySelector('[data-role="memory-seconds"]');
   if(counter)counter.textContent=this.round.seconds+' с';
   if(this.round.seconds<=0)this.hideMemory();
  },1000);
 }
 hideMemory(){
  if(!this.round||this.round.status!=='study')return;
  this.clearTimer();this.round.status='recall';this.renderContent();
 }
 checkMemory(){
  if(!this.round||this.round.status!=='recall')return;
  const response=this.main.querySelector('[data-role="memory-response"]')?.value||'';
  this.round.result=scoreMemoryRecall(this.round.words,response);
  this.round.status='result';
  this.stats.attempts++;
  if(this.round.result.found===this.round.words.length)this.stats.perfect++;
  this.stats.best=Math.max(this.stats.best,this.round.result.found);
  this.persist();this.renderContent();
 }
 renderMemory(){
  const page=make('section','dx-study-article');
  page.append(make('span','dx-study-pill','Память · практика'),
   make('h3','','Запомните последовательность слов'),
   make('p','dx-study-subtle',
    'Изучайте слова, затем восстановите их без подсказок. Сначала используйте образы или маршрут локусов. Тренажёр измеряет результат конкретной попытки, а не интеллект.'));
  const stats=make('div','dx-study-stats');
  for(const [label,value] of [['Попыток',this.stats.attempts],['Идеальных',this.stats.perfect],['Лучший результат',this.stats.best+' слов']]){
   const cell=make('div','dx-study-stat');cell.append(make('strong','',value),make('span','',label));stats.append(cell);
  }
  page.append(stats);
  if(!this.round){
   const controls=make('div','dx-study-drill-options');
   const count=make('label');count.append(make('span','','Количество слов'));
   const select=make('select');select.dataset.role='memory-count';
   for(const value of [8,12,16])select.add(new Option(value+' слов',String(value)));
   count.append(select);
   const time=make('label');time.append(make('span','','Время на запоминание'));
   const duration=make('select');duration.dataset.role='memory-time';
   for(const value of [20,30,60])duration.add(new Option(value+' секунд',String(value)));
   duration.value='30';time.append(duration);
   controls.append(count,time);page.append(controls,
    btn('Начать запоминание','memory-start','dx-study-primary'));
  }else if(this.round.status==='study'){
   page.append(make('p','dx-study-timer','Осталось: '));
   const timer=page.querySelector('.dx-study-timer');
   const seconds=make('strong','',this.round.seconds+' с');seconds.dataset.role='memory-seconds';
   timer.append(seconds);
   const grid=make('ol','dx-study-word-grid');
   for(const word of this.round.words)grid.append(make('li','',word));
   page.append(grid,btn('Я запомнил · скрыть список','memory-hide','dx-study-primary'));
  }else if(this.round.status==='recall'){
   page.append(make('h4','','Восстановите слова по порядку'));
   const form=make('form','dx-study-memory-form');form.dataset.role='memory-form';
   const input=make('textarea');input.rows=6;input.dataset.role='memory-response';
   input.placeholder='Вводите по одному слову в строке или через запятую…';
   input.setAttribute('aria-label','Вспомните слова');
   form.append(input,btn('Проверить воспроизведение',null,'dx-study-primary'));
   form.lastChild.type='submit';form.append(make('small','dx-study-subtle',
    'Считаем правильные слова и отдельно точное расположение.'));
   page.append(form);
  }else{
   const result=this.round.result;
   page.append(make('h4','','Результат: '+result.found+' / '+result.total),
    make('p','dx-study-subtle','В правильном порядке: '+result.ordered+' / '+result.total));
   const details=make('div','dx-study-panel');
   details.append(make('h4','','Исходная последовательность'));
   details.append(make('p','',this.round.words.join(' → ')));
   if(result.missing.length)details.append(make('p','','Не вспомнились: '+result.missing.join(', ')));
   page.append(details,btn('Новая попытка','memory-again','dx-study-primary'));
  }
  this.main.append(page);
 }
 renderSources(){
  const page=make('section','dx-study-article');
  page.append(make('span','dx-study-pill','Методические материалы'),
   make('h3','','Научная основа и открытые учебники'));
  const note=this.type==='psychology'?
   'Мнемоники — стратегии запоминания; нет основания обещать фотографическую память или лечение заболеваний. Эффекты зависят от задачи, практики и качества исследований.':
   this.type==='mimic'?
   'Движения лица не являются диагнозом эмоций, намерений или правдивости человека. Важны слова, контекст, время движения и индивидуальные особенности.':
   'Логика помогает проверять форму рассуждений, но сама по себе не заменяет проверку фактов, статистики и источников.';
  page.append(make('p','dx-study-subtle',note));
  for(const item of this.references){
   const card=make('section','dx-study-panel');
   const link=make('a','dx-study-reference',item.title);
   link.href=item.url;link.target='_blank';link.rel='noopener noreferrer';
   card.append(link,make('p','',item.note));page.append(card);
  }
  this.main.append(page);
 }
 destroy(){
  this.destroyed=true;this.clearTimer();
  clearTimeout(this.noteTimer);this.persist();
  this.search?.removeEventListener('input',this.searchChanged);
  this.root?.removeEventListener('click',this.clicked);
  this.root?.removeEventListener('submit',this.submitted);
  this.main?.removeEventListener('input',this.noteChanged);
 }
}
