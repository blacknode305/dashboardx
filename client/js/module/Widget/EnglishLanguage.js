import { GRAMMAR_GROUPS, GRAMMAR_LESSONS, GRAMMAR_LEVELS } from './EnglishGrammarData.js?v=english-grammar-20261101';
import { GRAMMAR_EXPANDED, GRAMMAR_CHAPTER_GUIDES } from './EnglishGrammarExpanded.js?v=english-extended-20261101';

const byId=new Map(GRAMMAR_LESSONS.map(item=>[item.id,item]));
const make=(tag,className='',text='')=>{
  const el=document.createElement(tag);
  if(className)el.className=className;
  if(text!==undefined&&text!==null)el.textContent=String(text);
  return el;
};
const button=(text,action,className='')=>{
  const el=make('button',className,text);
  el.type='button';
  el.dataset.action=action;
  return el;
};
const section=(label,text,className='')=>{
  const wrap=make('section','dx-english-rule-block '+className);
  const head=make('h4','',label);
  const body=make('p','',text);
  wrap.append(head,body);
  return wrap;
};
const shuffle=items=>{
  const result=[...items];
  for(let i=result.length-1;i>0;i--){
    const j=Math.floor(Math.random()*(i+1));
    [result[i],result[j]]=[result[j],result[i]];
  }
  return result;
};
const normalizeSearch=value=>String(value||'').trim().toLocaleLowerCase('ru');

