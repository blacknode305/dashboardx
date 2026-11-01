// Reading helper for English essays: local dictionary and optional remote translation.
// External services are contacted only on an explicit "Перевести онлайн" click.
const DICTIONARY_PACKS = {"pronoun":"i=я;me=меня, мне;my=мой;mine=мой;you=ты, вы;your=твой, ваш;he=он;him=его, ему;his=его;she=она;her=её, ей;hers=её;it=это, оно;its=его, её;we=мы;us=нас, нам;our=наш;they=они;them=их, им;their=их;who=кто, который;which=который, какой;what=что, какой;someone=кто-то;anyone=кто угодно;everyone=каждый, все;nobody=никто;something=что-то;everything=всё","determiner":"a=неопределённый артикль;an=неопределённый артикль;the=определённый артикль;this=этот;that=тот, что;these=эти;those=те;some=несколько, немного;any=какой-либо, любой;every=каждый;each=каждый;both=оба;all=все, весь;many=много (исчисляемое);much=много (неисчисляемое);few=мало, несколько;little=мало, маленький;another=другой, ещё один;other=другой;several=несколько;one=один;two=два;three=три;first=первый;second=второй","preposition":"in=в;on=на;at=в, у;to=к, в, маркер инфинитива;from=из, от;with=с;without=без;by=у, рядом, посредством;for=для, в течение;of=из, от, принадлежность;about=о;through=через, сквозь;into=внутрь;between=между;among=среди;under=под;over=над, через;above=над;below=ниже;near=рядом;around=вокруг;across=через;along=вдоль;before=до, перед;after=после;during=во время;since=с тех пор как;until=до тех пор пока;against=против;towards=в направлении;behind=позади;inside=внутри;outside=снаружи","conjunction":"and=и;or=или;but=но;because=потому что;although=хотя;though=хотя;while=пока, тогда как;when=когда;where=где;if=если;unless=если не;however=однако;therefore=поэтому;so=поэтому, так;yet=однако, ещё;even=даже;as=как, поскольку;than=чем;whether=ли","auxiliary":"am=форма be с I;is=форма be с he/she/it;are=форма be с you/we/they;was=был, была;were=были, был;be=быть;been=был, причастие be;being=находясь, форма be+ing;do=делать, вспомогательный;does=делает, вспомогательный;did=сделал, вспомогательный;have=иметь, вспомогательный;has=имеет, вспомогательный;had=имел, вспомогательный","modal":"can=мочь, уметь;could=мог бы, умел;will=будет, будущее;would=бы, условное;should=следует, стоило бы;must=должен, необходимо;may=возможно, можно;might=возможно;shall=предложение, должен","verb":"work=работать;study=изучать, учиться;learn=учить, узнавать;read=читать;write=писать;speak=говорить;talk=разговаривать;say=сказать;tell=рассказать;ask=спрашивать;answer=отвечать;know=знать;think=думать;understand=понимать;remember=помнить;forget=забывать;change=менять;become=становиться;begin=начинать;start=начинать;finish=заканчивать;continue=продолжать;stop=останавливать;try=пробовать;decide=решать;choose=выбирать;plan=планировать;want=хотеть;need=нуждаться;like=нравиться;love=любить;enjoy=получать удовольствие;feel=чувствовать;see=видеть;watch=наблюдать;look=смотреть;notice=замечать;find=находить;show=показывать;help=помогать;make=делать, создавать;create=создавать;build=строить;carry=нести;walk=гулять, идти;run=бежать;go=идти, ехать;come=приходить;leave=уходить, оставлять;arrive=прибывать;return=возвращаться;move=двигаться, переезжать;visit=посещать;travel=путешествовать;drive=водить, ехать;buy=покупать;sell=продавать;pay=платить;cost=стоить;take=брать;give=давать;bring=приносить;get=получать, становиться;put=класть;keep=держать, сохранять;hold=держать;open=открывать;close=закрывать;turn=поворачивать, включать;check=проверять;use=использовать;share=делиться;send=отправлять;receive=получать;wait=ждать;stay=оставаться;spend=тратить, проводить;live=жить;meet=встречать;join=присоединяться;invite=приглашать;offer=предлагать;suggest=предлагать;explain=объяснять;describe=описывать;discuss=обсуждать;agree=соглашаться;believe=верить, полагать;expect=ожидать;imagine=представлять;realise=осознавать;discover=обнаруживать;improve=улучшать;develop=разрабатывать;design=проектировать;organise=организовывать;prepare=готовить;repair=чинить;teach=обучать;test=проверять;measure=измерять;compare=сравнивать;solve=решать задачу;require=требовать;allow=позволять;remain=оставаться;follow=следовать;focus=сосредоточиваться;protect=защищать;support=поддерживать;replace=заменять;appear=появляться;disappear=исчезать;grow=расти;reach=достигать;listen=слушать;hear=слышать;eat=есть;cook=готовить еду;drink=пить;sleep=спать;wake=просыпаться","noun":"day=день;night=ночь;morning=утро;evening=вечер;week=неделя;month=месяц;year=год;time=время;hour=час;minute=минута;moment=момент;person=человек;people=люди;friend=друг;family=семья;child=ребёнок;children=дети;woman=женщина;man=мужчина;student=ученик, студент;teacher=учитель;team=команда;manager=руководитель;colleague=коллега;neighbour=сосед;city=город;town=городок;street=улица;house=дом;home=дом;apartment=квартира;building=здание;room=комната;window=окно;door=дверь;school=школа;office=офис;market=рынок;shop=магазин;book=книга;story=история, рассказ;letter=письмо;word=слово;sentence=предложение;language=язык;question=вопрос;answer=ответ;problem=проблема;solution=решение;idea=идея;project=проект;plan=план;goal=цель;result=результат;example=пример;information=информация;message=сообщение;phone=телефон;computer=компьютер;screen=экран;device=устройство;technology=технология;system=система;program=программа;application=приложение;internet=интернет;map=карта;train=поезд;station=станция;ticket=билет;journey=путешествие;trip=поездка;road=дорога;path=тропа, путь;river=река;garden=сад;plant=растение;flower=цветок;tree=дерево;water=вода;food=еда;bread=хлеб;coffee=кофе;tea=чай;weather=погода;rain=дождь;star=звезда;sky=небо;light=свет;world=мир;life=жизнь;experience=опыт;attention=внимание;decision=решение;conversation=разговор;skill=навык;difference=разница","adjective":"good=хороший;bad=плохой;new=новый;old=старый;young=молодой;small=маленький;large=большой;big=большой;long=длинный;short=короткий;early=ранний;late=поздний;easy=лёгкий;difficult=сложный;important=важный;interesting=интересный;useful=полезный;possible=возможный;impossible=невозможный;different=разный;similar=похожий;clear=ясный, понятный;quiet=тихий;busy=занятый;tired=усталый;happy=счастливый;afraid=испуганный;familiar=знакомый;unfamiliar=незнакомый;comfortable=удобный;simple=простой;careful=осторожный;real=настоящий;special=особенный;strong=сильный;safe=безопасный;friendly=дружелюбный;popular=популярный;local=местный;personal=личный;ordinary=обычный","adverb":"very=очень;really=действительно;often=часто;usually=обычно;sometimes=иногда;never=никогда;always=всегда;already=уже;still=всё ещё;soon=скоро;now=сейчас;today=сегодня;tomorrow=завтра;yesterday=вчера;quickly=быстро;slowly=медленно;carefully=осторожно;easily=легко;together=вместе;again=снова;almost=почти;only=только;also=также;even=даже;instead=вместо этого;finally=наконец;probably=вероятно;perhaps=возможно;actually=на самом деле;however=однако;especially=особенно;completely=полностью;simply=просто;gradually=постепенно"};
const wordClasses={noun:'существительное',verb:'глагол',adjective:'прилагательное',adverb:'наречие',
  preposition:'предлог',pronoun:'местоимение',auxiliary:'вспомогательный глагол',
  modal:'модальный глагол',determiner:'определитель',conjunction:'союз'};
