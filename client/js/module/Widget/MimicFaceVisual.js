// Educational vector sketch: an illustrative drawing, not a FACS diagnostic example.
const S='http://www.w3.org/2000/svg';
const svg=(tag,attrs={},text='')=>{
 const node=document.createElementNS(S,tag);
 for(const [name,value] of Object.entries(attrs))node.setAttribute(name,String(value));
 if(text)node.textContent=text;
 return node;
};
export function createMimicFace(unitId='neutral'){
 const au=String(unitId||'neutral');
 const node=svg('svg',{viewBox:'0 0 270 248',role:'img',
  'aria-label':'Условная схема лица для движения '+au,
  class:'dx-mimic-face-svg'});
 const head=svg('ellipse',{cx:135,cy:122,rx:93,ry:111,fill:'#3c495b',stroke:'#899bb1','stroke-width':2});
 const ears=svg('g',{},'');
 ears.append(svg('ellipse',{cx:45,cy:129,rx:11,ry:23,fill:'#3c495b',stroke:'#899bb1'}),
  svg('ellipse',{cx:225,cy:129,rx:11,ry:23,fill:'#3c495b',stroke:'#899bb1'}));
 node.append(head,ears);
 const lowBrow=au==='AU4',inner=au==='AU1',outer=au==='AU2';
 const lBrow=lowBrow?'M 83 90 Q 104 98 122 105':inner?'M 82 98 Q 104 83 121 79':
   outer?'M 82 79 Q 102 88 121 98':'M 83 91 Q 102 83 120 91';
 const rBrow=lowBrow?'M 148 105 Q 167 98 188 90':inner?'M 149 79 Q 166 83 187 98':
   outer?'M 149 98 Q 168 88 188 79':'M 150 91 Q 169 83 187 91';
 const brows=svg('g',{fill:'none',stroke:'#d9e6f6','stroke-width':5,'stroke-linecap':'round'});
 brows.append(svg('path',{d:lBrow}),svg('path',{d:rBrow}));node.append(brows);
 const open=au==='AU5',tight=au==='AU7';
 const eyes=svg('g',{fill:'#f2f2ef',stroke:'#8c9eae','stroke-width':1});
 const eyeRY=open?14:tight?4:8;
 eyes.append(svg('ellipse',{cx:103,cy:113,rx:22,ry:eyeRY}),svg('ellipse',{cx:167,cy:113,rx:22,ry:eyeRY}));
 eyes.append(svg('ellipse',{cx:103,cy:114,rx:5,ry:Math.max(2,eyeRY-2),fill:'#253849'}),
  svg('ellipse',{cx:167,cy:114,rx:5,ry:Math.max(2,eyeRY-2),fill:'#253849'}));
 node.append(eyes);
 const nose=svg('path',{d:'M 134 118 Q 131 144 125 158 Q 135 165 145 158',
 fill:'none',stroke:'#b4c6d9','stroke-width':2.5,'stroke-linecap':'round'});
 node.append(nose);
 if(au==='AU9'){
  node.append(svg('path',{d:'M 117 142 l 9 4 M 144 146 l 8 -4 M 119 134 l 8 5 M 143 138 l 8 -5',
   fill:'none',stroke:'#e9d2bc','stroke-width':2.6,'stroke-linecap':'round'}));
 }
 const cheek=au==='AU6';
 if(cheek){
  node.append(svg('path',{d:'M 77 135 Q 97 129 111 135 M 160 135 Q 177 130 192 136',
   fill:'none',stroke:'#e9d2bc','stroke-width':3,'stroke-linecap':'round'}));
 }
 const mouth=svg('g',{fill:'none',stroke:'#f4bba9','stroke-width':4,'stroke-linecap':'round'});
 if(au==='AU12'||cheek)
  mouth.append(svg('path',{d:'M 94 172 Q 135 210 176 172'}));
 else if(au==='AU15')
  mouth.append(svg('path',{d:'M 94 197 Q 135 160 176 197'}));
 else if(au==='AU25')
  mouth.append(svg('ellipse',{cx:135,cy:184,rx:40,ry:10,fill:'#1e2935'}));
 else if(au==='AU26')
  mouth.append(svg('ellipse',{cx:135,cy:187,rx:39,ry:23,fill:'#1e2935'}));
 else if(au==='AU10')
  mouth.append(svg('path',{d:'M 94 183 Q 113 168 135 178 Q 155 170 176 183'}));
 else mouth.append(svg('path',{d:'M 96 181 Q 134 186 174 181'}));
 node.append(mouth);
 if(['AU1','AU2','AU4'].includes(au))node.append(svg('text',{x:135,y:30,
  'text-anchor':'middle',fill:'#f9ce88','font-size':'11'},'БРОВИ'));
 if(['AU5','AU7'].includes(au))node.append(svg('text',{x:135,y:30,
  'text-anchor':'middle',fill:'#f9ce88','font-size':'11'},'ВЕКИ'));
 if(['AU6','AU9'].includes(au))node.append(svg('text',{x:135,y:28,
  'text-anchor':'middle',fill:'#f9ce88','font-size':'11'},au==='AU9'?'НОС':'ЩЁКИ'));
 if(['AU10','AU12','AU15','AU25','AU26'].includes(au))node.append(svg('text',{x:135,y:30,
  'text-anchor':'middle',fill:'#f9ce88','font-size':'11'},'РОТ'));
 return node;
}