export default class EnglishLanguageWidget{
  constructor(widget){
    this.widget=widget;
    this.store=window.dashboardxStore;
    this.root=widget.querySelector('.dx-english');
    this.chapterList=this.root?.querySelector('[data-role="english-chapters"]');
    this.content=this.root?.querySelector('[data-role="english-content"]');
    this.search=this.root?.querySelector('[data-role="english-search"]');
    this.levelSelect=this.root?.querySelector('[data-role="english-level"]');
    if(!this.root||!this.content||!this.chapterList||!this.search||!this.levelSelect){
      throw Error('Не удалось загрузить шаблон «Английский язык». Обновите страницу.');
    }

    const old=this.store?.getWidgetState(widget.instanceId)?.englishGrammar||{};
    const validIds=new Set(byId.keys());
    this.done=new Set(Array.isArray(old.done)?old.done.filter(id=>validIds.has(id)):[]);
    this.bookmarks=new Set(Array.isArray(old.bookmarks)?old.bookmarks.filter(id=>validIds.has(id)):[]);
    this.weak=Object.fromEntries(Object.entries(old.weak||{})
      .filter(([id,count])=>validIds.has(id)&&Number.isInteger(count)&&count>0)
      .map(([id,count])=>[id,Math.min(5,count)]));
    this.selected=validIds.has(old.selected)?old.selected:GRAMMAR_LESSONS[0].id;
    this.view=['grammar','practice','saved'].includes(old.view)?old.view:'grammar';
    this.level=GRAMMAR_LEVELS.includes(old.level)?old.level:'all';
    this.searchTerm='';
    this.openGroups=new Set([byId.get(this.selected).groupId]);
    this.choice=null;
    this.feedback=null;
    this.review=null;
    this.builderSelected=[];
    this.builderFeedback=null;
    this.builderId=null;
    this.builderOrder=[];
    this.destroyed=false;

    this.onClick=event=>{
      const lesson=event.target.closest('[data-lesson]');
      if(lesson&&this.root.contains(lesson)){
        this.selectLesson(lesson.dataset.lesson);return;
      }
      const tab=event.target.closest('[data-view]');
      if(tab&&this.root.contains(tab)){
        this.view=tab.dataset.view;
        this.choice=null;this.feedback=null;
        this.persist();this.render();
        return;
      }
      const word=event.target.closest('[data-build-add]');
      if(word&&this.content.contains(word)){
        if(!this.builderFeedback?.correct){
          const index=Number(word.dataset.buildAdd);
          if(!this.builderSelected.includes(index))this.builderSelected.push(index);
          this.builderFeedback=null;this.renderContent(true);
        }
        return;
      }
      const used=event.target.closest('[data-build-remove]');
      if(used&&this.content.contains(used)){
        if(!this.builderFeedback?.correct){
          this.builderSelected.splice(Number(used.dataset.buildRemove),1);
          this.builderFeedback=null;this.renderContent(true);
        }
        return;
      }
      const speak=event.target.closest('[data-speak]');
      if(speak&&this.root.contains(speak)){
        this.speakEnglish(speak.dataset.speak);return;
      }
      const option=event.target.closest('[data-answer]');
      if(option&&this.content.contains(option)){
        if(this.view==='practice'&&this.review?.answered)return;
        if(this.view==='grammar'&&this.feedback?.correct)return;
        this.choice=Number(option.dataset.answer);
        this.feedback=null;
        this.renderContent(true);
        return;
      }
      const action=event.target.closest('[data-action]');
      if(!action||!this.root.contains(action))return;
      switch(action.dataset.action){
        case 'check': this.checkAnswer();break;
        case 'builder-check':this.checkBuilder();break;
        case 'builder-reset':
          this.builderSelected=[];this.builderFeedback=null;this.renderContent(true);break;
        case 'review-mistakes':this.startReview('weak');break;
        case 'prev':this.stepLesson(-1);break;
        case 'next':this.stepLesson(1);break;
        case 'bookmark':this.toggleBookmark();break;
        case 'done':this.toggleDone();break;
        case 'review-start':this.startReview();break;
        case 'review-next':this.advanceReview();break;
        case 'review-reset':this.startReview();break;
        case 'saved-open':
          this.view='grammar';this.render();break;
        default:break;
      }
    };
    this.onSearch=()=>{
      this.searchTerm=this.search.value;
      this.renderChapters();
    };
    this.onLevel=()=>{
      this.level=this.levelSelect.value;
      this.openGroups=new Set(GRAMMAR_GROUPS.map(group=>group.id));
      this.persist();this.renderChapters();
    };
    this.onChapterToggle=event=>{
      const group=event.target;
      if(!(group instanceof HTMLDetailsElement)||!group.dataset.groupId)return;
      if(group.open)this.openGroups.add(group.dataset.groupId);
      else this.openGroups.delete(group.dataset.groupId);
    };
    this.root.addEventListener('click',this.onClick);
    this.search.addEventListener('input',this.onSearch);
    this.levelSelect.addEventListener('change',this.onLevel);
    this.chapterList.addEventListener('toggle',this.onChapterToggle,true);
    this.levelSelect.value=this.level;
    this.render();
  }
  persist(){
    if(this.destroyed)return;
    this.store?.updateWidgetState(this.widget.instanceId,{
      englishGrammar:{
        schemaVersion:1,
        selected:this.selected,
        view:this.view,
        level:this.level,
        done:[...this.done],
        bookmarks:[...this.bookmarks],
        weak:this.weak
      }
    });
  }
  selectLesson(id){
    if(!byId.has(id))return;
    this.selected=id;
    this.view='grammar';
    this.choice=null;
    this.feedback=null;
    this.builderSelected=[];
    this.builderFeedback=null;
    this.builderId=null;
    this.openGroups.add(byId.get(id).groupId);
    this.persist();
    this.render();
    this.content.scrollTop=0;
  }
  stepLesson(delta){
    const index=GRAMMAR_LESSONS.findIndex(topic=>topic.id===this.selected);
    const next=GRAMMAR_LESSONS[index+delta];
    if(next){
      this.level='all';
      this.levelSelect.value='all';
      this.searchTerm='';
      this.search.value='';
      this.selectLesson(next.id);
    }
  }
  toggleBookmark(){
    if(this.bookmarks.has(this.selected))this.bookmarks.delete(this.selected);
    else this.bookmarks.add(this.selected);
    this.persist();this.render();
  }
  toggleDone(){
    if(this.done.has(this.selected))this.done.delete(this.selected);
    else this.done.add(this.selected);
    this.persist();this.render();
  }
  recordAttempt(id,correct){
    const previous=Number(this.weak[id]||0);
    if(correct){
      if(previous>1)this.weak[id]=previous-1;
      else delete this.weak[id];
    }else this.weak[id]=Math.min(5,previous+1);
    this.persist();
  }
  speakEnglish(sentence){
    if(!('speechSynthesis' in window)||typeof SpeechSynthesisUtterance!=='function'){
      this.speechStatus='Озвучивание недоступно в этом браузере.';
      this.renderContent(true);return;
    }
    window.speechSynthesis.cancel();
    const utterance=new SpeechSynthesisUtterance(sentence);
    utterance.lang='en-US';utterance.rate=.84;
    window.speechSynthesis.speak(utterance);
  }
  currentBuilder(){
    const topic=byId.get(this.selected)||GRAMMAR_LESSONS[0];
    const target=GRAMMAR_EXPANDED[topic.id]?.examples?.[0];
    if(!target)return null;
    if(this.builderId!==topic.id){
      this.builderId=topic.id;
      this.builderSelected=[];
      this.builderFeedback=null;
      const count=target.english.trim().split(/\s+/).length;
      this.builderOrder=shuffle([...Array(count).keys()]);
      if(this.builderOrder.every((index,i)=>index===i)&&count>1)this.builderOrder.reverse();
    }
    return target;
  }
  checkBuilder(){
    const target=this.currentBuilder();
    if(!target||this.builderFeedback?.correct)return;
    const words=target.english.trim().split(/\s+/);
    if(this.builderSelected.length!==words.length)return;
    const correct=this.builderSelected.every((value,index)=>value===index);
    this.builderFeedback={correct};
    this.recordAttempt(this.selected,correct);
    if(correct){
      this.done.add(this.selected);
      this.persist();this.renderProgress();this.renderChapters();
    }
    this.renderContent(true);
  }
  checkAnswer(){
    if(!Number.isInteger(this.choice)||this.choice<0||this.choice>2)return;
    const topic=this.view==='practice'&&this.review
      ?byId.get(this.review.ids[this.review.index]):byId.get(this.selected);
    if(!topic)return;
    if(this.view==='practice'&&this.review.answered)return;
    if(this.view==='grammar'&&this.feedback?.correct)return;
    const correct=this.choice===topic.quiz.answer;
    this.recordAttempt(topic.id,correct);
    this.feedback={correct,answer:topic.quiz.options[topic.quiz.answer],rule:topic.rule};
    if(this.view==='practice'&&this.review){
      this.review.answered=true;
      if(correct)this.review.score++;
    }
    if(correct){
      this.done.add(topic.id);
      this.persist();
      this.renderProgress();
      this.renderChapters();
    }
    this.renderContent(true);
  }
  startReview(mode='all'){
    const pool=GRAMMAR_LESSONS.filter(item=>
      (this.level==='all'||item.level===this.level)&&
      (mode!=='weak'||this.weak[item.id]>0));
    if(!pool.length)return;
    this.review={ids:shuffle(pool).slice(0,Math.min(10,pool.length)).map(topic=>topic.id),
      index:0,score:0,answered:false,mode};
    this.view='practice';
    this.choice=null;this.feedback=null;
    this.persist();this.render();
  }
  advanceReview(){
    if(!this.review?.answered)return;
    this.review.index++;
    this.review.answered=false;
    this.choice=null;this.feedback=null;
    this.renderContent();
    this.content.scrollTop=0;
  }
  render(){
    if(this.destroyed)return;
    this.root.querySelectorAll('[data-view]').forEach(tab=>{
      const chosen=tab.dataset.view===this.view;
      tab.setAttribute('aria-pressed',String(chosen));
      tab.classList.toggle('is-active',chosen);
    });
    this.renderProgress();
    this.renderChapters();
    this.renderContent();
  }
  renderProgress(){
    const complete=this.done.size,total=GRAMMAR_LESSONS.length;
    this.root.querySelector('[data-role="english-progress-number"]').textContent=
      Math.round(100*complete/total)+'%';
    this.root.querySelector('[data-role="english-progress-label"]').textContent=
      complete+' из '+total+' тем';
    this.root.querySelector('[data-role="english-progress-fill"]').style.width=
      (100*complete/total)+'%';
  }
  renderChapters(){
    const query=normalizeSearch(this.searchTerm);
    const result=document.createDocumentFragment();
    let any=false;
    for(const group of GRAMMAR_GROUPS){
      const visible=group.lessons.filter(item=>{
        const levelMatch=this.level==='all'||item.level===this.level;
        const text=normalizeSearch([item.title,item.rule,item.formula,group.title,item.level].join(' '));
        return levelMatch&&(!query||text.includes(query));
      });
      if(!visible.length)continue;
      any=true;
      const details=make('details','dx-english-chapter');
      details.dataset.groupId=group.id;
      details.open=Boolean(query)||this.openGroups.has(group.id);
      const heading=make('summary','dx-english-chapter-title');
      const title=make('span','',group.title);
      const count=make('small','',visible.filter(item=>this.done.has(item.id)).length+'/'+visible.length);
      heading.append(title,count);details.append(heading);
      const list=make('div','dx-english-topic-list');
      for(const item of visible){
        const row=button(item.title,'','dx-english-topic');
        row.removeAttribute('data-action');
        row.dataset.lesson=item.id;
        row.classList.toggle('is-current',this.view==='grammar'&&this.selected===item.id);
        row.setAttribute('aria-current',String(this.view==='grammar'&&this.selected===item.id));
        const level=make('small','',item.level);
        if(this.done.has(item.id))level.textContent='✓ '+item.level;
        if(this.bookmarks.has(item.id))level.textContent+=' ★';
        row.prepend(level);
        list.append(row);
      }
      details.append(list);result.append(details);
    }
    if(!any)result.append(make('p','dx-english-empty','По запросу ничего не найдено. Измените поиск или уровень.'));
    this.chapterList.replaceChildren(result);
  }
  renderContent(keepScroll=false){
    if(this.destroyed)return;
    const previousScroll=keepScroll?this.content.scrollTop:0;
    this.content.replaceChildren();
    if(this.view==='practice')this.renderReview();
    else if(this.view==='saved')this.renderSaved();
    else this.renderLesson();
    this.content.scrollTop=previousScroll;
  }
  renderLesson(){
    const topic=byId.get(this.selected)||GRAMMAR_LESSONS[0];
    const position=GRAMMAR_LESSONS.findIndex(item=>item.id===topic.id);
    const frame=make('article','dx-english-lesson');
    const meta=make('div','dx-english-lesson-meta');
    meta.append(make('span','dx-english-chip',topic.level),
      make('span','',topic.groupTitle),
      make('span','',String(position+1)+' / '+GRAMMAR_LESSONS.length));
    const title=make('h3','',topic.title);
    frame.append(meta,title);
    frame.append(section('Правило',topic.rule));
    frame.append(section('Формула',topic.formula,'dx-english-formula'));
    const example=make('section','dx-english-rule-block dx-english-example');
    example.append(make('h4','','Пример'),
      make('p','dx-english-example-en',topic.example),
      make('p','dx-english-translation',topic.translation));
    frame.append(example,section('Обрати внимание',topic.mistake,'dx-english-pitfall'));

    const actions=make('div','dx-english-lesson-actions');
    const bookmark=button(this.bookmarks.has(topic.id)?'★ В избранном':'☆ В избранное','bookmark');
    bookmark.setAttribute('aria-pressed',String(this.bookmarks.has(topic.id)));
    const done=button(this.done.has(topic.id)?'✓ Изучено':'Отметить изученным','done');
    done.setAttribute('aria-pressed',String(this.done.has(topic.id)));
    actions.append(bookmark,done);frame.append(actions);

    frame.append(this.makeQuiz(topic));
    const navigation=make('nav','dx-english-lesson-nav');
    const back=button('← Предыдущая','prev');back.disabled=position===0;
    const next=button('Следующая →','next');next.disabled=position===GRAMMAR_LESSONS.length-1;
    navigation.append(back,next);frame.append(navigation);
    this.content.append(frame);
  }
  makeQuiz(topic){
    const quiz=make('section','dx-english-quiz');
    quiz.append(make('span','dx-english-quiz-tag','Проверка знаний'),
      make('h4','',topic.quiz.question));
    const choices=make('div','dx-english-options');
    topic.quiz.options.forEach((option,index)=>{
      const answer=button(option,'','dx-english-option');
      answer.removeAttribute('data-action');
      answer.dataset.answer=String(index);
      const selected=this.choice===index;
      answer.classList.toggle('is-selected',selected);
      answer.setAttribute('aria-pressed',String(selected));
      if(this.feedback?.correct||this.view==='practice'&&this.review?.answered){
        answer.disabled=true;
        answer.classList.toggle('is-correct',index===topic.quiz.answer);
        answer.classList.toggle('is-wrong',selected&&!this.feedback?.correct);
      }
      choices.append(answer);
    });
    quiz.append(choices);
    if(this.feedback){
      const feedback=make('div','dx-english-feedback '+(this.feedback.correct?'is-success':'is-error'));
      feedback.setAttribute('role','status');
      const heading=this.feedback.correct?'Верно! Тема засчитана.':'Пока неверно. Попробуйте ещё раз.';
      feedback.append(make('strong','',heading));
      feedback.append(make('p','',
        this.feedback.correct?this.feedback.rule:'Подсказка: '+this.feedback.rule));
      quiz.append(feedback);
    }
    const actions=make('div','dx-english-quiz-actions');
    if(!this.feedback?.correct&&!(this.view==='practice'&&this.review?.answered)){
      const check=button('Проверить ответ','check','dx-english-primary');
      check.disabled=this.choice===null;
      actions.append(check);
    }
    if(this.view==='practice'&&this.review?.answered){
      const isLast=this.review.index===this.review.ids.length-1;
      actions.append(button(isLast?'Посмотреть результат':'Следующий вопрос →','review-next','dx-english-primary'));
    }
    quiz.append(actions);
    return quiz;
  }
  renderReview(){
    const block=make('section','dx-english-lesson dx-english-review');
    if(!this.review){
      block.append(make('span','dx-english-chip','Тренировка'),
        make('h3','','Повторение грамматики'));
      block.append(make('p','dx-english-intro',
        '10 случайных вопросов по правилам выбранного уровня. После каждого ответа показывается объяснение. Правильно решённые темы отмечаются как изученные.'));
      block.append(make('p','dx-english-mini','Выбранный уровень: '+(this.level==='all'?'все уровни':this.level)));
      block.append(button('Начать тренировку','review-start','dx-english-primary'));
      this.content.append(block);return;
    }
    if(this.review.index>=this.review.ids.length){
      block.append(make('span','dx-english-chip','Тренировка завершена'),
        make('h3','','Результат: '+this.review.score+' из '+this.review.ids.length));
      block.append(make('p','dx-english-intro',
        'Правильные ответы засчитаны в прогресс грамматики. Повторите темы, в которых ещё не уверены.'));
      block.append(button('Ещё 10 вопросов','review-reset','dx-english-primary'));
      this.content.append(block);return;
    }
    const topic=byId.get(this.review.ids[this.review.index]);
    if(!topic)return;
    const progress=make('div','dx-english-lesson-meta');
    progress.append(make('span','dx-english-chip',topic.level),
      make('span','',topic.groupTitle),
      make('span','',String(this.review.index+1)+' из '+this.review.ids.length));
    block.append(progress,make('h3','',topic.title));
    block.append(this.makeQuiz(topic));
    const tally=make('p','dx-english-mini','Верных ответов: '+this.review.score);
    block.append(tally);
    this.content.append(block);
  }
  renderSaved(){
    const frame=make('section','dx-english-lesson');
    frame.append(make('span','dx-english-chip','Личный список'),
      make('h3','','Избранные правила'));
    const saved=GRAMMAR_LESSONS.filter(item=>this.bookmarks.has(item.id));
    frame.append(make('p','dx-english-intro',
      saved.length?'Сохранено тем: '+saved.length+'. Нажмите на тему, чтобы продолжить изучение.':
        'Пока ничего не добавлено. Откройте тему в разделе «Грамматика» и нажмите ☆ В избранное.'));
    const list=make('div','dx-english-saved-list');
    for(const item of saved){
      const row=button(item.title,'','dx-english-saved-item');
      row.removeAttribute('data-action');row.dataset.lesson=item.id;
      row.append(make('small','',item.level+' · '+item.groupTitle+
        (this.done.has(item.id)?' · ✓ изучено':'')));
      list.append(row);
    }
    frame.append(list);this.content.append(frame);
  }
  destroy(){
    this.destroyed=true;
    this.root?.removeEventListener('click',this.onClick);
    this.search?.removeEventListener('input',this.onSearch);
    this.levelSelect?.removeEventListener('change',this.onLevel);
    this.chapterList?.removeEventListener('toggle',this.onChapterToggle,true);
  }
}