const dictionary=new Map();
for(const [kind,entries] of Object.entries(DICTIONARY_PACKS)){
  for(const line of entries.split(';')){
    const index=line.indexOf('=');
    if(index>0)dictionary.set(line.slice(0,index).toLowerCase(),{meaning:line.slice(index+1),kind});
  }
}
const EXTRA_READING_WORDS = {"noun":"way=способ, путь;place=место;part=часть;mistake=ошибка;resident=житель;course=курс, направление;detail=деталь;notebook=блокнот;photograph=фотография;robot=робот;library=библиотека;vegetable=овощ;experiment=эксперимент;end=конец;task=задача;area=местность, район;process=процесс;discussion=обсуждение;progress=прогресс;report=отчёт;piece=кусок, часть;box=коробка;weekend=выходные;observation=наблюдение;failure=неудача;confidence=уверенность;ability=способность;afternoon=вторая половина дня;event=событие;sign=знак, признак;responsibility=ответственность;museum=музей;friendship=дружба;meeting=встреча;willingness=готовность;brother=брат;science=наука;hospital=больница;explanation=объяснение;group=группа;breakfast=завтрак;schedule=расписание;habit=привычка;waste=мусор, отходы;clothes=одежда;action=действие;entrance=вход;bird=птица;collection=коллекция;tool=инструмент;community=сообщество;note=заметка;connection=связь;recipe=рецепт;equipment=оборудование;instruction=инструкция;dinner=ужин;memory=память; evidence=доказательство;notification=уведомление;adventure=приключение;direction=направление, указание;bag=сумка;website=веб-сайт;lunch=обед;space=пространство;route=маршрут;review=обзор, проверка;paper=бумага;history=история;parent=родитель;list=список;presentation=презентация;difference=различие;view=вид, взгляд;decision=решение;skill=навык;material=материал;opportunity=возможность;research=исследование;water=вода;approach=подход","verb":"seem=казаться;add=добавлять;remind=напоминать;collect=собирать;mean=означать;include=включать;worry=волноваться;introduce=представлять, знакомить;matter=иметь значение;repeat=повторять;rest=отдыхать;miss=пропускать, скучать;lead=вести;consider=рассматривать, считать;fit=подходить;raise=поднимать;examine=изучать;recognise=узнавать;respond=отвечать;expect=ожидать;describe=описывать;allow=позволять;affect=влиять;apply=применять;achieve=достигать;discover=обнаруживать;receive=получать;organize=организовывать;encourage=поощрять;offer=предлагать","adjective":"more=больше;most=самый, большинство;less=меньше;older=старше;longer=дольше, длиннее;later=позже;next=следующий;practical=практический;last=последний, прошлый;dramatic=драматичный;full=полный;complicated=сложный;same=тот же;perfect=идеальный;larger=более крупный;easier=легче;impressive=впечатляющий;enough=достаточный;original=оригинальный;wrong=неверный;honest=честный;entire=целый;wooden=деревянный;particular=конкретный;heavy=тяжёлый;valuable=ценный;final=окончательный;excellent=отличный;famous=знаменитый;warm=тёплый;patient=терпеливый;human=человеческий;fresh=свежий;available=доступный;missing=отсутствующий;confident=уверенный;nervous=взволнованный;right=правильный, правый;thoughtful=вдумчивый;expensive=дорогой;everyday=повседневный;correct=правильный;useful=полезный;certain=определённый;possible=возможный;unusual=необычный","adverb":"not=не;how=как;no=нет;why=почему;too=слишком;then=тогда, затем;rather=скорее, довольно;up=вверх;there=там;once=однажды, один раз;well=хорошо;rarely=редко;immediately=немедленно;daily=ежедневно;far=далеко;twenty=двадцать;down=вниз;unexpectedly=неожиданно;back=назад;indeed=действительно;later=позже;already=уже;quite=довольно;nearly=почти;finally=наконец"};
for(const [kind,entries] of Object.entries(EXTRA_READING_WORDS)){
  for(const pair of entries.split(';')){
    const i=pair.indexOf('=');if(i>0&&!dictionary.has(pair.slice(0,i).trim()))
      dictionary.set(pair.slice(0,i).trim(),{kind,meaning:pair.slice(i+1)});
  }
}
const irregular={
  said:['say','Past Simple / V3'],led:['lead','Past Simple / V3'],went:['go','Past Simple'],gone:['go','V3'],came:['come','Past Simple'],
  saw:['see','Past Simple'],seen:['see','V3'],made:['make','Past Simple / V3'],
  took:['take','Past Simple'],taken:['take','V3'],gave:['give','Past Simple'],
  given:['give','V3'],got:['get','Past Simple / V3'],bought:['buy','Past Simple / V3'],
  wrote:['write','Past Simple'],written:['write','V3'],spoke:['speak','Past Simple'],
  spoken:['speak','V3'],thought:['think','Past Simple / V3'],knew:['know','Past Simple'],
  known:['know','V3'],found:['find','Past Simple / V3'],felt:['feel','Past Simple / V3'],
  left:['leave','Past Simple / V3'],met:['meet','Past Simple / V3'],began:['begin','Past Simple'],
  begun:['begin','V3'],became:['become','Past Simple'],built:['build','Past Simple / V3'],
  spent:['spend','Past Simple / V3'],brought:['bring','Past Simple / V3'],
  told:['tell','Past Simple / V3'],heard:['hear','Past Simple / V3'],
  understood:['understand','Past Simple / V3'],chose:['choose','Past Simple'],
  chosen:['choose','V3'],kept:['keep','Past Simple / V3'],held:['hold','Past Simple / V3'],
  taught:['teach','Past Simple / V3'],grew:['grow','Past Simple'],
  grown:['grow','V3'],learnt:['learn','Past Simple / V3'],learned:['learn','Past Simple / V3'],
  paid:['pay','Past Simple / V3'],read:['read','V1 / Past Simple / V3']};
