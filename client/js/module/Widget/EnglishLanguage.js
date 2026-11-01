import { GRAMMAR_GROUPS, GRAMMAR_LESSONS, GRAMMAR_LEVELS } from './EnglishGrammarData.js?v=english-grammar-20261101';
import { GRAMMAR_EXPANDED, GRAMMAR_CHAPTER_GUIDES, GRAMMAR_COMPARISONS } from './EnglishGrammarExpanded.js?v=english-extended-20261101';
import { READING_THEMES, READING_ESSAYS, readingDayKey, readingPairForDay } from './EnglishReadingData.js?v=daily-reading-20261101';

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
    this.view=['grammar','practice','saved','reading'].includes(old.view)?old.view:'grammar';
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
    this.readingTheme=['all',...READING_THEMES.map(item=>item.id)].includes(old.readingTheme)?old.readingTheme:'all';
    this.readingDrafts=Object.fromEntries(Object.entries(old.readingDrafts||{})
      .filter(([id,value])=>READING_ESSAYS.some(item=>item.id===id)&&typeof value==='string')
      .map(([id,value])=>[id,value.slice(0,7000)]));
    this.readingDone=new Set(Array.isArray(old.readingDone)?old.readingDone.filter(
      id=>READING_ESSAYS.some(item=>item.id===id)):[]);
    this.readingChecks=Object.fromEntries(Object.entries(old.readingChecks||{})
      .filter(([id,value])=>READING_ESSAYS.some(item=>item.id===id)&&
        (value===true||value===false)));
    this.readingIndex=0;
    this.readingDate=readingDayKey();
    this.readingRate=.9;
    this.readingAnswer=null;
    this.readingFeedback=null;
    this.readingAudio=null;
    this.readingSpeechToken=0;
    this.readingAudioStatus='';
    this.destroyed=false;

    this.onClick=event=>{
      const lesson=event.target.closest('[data-lesson]');
      if(lesson&&this.root.contains(lesson)){
        this.selectLesson(lesson.dataset.lesson);return;
      }
      const tab=event.target.closest('[data-view]');
      if(tab&&this.root.contains(tab)){
        if(this.view==='reading'&&tab.dataset.view!=='reading')this.stopReading();
        this.view=tab.dataset.view;
        this.choice=null;this.feedback=null;
        this.persist();this.render();
        return;
      }
      const story=event.target.closest('[data-reading-story]');
      if(story&&this.content.contains(story)){
        const list=this.dailyReadings();
        const index=list.findIndex(item=>item.id===story.dataset.readingStory);
        if(index>=0){
          this.stopReading();this.readingIndex=index;this.readingAnswer=null;
          this.readingFeedback=null;this.renderContent();
        }
        return;
      }
      const readOption=event.target.closest('[data-reading-answer]');
      if(readOption&&this.view==='reading'&&this.content.contains(readOption)){
        this.readingAnswer=Number(readOption.dataset.readingAnswer);
        this.readingFeedback=null;
        this.renderContent(true);
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
        case 'reading-play':this.playReading();break;
        case 'reading-pause':this.pauseReading();break;
        case 'reading-stop':this.stopReading();break;
        case 'reading-check':this.checkReadingAnswer();break;
        case 'reading-done':this.toggleReadingDone();break;
        case 'check': this.checkAnswer();break;
        case 'builder-check':this.checkBuilder();break;
        case 'builder-reset':
          this.builderSelected=[];this.builderFeedback=null;this.renderContent(true);break;
        case 'review-mistakes':this.startReview('weak');break;
        case 'review-menu':
          this.review=null;this.choice=null;this.feedback=null;this.renderContent();break;
        case 'prev':this.stepLesson(-1);break;
        case 'next':this.stepLesson(1);break;
        case 'bookmark':this.toggleBookmark();break;
        case 'done':this.toggleDone();break;
        case 'review-start':this.startReview();break;
        case 'review-next':this.advanceReview();break;
        case 'review-reset':this.startReview(this.review?.mode||'all');break;
        case 'saved-open':
          this.view='grammar';this.render();break;
        default:break;
      }
    };
    this.onReadingChange=event=>{
      if(event.target.matches('[data-role="reading-theme"]')){
        this.stopReading();
        this.readingTheme=event.target.value;
        this.readingIndex=0;
        this.readingAnswer=null;this.readingFeedback=null;
        this.persist();this.renderContent();
      }
      if(event.target.matches('[data-role="reading-speed"]')){
        const speed=Number(event.target.value);
        if(Number.isFinite(speed)&&speed>=.6&&speed<=1.5){
          this.stopReading();
          this.readingRate=speed;
          this.updateReadingAudio();
        }
      }
    };
    this.onReadingInput=event=>{
      if(!event.target.matches('[data-role="reading-draft"]'))return;
      const storyId=event.target.dataset.storyId;
      if(!READING_ESSAYS.some(item=>item.id===storyId))return;
      this.readingDrafts[storyId]=event.target.value.slice(0,7000);
      const indicator=this.content.querySelector('[data-role="reading-draft-status"]');
      if(indicator)indicator.textContent='Черновик сохраняется автоматически';
      clearTimeout(this.readingPersistTimer);
      this.readingPersistTimer=setTimeout(()=>this.persist(),500);
    };
    this.onReadingBlur=event=>{
      if(event.target.matches('[data-role="reading-draft"]')){
        clearTimeout(this.readingPersistTimer);
        this.persist();
      }
    };
    this.onReadingReturn=()=>{
      if(!document.hidden&&this.view==='reading'&&readingDayKey()!==this.readingDate){
        this.stopReading();
        this.readingIndex=0;this.readingDate=readingDayKey();
        this.readingAnswer=null;this.readingFeedback=null;
        this.renderContent();
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
    this.content.addEventListener('change',this.onReadingChange);
    this.content.addEventListener('input',this.onReadingInput);
    this.content.addEventListener('focusout',this.onReadingBlur);
    this.search.addEventListener('input',this.onSearch);
    this.levelSelect.addEventListener('change',this.onLevel);
    this.chapterList.addEventListener('toggle',this.onChapterToggle,true);
    document.addEventListener('visibilitychange',this.onReadingReturn);
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
        weak:this.weak,
        readingTheme:this.readingTheme,
        readingDone:[...this.readingDone],
        readingDrafts:this.readingDrafts,
        readingChecks:this.readingChecks
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
    const correct=this.builderSelected.every((value,index)=>words[value]===words[index]);
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
    const ordered=mode==='all'?shuffle(pool).sort((a,b)=>Number(this.weak[b.id]||0)-Number(this.weak[a.id]||0)):shuffle(pool);
    this.review={ids:ordered.slice(0,Math.min(10,pool.length)).map(topic=>topic.id),
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
    this.root.classList.toggle('is-reading',this.view==='reading');
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
        if(this.weak[item.id]>0)level.textContent+=' ↻';
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
    else if(this.view==='reading')this.renderDailyReading();
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
    const expanded=GRAMMAR_EXPANDED[topic.id]||{};
    const guide=GRAMMAR_CHAPTER_GUIDES[topic.groupId];
    frame.append(section('Когда использовать',expanded.usage||topic.rule,'dx-english-usage'));
    frame.append(section('Правило',topic.rule));
    frame.append(section('Формула',topic.formula,'dx-english-formula'));
    if(guide){
      const how=make('section','dx-english-rule-block dx-english-steps');
      how.append(make('h4','','Как применять правило'));
      const points=make('ol','');
      for(const step of guide.steps)points.append(make('li','',step));
      how.append(points);frame.append(how);
    }
    const example=make('section','dx-english-rule-block dx-english-example');
    example.append(make('h4','','Пример'),
      make('p','dx-english-example-en',topic.example),
      make('p','dx-english-translation',topic.translation));
    frame.append(example);
    if(expanded.examples?.length){
      const more=make('section','dx-english-rule-block dx-english-examples');
      more.append(make('h4','','Дополнительные примеры в речи'));
      expanded.examples.forEach((item,index)=>{
        const row=make('div','dx-english-example-row');
        const content=make('div','dx-english-example-copy');
        content.append(make('span','dx-english-example-en',item.english),
          make('span','dx-english-translation',item.russian));
        const audio=button('▶','', 'dx-english-speak');
        audio.removeAttribute('data-action');
        audio.dataset.speak=item.english;
        audio.title='Прослушать английский пример';
        audio.setAttribute('aria-label','Прослушать пример '+(index+1));
        row.append(content,audio);more.append(row);
      });
      frame.append(more);
    }
    frame.append(section('Типичная ошибка',topic.mistake,'dx-english-pitfall'));
    const comparison=GRAMMAR_COMPARISONS[topic.id];
    if(comparison&&byId.has(comparison.other)){
      const compare=make('section','dx-english-rule-block dx-english-compare');
      compare.append(make('h4','','Не путайте эти правила'),
        make('p','',comparison.note));
      const link=button('Сравнить: '+byId.get(comparison.other).title,'','dx-english-related');
      link.removeAttribute('data-action');
      link.dataset.lesson=comparison.other;
      compare.append(link);frame.append(compare);
    }
    if(this.speechStatus)frame.append(make('p','dx-english-mini',this.speechStatus));

    const actions=make('div','dx-english-lesson-actions');
    const bookmark=button(this.bookmarks.has(topic.id)?'★ В избранном':'☆ В избранное','bookmark');
    bookmark.setAttribute('aria-pressed',String(this.bookmarks.has(topic.id)));
    const done=button(this.done.has(topic.id)?'✓ Изучено':'Отметить изученным','done');
    done.setAttribute('aria-pressed',String(this.done.has(topic.id)));
    actions.append(bookmark,done);frame.append(actions);

    frame.append(this.makeQuiz(topic));
    frame.append(this.makeSentenceBuilder(topic));
    const navigation=make('nav','dx-english-lesson-nav');
    const back=button('← Предыдущая','prev');back.disabled=position===0;
    const next=button('Следующая →','next');next.disabled=position===GRAMMAR_LESSONS.length-1;
    navigation.append(back,next);frame.append(navigation);
    this.content.append(frame);
  }
  makeSentenceBuilder(topic){
    const wrap=make('section','dx-english-quiz dx-english-builder');
    const target=this.currentBuilder();
    if(!target)return wrap;
    const words=target.english.trim().split(/\s+/);
    wrap.append(make('span','dx-english-quiz-tag','Практика · порядок слов'),
      make('h4','','Соберите английское предложение по переводу'));
    wrap.append(make('p','dx-english-builder-prompt',target.russian));
    const composed=make('div','dx-english-builder-answer');
    composed.setAttribute('aria-label','Собранное предложение');
    if(!this.builderSelected.length)composed.append(make('span','dx-english-builder-placeholder','Нажимайте слова ниже в нужном порядке'));
    this.builderSelected.forEach((wordIndex,position)=>{
      const chip=button(words[wordIndex],'','dx-english-word is-used');
      chip.removeAttribute('data-action');
      chip.dataset.buildRemove=String(position);
      chip.disabled=Boolean(this.builderFeedback?.correct);
      chip.title='Убрать слово из ответа';
      composed.append(chip);
    });
    wrap.append(composed);
    const available=make('div','dx-english-builder-words');
    for(const wordIndex of this.builderOrder){
      if(this.builderSelected.includes(wordIndex))continue;
      const chip=button(words[wordIndex],'','dx-english-word');
      chip.removeAttribute('data-action');
      chip.dataset.buildAdd=String(wordIndex);
      available.append(chip);
    }
    wrap.append(available);
    if(this.builderFeedback){
      const feedback=make('div','dx-english-feedback '+(this.builderFeedback.correct?'is-success':'is-error'));
      feedback.setAttribute('role','status');
      feedback.append(make('strong','',this.builderFeedback.correct?'Верно! Предложение собрано.':'Порядок слов пока неверный.'),
        make('p','',this.builderFeedback.correct?target.english:
          'Посмотрите схему и примеры выше. Можно убрать слово из ответа и попробовать ещё раз.'));
      wrap.append(feedback);
    }
    const actions=make('div','dx-english-quiz-actions');
    const reset=button('Сначала','builder-reset');
    reset.disabled=!this.builderSelected.length;
    actions.append(reset);
    if(!this.builderFeedback?.correct){
      const check=button('Проверить порядок','builder-check','dx-english-primary');
      check.disabled=this.builderSelected.length!==words.length;
      actions.append(check);
    }
    wrap.append(actions);
    return wrap;
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
      const locked=this.view==='practice'&&this.review?.answered;
      const heading=this.feedback.correct?'Верно! Тема засчитана.':
        (locked?'Неверно — разберём ответ.':'Пока неверно. Попробуйте ещё раз.');
      feedback.append(make('strong','',heading));
      feedback.append(make('p','',(!this.feedback.correct&&locked?'Правильный вариант: '+this.feedback.answer+'. ':'')+
        (this.feedback.correct?'Почему: ':'Подсказка: ')+this.feedback.rule));
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
        '10 случайных вопросов по правилам выбранного уровня. После каждого ответа показывается объяснение. Ошибки сохраняются в списке повторения.'));
      block.append(make('p','dx-english-mini','Выбранный уровень: '+(this.level==='all'?'все уровни':this.level)));
      const buttons=make('div','dx-english-lesson-actions');
      buttons.append(button('Начать тренировку · 10 вопросов','review-start','dx-english-primary'));
      const weakCount=GRAMMAR_LESSONS.filter(item=>this.weak[item.id]>0&&(this.level==='all'||item.level===this.level)).length;
      const weak=button('Повторить ошибки · '+weakCount,'review-mistakes');
      weak.disabled=!weakCount;
      buttons.append(weak);block.append(buttons);
      if(!weakCount)block.append(make('p','dx-english-mini',
        'Пока нет ошибок для повторения. Пройдите любую тренировку или упражнение.'));
      this.content.append(block);return;
    }
    if(this.review.index>=this.review.ids.length){
      block.append(make('span','dx-english-chip','Тренировка завершена'),
        make('h3','','Результат: '+this.review.score+' из '+this.review.ids.length));
      block.append(make('p','dx-english-intro',
        'Правильные ответы засчитаны в прогресс грамматики. Повторите темы, в которых ещё не уверены.'));
      const buttons=make('div','dx-english-lesson-actions');
      buttons.append(button('Ещё вопросы','review-reset','dx-english-primary'));
      const weak=button('Повторить ошибки · '+Object.keys(this.weak).length,'review-mistakes');
      weak.disabled=!Object.keys(this.weak).length;
      buttons.append(weak,button('Выбор тренировки','review-menu'));
      block.append(buttons);
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

  dailyReadings(){
    const today=readingDayKey();
    if(this.readingDate!==today){
      this.stopReading();
      this.readingDate=today;
      this.readingIndex=0;
      this.readingAnswer=null;
      this.readingFeedback=null;
    }
    return readingPairForDay(today,this.readingTheme);
  }
  activeReading(){
    const pair=this.dailyReadings();
    return pair[Math.min(this.readingIndex,pair.length-1)]||pair[0]||null;
  }
  toggleReadingDone(){
    const story=this.activeReading();
    if(!story)return;
    if(this.readingDone.has(story.id))this.readingDone.delete(story.id);
    else this.readingDone.add(story.id);
    this.persist();
    this.renderContent(true);
  }
  checkReadingAnswer(){
    const story=this.activeReading();
    if(!story||!Number.isInteger(this.readingAnswer))return;
    const correct=this.readingAnswer===story.answer;
    this.readingChecks[story.id]=correct;
    this.readingFeedback=correct?'Верно! Вы поняли главную мысль текста.':
      'Пока неверно. Перечитайте нужный абзац и попробуйте ещё раз.';
    this.persist();
    this.renderContent(true);
  }
  readingSpeechChunks(story){
    // Short utterances improve reliability on Chromium, WebKit and long essays.
    const chunks=[];
    for(const paragraph of story.paragraphs){
      const sentences=paragraph.match(/[^.!?]+[.!?]+(?:["”']*)|[^.!?]+$/g)||[paragraph];
      let chunk='';
      for(const sentence of sentences){
        const part=sentence.trim();
        if(!part)continue;
        if(chunk.length+part.length>165&&chunk){
          chunks.push(chunk);chunk='';
        }
        if(part.length>165){
          const words=part.split(/\s+/);
          for(const word of words){
            if(chunk.length+word.length>165&&chunk){chunks.push(chunk);chunk='';}
            chunk+=(chunk?' ':'')+word;
          }
        }else{
          chunk+=(chunk?' ':'')+part;
        }
      }
      if(chunk)chunks.push(chunk);
    }
    return chunks;
  }
  playReading(){
    const story=this.activeReading();
    if(!story)return;
    if(!('speechSynthesis' in window)||typeof SpeechSynthesisUtterance!=='function'){
      this.readingAudioStatus='В этом браузере нет доступного синтеза речи.';
      this.updateReadingAudio();return;
    }
    const synth=window.speechSynthesis;
    if(this.readingAudio?.id===story.id){
      if(this.readingAudio.paused){
        this.readingAudio.paused=false;
        synth.resume();
        this.readingAudioStatus='Продолжено воспроизведение';
        this.updateReadingAudio();
      }
      return;
    }
    this.stopReading();
    // The same browser voice can still be reading an earlier grammar example.
    // Start the daily essay immediately instead of queuing it behind that audio.
    synth.cancel();
    const chunks=this.readingSpeechChunks(story);
    if(!chunks.length)return;
    const token=++this.readingSpeechToken;
    this.readingAudio={id:story.id,paused:false,index:0,chunks,token};
    this.readingAudioStatus='Читаем текст вслух…';
    const speakNext=()=>{
      const audio=this.readingAudio;
      if(!audio||audio.token!==token||this.destroyed)return;
      if(audio.index>=audio.chunks.length){
        this.readingAudio=null;
        this.readingAudioStatus='Чтение завершено';
        this.updateReadingAudio();
        return;
      }
      const utterance=new SpeechSynthesisUtterance(audio.chunks[audio.index++]);
      utterance.lang='en-US';
      utterance.rate=this.readingRate;
      utterance.onend=()=>{if(this.readingAudio?.token===token)speakNext();};
      utterance.onerror=event=>{
        if(this.readingAudio?.token!==token)return;
        this.readingAudio=null;
        this.readingAudioStatus='Озвучивание прервано. Попробуйте снова.';
        this.updateReadingAudio();
      };
      try{synth.speak(utterance);}catch(error){
        this.readingAudio=null;this.readingAudioStatus='Не удалось воспроизвести текст.';
        this.updateReadingAudio();
      }
    };
    speakNext();
    this.updateReadingAudio();
  }
  pauseReading(){
    if(!this.readingAudio||this.readingAudio.paused)return;
    window.speechSynthesis.pause();
    this.readingAudio.paused=true;
    this.readingAudioStatus='Пауза';
    this.updateReadingAudio();
  }
  stopReading(){
    this.readingSpeechToken++;
    const hadAudio=Boolean(this.readingAudio);
    this.readingAudio=null;
    if(hadAudio&&'speechSynthesis' in window)window.speechSynthesis.cancel();
    if(hadAudio)this.readingAudioStatus='';
    this.updateReadingAudio();
  }
  updateReadingAudio(){
    const active=Boolean(this.readingAudio);
    const play=this.content?.querySelector('[data-action="reading-play"]');
    const pause=this.content?.querySelector('[data-action="reading-pause"]');
    const stop=this.content?.querySelector('[data-action="reading-stop"]');
    const status=this.content?.querySelector('[data-role="reading-audio-status"]');
    if(play){
      play.textContent=active&&this.readingAudio.paused?'▶ Продолжить':'▶ Читать вслух';
      play.disabled=active&&!this.readingAudio.paused;
    }
    if(pause)pause.disabled=!active||this.readingAudio.paused;
    if(stop)stop.disabled=!active;
    if(status)status.textContent=this.readingAudioStatus||
      'Используется английский голос браузера. Интернет для текстов не нужен.';
  }
  renderDailyReading(){
    const stories=this.dailyReadings();
    const story=this.activeReading();
    if(!story)return;
    const topic=READING_THEMES.find(item=>item.id===story.theme);
    const frame=make('article','dx-english-reading');
    const header=make('header','dx-english-reading-header');
    const date=new Date(this.readingDate+'T00:00:00Z').toLocaleDateString('ru-RU',{
      timeZone:'UTC',day:'numeric',month:'long',year:'numeric'
    });
    header.append(make('span','dx-english-chip','Два текста на день'),
      make('h3','','Чтение и самостоятельный перевод'),
      make('p','dx-english-mini','Тексты дня · '+date+' · сменяются по календарю'));
    frame.append(header);

    const filters=make('div','dx-english-reading-toolbar');
    const themeLabel=make('label','dx-english-reading-theme');
    themeLabel.append(make('span','','Тема сочинений'));
    const themeSelect=make('select');
    themeSelect.dataset.role='reading-theme';
    const options=[{id:'all',title:'Все темы'},...READING_THEMES];
    options.forEach(item=>{
      const option=new Option(item.title,item.id);
      themeSelect.append(option);
    });
    themeSelect.value=this.readingTheme;
    themeLabel.append(themeSelect);filters.append(themeLabel);
    filters.append(make('span','dx-english-mini',
      'Прочитано: '+this.readingDone.size+' из '+READING_ESSAYS.length+' текстов'));
    frame.append(filters);

    const switcher=make('nav','dx-english-reading-switcher');
    stories.forEach((entry,index)=>{
      const selected=index===this.readingIndex;
      const tab=button((this.readingDone.has(entry.id)?'✓ ':'')+'Текст '+(index+1),'','dx-english-reading-tab');
      tab.removeAttribute('data-action');
      tab.dataset.readingStory=entry.id;
      tab.setAttribute('aria-pressed',String(selected));
      tab.classList.toggle('is-active',selected);
      const sub=make('span','',entry.title);tab.append(sub);
      switcher.append(tab);
    });
    frame.append(switcher);

    const meta=make('div','dx-english-lesson-meta');
    meta.append(make('span','dx-english-chip',story.level),make('span','',topic?.title||'Чтение'),
      make('span','',story.wordCount+' слов · около '+Math.ceil(story.wordCount/110)+' мин чтения'));
    frame.append(meta,make('h3','dx-english-reading-title',story.title));
    const intro=make('p','dx-english-reading-intro',
      'Прочитайте английский текст, попробуйте перевести каждый абзац самостоятельно, затем прослушайте произношение.');
    frame.append(intro);

    const audio=make('div','dx-english-reading-audio');
    audio.append(button('▶ Читать вслух','reading-play','dx-english-primary'),
      button('Ⅱ Пауза','reading-pause'),button('■ Стоп','reading-stop'));
    const speedLabel=make('label','dx-english-reading-speed');
    speedLabel.append(make('span','','Скорость'));
    const speed=make('select');speed.dataset.role='reading-speed';
    [[.75,'0.75×'],[.9,'0.9×'],[1,'1×'],[1.15,'1.15×']].forEach(([value,label])=>
      speed.add(new Option(label,String(value))));
    speed.value=String(this.readingRate);speedLabel.append(speed);audio.append(speedLabel);
    frame.append(audio);
    const status=make('p','dx-english-mini');status.dataset.role='reading-audio-status';
    frame.append(status);

    const text=make('section','dx-english-reading-text');
    text.setAttribute('lang','en');
    for(const paragraph of story.paragraphs)text.append(make('p','',paragraph));
    frame.append(text);

    const draft=make('section','dx-english-reading-draft');
    draft.append(make('h4','','Мой перевод на русский'),
      make('p','dx-english-mini','Переводите своими словами. Сохраняется в браузере автоматически, без отправки на сервер.'));
    const field=make('textarea');
    field.dataset.role='reading-draft';
    field.dataset.storyId=story.id;
    field.placeholder='Напишите свой перевод текста здесь. Начните с первого абзаца…';
    field.rows=8;
    field.maxLength=7000;
    field.value=this.readingDrafts[story.id]||'';
    field.setAttribute('aria-label','Мой собственный перевод на русский');
    draft.append(field);
    const draftStatus=make('p','dx-english-mini',
      'Черновик сохраняется автоматически');draftStatus.dataset.role='reading-draft-status';
    draft.append(draftStatus);frame.append(draft);

    const comprehension=make('section','dx-english-quiz dx-english-reading-check');
    comprehension.append(make('span','dx-english-quiz-tag','Проверка понимания'),
      make('h4','',story.question));
    const answers=make('div','dx-english-options');
    story.options.forEach((answer,index)=>{
      const option=button(answer,'','dx-english-option');
      option.removeAttribute('data-action');
      option.dataset.readingAnswer=String(index);
      option.classList.toggle('is-selected',this.readingAnswer===index);
      option.setAttribute('aria-pressed',String(this.readingAnswer===index));
      answers.append(option);
    });
    comprehension.append(answers);
    const check=button('Проверить понимание','reading-check','dx-english-primary');
    check.disabled=!Number.isInteger(this.readingAnswer);
    comprehension.append(check);
    if(this.readingFeedback){
      const feedback=make('p','dx-english-feedback '+(this.readingChecks[story.id]?'is-success':'is-error'),
        this.readingFeedback);
      feedback.setAttribute('role','status');comprehension.append(feedback);
    }
    frame.append(comprehension);
    const bottom=make('div','dx-english-lesson-actions');
    const completed=button(this.readingDone.has(story.id)?'✓ Прочитано':'Отметить прочитанным',
      'reading-done','dx-english-primary');
    completed.setAttribute('aria-pressed',String(this.readingDone.has(story.id)));
    bottom.append(completed);frame.append(bottom);
    this.content.append(frame);
    this.updateReadingAudio();
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
    this.stopReading();
    clearTimeout(this.readingPersistTimer);
    this.persist();
    this.destroyed=true;
    if('speechSynthesis' in window)window.speechSynthesis.cancel();
    this.root?.removeEventListener('click',this.onClick);
    this.content?.removeEventListener('change',this.onReadingChange);
    this.content?.removeEventListener('input',this.onReadingInput);
    this.content?.removeEventListener('focusout',this.onReadingBlur);
    this.search?.removeEventListener('input',this.onSearch);
    this.levelSelect?.removeEventListener('change',this.onLevel);
    this.chapterList?.removeEventListener('toggle',this.onChapterToggle,true);
    document.removeEventListener('visibilitychange',this.onReadingReturn);
  }
}
