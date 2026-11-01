// Page-wide English vocabulary action for text in any dashboard widget.
// The normal right-click menu stays unchanged outside English words/phrases.
import learning from './EnglishLearningStore.js';
import { readingWordInfo,readingWordGrammar } from './Widget/EnglishReadingInspector.js?v=reading-inspector-20261101';

export function installEnglishQuickWords(){
  if(document.getElementById('dx-english-word-context'))return;
  const menu=document.createElement('div');
  menu.id='dx-english-word-context';
  menu.className='dx-english-word-context';
  menu.hidden=true;
  menu.setAttribute('role','menu');
  document.body.append(menu);
  const close=()=>{menu.hidden=true;menu.replaceChildren()};
  const add=(label,fn)=>{
    const item=document.createElement('button');
    item.type='button';item.textContent=label;item.setAttribute('role','menuitem');
    item.addEventListener('click',()=>{fn();close()});
    menu.append(item);return item;
  };
  const onContext=event=>{
    const widget=event.target.closest('.widget--element');
    if(!widget||event.target.closest('input,textarea,select,[contenteditable="true"]'))return;
    let phrase='';
    const selected=window.getSelection();
    if(selected&&!selected.isCollapsed&&widget.contains(selected.anchorNode)&&
      widget.contains(selected.focusNode))phrase=selected.toString().trim();
    if(!phrase){
      // For unselected text, use the browser caret hit-test at the click position.
      let point=null;
      if(document.caretPositionFromPoint){
        const c=document.caretPositionFromPoint(event.clientX,event.clientY);
        if(c)point={node:c.offsetNode,offset:c.offset};
      }else if(document.caretRangeFromPoint){
        const r=document.caretRangeFromPoint(event.clientX,event.clientY);
        if(r)point={node:r.startContainer,offset:r.startOffset};
      }
      if(point?.node?.nodeType===Node.TEXT_NODE&&widget.contains(point.node)){
        const value=point.node.nodeValue||'';
        for(const match of value.matchAll(/[A-Za-z]+(?:['’][A-Za-z]+)*/g)){
          if(point.offset>=match.index&&point.offset<=match.index+match[0].length){
            phrase=match[0];break;
          }
        }
      }
    }
    phrase=phrase.replace(/\s+/g,' ').trim();
    if(!phrase||phrase.length>120||!/[A-Za-z]{2}/.test(phrase)||
       /[<>]/.test(phrase))return;
    event.preventDefault();
    close();
    const title=document.createElement('strong');
    title.textContent=phrase;menu.append(title);
    const info=readingWordInfo(phrase);
    const grammar=readingWordGrammar(info);
    const translation=info?.meaning||'';
    const already=(learning.data.savedWords||[]).some(item=>
      item.term.toLowerCase()===phrase.toLowerCase());
    add(already?'★ В избранном (обновить)':'☆ В избранные слова',()=>{
      learning.saveWord(phrase,{translation,kind:info?.kind||'',grammarId:grammar?.id||''});
    });
    add('▶ Произнести',()=>{
      if(!('speechSynthesis' in window)||typeof SpeechSynthesisUtterance==='undefined')return;
      window.speechSynthesis.cancel();
      const utterance=new SpeechSynthesisUtterance(phrase);
      utterance.lang='en-US';utterance.rate=.85;window.speechSynthesis.speak(utterance);
    });
    menu.hidden=false;
    const width=230;
    menu.style.left=Math.max(8,Math.min(window.innerWidth-width-8,event.clientX))+'px';
    menu.style.top=Math.max(8,Math.min(window.innerHeight-128,event.clientY))+'px';
  };
  document.addEventListener('contextmenu',onContext);
  document.addEventListener('pointerdown',event=>{if(!menu.contains(event.target))close()});
  document.addEventListener('keydown',event=>{if(event.key==='Escape')close()});
}