export function readingWordInfo(raw){
  const word=String(raw||'').replace(/^[^A-Za-z]+|[^A-Za-z]+$/g,'').toLowerCase();
  if(!word)return null;
  if(irregular[word]){
    const [lemma,form]=irregular[word],entry=dictionary.get(lemma);
    return {word,lemma,form,meaning:entry?.meaning||'',kind:entry?.kind||'verb'};
  }
  if(dictionary.has(word))return {word,lemma:word,form:'',...dictionary.get(word)};
  const candidates=[];
  if(word.endsWith('ies')&&word.length>4)candidates.push([word.slice(0,-3)+'y','V-s / множественное']);
  if(word.endsWith('ied')&&word.length>4)candidates.push([word.slice(0,-3)+'y','Past Simple / V3']);
  if(word.endsWith('ing')&&word.length>5){
    const base=word.slice(0,-3);
    candidates.push([base,'V-ing'],[base+'e','V-ing']);
    if(base.at(-1)===base.at(-2))candidates.push([base.slice(0,-1),'V-ing']);
  }
  if(word.endsWith('ed')&&word.length>4){
    const base=word.slice(0,-2);
    candidates.push([base,'Past Simple / V3'],[base+'e','Past Simple / V3']);
    if(base.at(-1)===base.at(-2))candidates.push([base.slice(0,-1),'Past Simple / V3']);
  }
  if(word.endsWith('es')&&word.length>4)candidates.push([word.slice(0,-2),'V-s / множественное'],[word.slice(0,-1),'V-s / множественное']);
  if(word.endsWith('s')&&word.length>3)candidates.push([word.slice(0,-1),'V-s / множественное']);
  for(const [lemma,hint] of candidates)if(dictionary.has(lemma)){
    const entry=dictionary.get(lemma);
    const form=entry.kind==='noun'&&hint.includes('множественное')?'множественное число':
      entry.kind==='verb'&&hint.includes('множественное')?'Present Simple (he/she/it)':
      entry.kind==='verb'?hint:'';
    return {word,lemma,form,...entry};
  }
  return {word,lemma:word,form:'',meaning:'',kind:''};
}
const patterns=[
  {re:/\b(?:will|'ll|’ll)\s+have\s+(?:\w+ed|been|gone|seen|written|made|done)\b/i,id:'future-perfect',name:'Future Perfect',detail:'Действие завершится к сроку в будущем.'},
  {re:/\bhad\s+been\s+\w+ing\b/i,id:'past-perfect-cont',name:'Past Perfect Continuous',detail:'Длительное действие до другого момента прошлого.'},
  {re:/\b(?:have|has|'ve|’ve)\s+been\s+\w+ing\b/i,id:'perfect-cont',name:'Present Perfect Continuous',detail:'Процесс, связанный с настоящим.'},
  {re:/\bhad\s+(?:\w+ed|been|gone|seen|written|made|taken|found)\b/i,id:'past-perfect',name:'Past Perfect',detail:'Действие раньше другого события прошлого.'},
  {re:/\b(?:have|has|'ve|’ve)\s+(?:\w+ed|been|gone|seen|written|made|taken|found)\b/i,id:'present-perfect',name:'Present Perfect',detail:'Результат или опыт, связанный с настоящим.'},
  {re:/\b(?:was|were)\s+\w+ing\b/i,id:'past-cont',name:'Past Continuous',detail:'Действие в процессе в прошлом.'},
  {re:/\b(?:am|is|are|'m|'re|’m|’re)\s+\w+ing\b/i,id:'present-cont',name:'Present Continuous',detail:'Действие в процессе.'},
  {re:/\b(?:will|'ll|’ll)\s+\w+\b/i,id:'will',name:'Future Simple',detail:'Прогноз, решение или обещание.'},
  {re:/\bgoing\s+to\s+\w+/i,id:'goingto',name:'Going to',detail:'Намерение или прогноз по признакам.'},
  {re:/\b(?:should|must|might|may|could|can)\s+have\s+\w+\b/i,id:'modalperfect',name:'Модальная конструкция о прошлом',detail:'Оценка вероятности или необходимости в прошлом.'},
  {re:/\b(?:should|must|might|may|could|can)\s+\w+\b/i,id:'can',name:'Модальная конструкция',detail:'Совет, необходимость или возможность.'},
  {re:/\bif\b[^.!?]*\bwould\s+have\b/i,id:'third-cond',name:'Third Conditional',detail:'Возможное нереальное условие в прошлом.'},
  {re:/\bif\b[^.!?]*\bwould\b/i,id:'second-cond',name:'Second Conditional',detail:'Гипотетическое условие.'},
  {re:/\bif\b/i,id:'first-cond',name:'Условное предложение',detail:'Точный тип зависит от обеих частей.'},
  {re:/\b(?:was|were)\s+(?:\w+ed|done|seen|made|built)\b/i,id:'passive-past',name:'Past Passive',detail:'Объект действия в прошлом.'},
  {re:/\b(?:is|are)\s+(?:\w+ed|done|made|built)\b/i,id:'passive-present',name:'Present Passive',detail:'Объект действия в настоящем.'}
];
export function readingGrammarHint(selected,context=''){
  const short=String(selected||'').slice(0,700),whole=String(context||selected).slice(0,700);
  for(const pattern of patterns){
    if(pattern.re.test(short))return {...pattern,approximate:/Conditional|Passive|Условное/.test(pattern.name)};
  }
  for(const pattern of patterns){
    if(pattern.re.test(whole))return {...pattern,approximate:true};
  }
  if(/\b(?:yesterday|last night|last week|ago)\b/i.test(whole))
    return {id:'past-simple',name:'Past Simple',detail:'Контекст указывает на прошедшее.',approximate:true};
  if(/\b(?:always|usually|often|every day|every week)\b/i.test(whole))
    return {id:'present-simple',name:'Present Simple',detail:'Контекст указывает на привычку.',approximate:true};
  const info=readingWordInfo(short);
  if(info?.kind==='verb'&&info.form.includes('Past Simple'))
    return {id:'past-simple',name:'Прошедшая форма глагола',detail:
      'Это может быть Past Simple либо V3 в составе другой конструкции: нужен контекст.',approximate:true};
  if(info?.kind==='verb'&&info.form==='V-ing')
    return {id:'present-cont',name:'Форма V-ing',detail:
      'Используется с continuous, как герундий или причастие. Время зависит от вспомогательного глагола.',approximate:true};
  return null;
}
export function readingWordGrammar(info){
  if(!info)return null;
  const word=info.word||'';
  let id='',name='',detail='';
  if(word==='the'){id='articles-the';name='Артикль the';detail='Употребление определённого артикля.';}
  else if(word==='a'||word==='an'){id='articles-a';name='A / an';detail='Неопределённые артикли.';}
  else if(['this','that','these','those'].includes(word)){id='demonstrative';name='Указательные местоимения';detail='Близость, дальность и число.';}
  else if(info.kind==='pronoun'){id='subjectpron';name='Личные местоимения';detail='Выбор формы по роли в предложении.';}
  else if(info.kind==='modal'){
    id=word==='must'?'musthave':word==='should'?'should':
      ['may','might'].includes(word)?'maymight':'can';
    name='Модальные глаголы';detail='Уточните смысл модального глагола в контексте.';
  }
  else if(word==='if'||word==='unless'){id='first-cond';name='Условные предложения';detail='Тип условия зависит от времён обеих частей.';}
  else if(info.kind==='auxiliary'){
    id=['have','has','had'].includes(word)?'have':'be';
    name='Вспомогательный глагол';detail='Время определяется всей конструкцией.';
  }
  else if(info.kind==='noun'&&info.form==='множественное число'){
    id='plural';name='Множественное число';detail='Образование формы множественного числа.';
  }
  else if(info.kind==='adjective'){id='adjectives';name='Прилагательные';detail='Описание предмета или состояния.';}
  else if(info.kind==='adverb'){id='adverbplace';name='Наречия';detail='Функция и место наречия зависят от вида.';}
  else if(info.kind==='verb'&&info.form.includes('Past Simple')){
    id='past-simple';name='Прошедшая форма';detail='Может быть Past Simple либо V3 при вспомогательном глаголе.';
  }
  else if(info.kind==='verb'&&info.form==='V-ing'){
    id='gerund';name='Форма -ing';detail='Может быть герундием или частью длительного времени.';
  }
  if(!id)return null;
  return {id,name,detail,approximate:true};
}
const node=(tag,cls='',value='')=>{
  const el=document.createElement(tag);if(cls)el.className=cls;el.textContent=value;return el;
};
function caretAt(x,y){
  if(document.caretPositionFromPoint){
    const c=document.caretPositionFromPoint(x,y);
    if(c){const r=document.createRange();try{r.setStart(c.offsetNode,c.offset);r.collapse(true);return r;}catch{}}
  }
  return document.caretRangeFromPoint?.(x,y)||null;
}
function hoveredWord(event,container){
  const r=caretAt(event.clientX,event.clientY);
  if(!r||r.startContainer.nodeType!==Node.TEXT_NODE||!container.contains(r.startContainer))return null;
  const text=r.startContainer.nodeValue||'',pos=r.startOffset;
  for(const match of text.matchAll(/[A-Za-z]+(?:['’][A-Za-z]+)*/g)){
    const start=match.index,end=start+match[0].length;
    if(pos<start||pos>end)continue;
    const a=document.createRange();a.setStart(r.startContainer,start);a.setEnd(r.startContainer,end);
    const rect=a.getBoundingClientRect();
    if(event.clientX<rect.left-2||event.clientX>rect.right+2||
      event.clientY<rect.top-3||event.clientY>rect.bottom+3)continue;
    return {text:match[0],context:r.startContainer.parentElement?.textContent||'',rect};
  }
  return null;
}
export class EnglishReadingInspector{
  constructor(widget,{onGrammar}={}){
    this.widget=widget;this.onGrammar=onGrammar;
    this.cache=new Map();this.token=0;this.key='';
    this.popup=node('aside','dx-reading-inspector');
    this.popup.hidden=true;this.popup.setAttribute('role','region');
    this.popup.setAttribute('aria-label','Подсказка по английскому языку');
    document.body.append(this.popup);
    this.move=e=>this.onMove(e);
    this.leave=()=>this.hideSoon();
    this.up=()=>this.selection();
    this.selectionChanged=()=>{
      clearTimeout(this.selectTimer);this.selectTimer=setTimeout(()=>this.selection(),160);
    };
    this.scroll=()=>this.hide();
    this.click=e=>this.onClick(e);
    this.popup.addEventListener('click',this.click);
    this.popup.addEventListener('pointerenter',()=>clearTimeout(this.hideTimer));
    this.popup.addEventListener('pointerleave',()=>this.hideSoon());
    widget.addEventListener('pointermove',this.move);
    widget.addEventListener('pointerleave',this.leave);
    widget.addEventListener('pointerup',this.up);
    document.addEventListener('selectionchange',this.selectionChanged);
    widget.querySelector('.dx-english-content')?.addEventListener('scroll',this.scroll,{passive:true});
  }
  reading(){return this.widget.querySelector('.dx-english.is-reading .dx-english-reading-text');}
  onMove(event){
    const container=this.reading();
    if(!container||event.pointerType==='touch'||this.popup.contains(event.target))return;
    const selection=window.getSelection();
    if(selection&&!selection.isCollapsed)return;
    const hit=hoveredWord(event,container);
    clearTimeout(this.hoverTimer);
    if(!hit){if(this.key.startsWith('word:'))this.hideSoon();return;}
    clearTimeout(this.hideTimer);
    const key='word:'+hit.text+':'+hit.context;
    if(key===this.key)return;
    this.hoverTimer=setTimeout(()=>this.show(hit.text,hit.context,hit.rect,'word',key),400);
  }
  selection(){
    const container=this.reading(),s=window.getSelection();
    if(!container||!s||s.isCollapsed||!s.rangeCount)return;
    const range=s.getRangeAt(0);
    if(!container.contains(range.commonAncestorContainer))return;
    const text=s.toString().replace(/\s+/g,' ').trim();
    if(!text||text.length>650)return;
    const key='selected:'+text;
    if(key===this.key)return;
    this.show(text,range.startContainer.parentElement?.textContent||text,
      range.getBoundingClientRect(),'selection',key);
  }
  show(text,context,rect,mode,key){
    if(!this.reading())return;
    this.key=key;this.text=text;this.token++;
    this.popup.replaceChildren();this.popup.hidden=false;
    const bar=node('div','dx-reading-inspector-header');
    bar.append(node('strong','',mode==='word'?'Слово и грамматика':'Выделенный фрагмент'));
    const close=node('button','dx-reading-inspector-close','×');
    close.type='button';close.dataset.inspect='close';close.setAttribute('aria-label','Закрыть подсказку');
    bar.append(close);this.popup.append(bar,node('div','dx-reading-inspector-term',text.slice(0,240)));
    const word=text.trim().split(/\s+/).length===1?readingWordInfo(text):null;
    if(word){
      const meta=node('div','dx-reading-inspector-meta');
      if(word.kind)meta.append(node('span','',wordClasses[word.kind]||word.kind));
      if(word.lemma!==word.word)meta.append(node('span','','Начальная форма: '+word.lemma));
      if(word.form)meta.append(node('span','',word.form));
      if(meta.childNodes.length)this.popup.append(meta);
      this.popup.append(node('p','dx-reading-inspector-translation',
        word.meaning?'Перевод: '+word.meaning:'Нет во встроенном словаре.'));
    }else{
      this.popup.append(node('p','dx-reading-inspector-helper',
        'Для перевода фразы с учётом контекста нажмите «Перевести онлайн».'));
      const hints=text.split(/\s+/).map(readingWordInfo).filter(item=>item?.meaning).slice(0,6);
      if(hints.length)this.popup.append(node('p','dx-reading-inspector-hints',
        'Отдельные слова: '+hints.map(item=>item.word+' — '+item.meaning).join('; ')));
    }
    const grammar=readingGrammarHint(text,context)||readingWordGrammar(word);
    if(grammar){
      const block=node('section','dx-reading-inspector-grammar');
      block.append(node('strong','',grammar.name),node('p','',grammar.detail));
      if(grammar.approximate)block.append(node('small','','Определение предположительное.'));
      const link=node('button','dx-reading-inspector-link','Открыть правило →');
      link.type='button';link.dataset.inspect='grammar';link.dataset.grammar=grammar.id;
      block.append(link);this.popup.append(block);
    }
    const translate=node('section','dx-reading-inspector-online');
    const result=node('p','dx-reading-inspector-result',this.cache.has(text)?
      'Онлайн-перевод: '+this.cache.get(text):
      'Контекстный перевод можно запросить отдельно.');
    result.dataset.translationResult='';
    const request=node('button','dx-reading-inspector-translate','Перевести онлайн');
    request.type='button';request.dataset.inspect='translate';
    const external=node('a','dx-reading-inspector-external','Открыть в переводчике');
    external.href='https://translate.google.com/?sl=en&tl=ru&text='+
      encodeURIComponent(text)+'&op=translate';
    external.target='_blank';external.rel='noopener noreferrer';
    translate.append(result,request,external,
      node('small','','Только при нажатии английский текст отправляется MyMemory. Лимит 450 байт.'));
    this.popup.append(translate);
    this.place(rect);
  }
  place(rect){
    const width=Math.min(342,window.innerWidth-18);
    this.popup.style.width=width+'px';
    this.popup.style.left=Math.max(9,Math.min(rect.left,window.innerWidth-width-9))+'px';
    this.popup.style.top='8px';
    const height=this.popup.getBoundingClientRect().height;
    let top=rect.bottom+9;
    if(top+height>window.innerHeight-8)top=rect.top-height-9;
    this.popup.style.top=Math.max(9,Math.min(top,window.innerHeight-height-9))+'px';
  }
  async onClick(event){
    const target=event.target.closest('[data-inspect]');
    if(!target)return;
    if(target.dataset.inspect==='close'){this.hide();return;}
    if(target.dataset.inspect==='grammar'){
      this.hide();this.onGrammar?.(target.dataset.grammar);return;
    }
    if(target.dataset.inspect!=='translate')return;
    const text=this.text,result=this.popup.querySelector('[data-translation-result]');
    if(!result)return;
    if(new TextEncoder().encode(text).length>450){
      result.textContent='Слишком длинный фрагмент. Выделите одно предложение или воспользуйтесь ссылкой.';
      return;
    }
    target.disabled=true;result.textContent='Получаем перевод…';
    this.request?.abort();
    const controller=new AbortController();this.request=controller;
    const token=this.token,timeout=setTimeout(()=>controller.abort(),9000);
    try{
      const params=new URLSearchParams({q:text,langpair:'en|ru'});
      const response=await fetch('https://api.mymemory.translated.net/get?'+params,{signal:controller.signal});
      if(!response.ok)throw Error('HTTP '+response.status);
      const data=await response.json();
      if(Number(data.responseStatus)!==200||typeof data.responseData?.translatedText!=='string')
        throw Error(data.responseDetails||'Нет результата');
      const translated=data.responseData.translatedText.trim();
      if(!translated)throw Error('Пустой результат');
      this.cache.set(text,translated);
      if(this.token===token)result.textContent='Онлайн-перевод (может быть неточным): '+translated;
    }catch{
      if(this.token===token)result.textContent='Сервис временно недоступен. Откройте переводчик по ссылке ниже.';
    }finally{
      clearTimeout(timeout);
      if(this.request===controller)this.request=null;
      if(this.token===token)target.disabled=false;
    }
  }
  hideSoon(){clearTimeout(this.hideTimer);this.hideTimer=setTimeout(()=>this.hide(),460);}
  hide(){
    clearTimeout(this.hoverTimer);clearTimeout(this.hideTimer);
    this.token++;this.key='';this.popup.hidden=true;
    this.request?.abort();this.request=null;
  }
  destroy(){
    this.hide();clearTimeout(this.selectTimer);
    this.widget.removeEventListener('pointermove',this.move);
    this.widget.removeEventListener('pointerleave',this.leave);
    this.widget.removeEventListener('pointerup',this.up);
    document.removeEventListener('selectionchange',this.selectionChanged);
    this.widget.querySelector('.dx-english-content')?.removeEventListener('scroll',this.scroll);
    this.popup.remove();
  }
}
