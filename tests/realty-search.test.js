import test from 'node:test';
import assert from 'node:assert/strict';
import {makePlan,parsePrice,parseArea,parseRooms,parseSearchHit,extractSearchItems} from '../realty-search/search.mjs';
test('rotating street scans cover all 4 streets without scraping',()=>{
 const first=makePlan(0,20).filter(x=>x.category==='monthly').map(x=>x.query).join(' ');
 const next=makePlan(1,20).filter(x=>x.category==='monthly').map(x=>x.query).join(' ');
 assert.match(first,/Гоголя/);assert.match(first,/Лободы/);
 assert.match(next,/Ерубаева/);assert.match(next,/Нуркена Абдирова/);
});
test('price, rooms and area are extracted from indexed snippets',()=>{
 assert.equal(parsePrice('Сдам 2-комнатную — 120 000 ₸/мес.'),120000);
 assert.equal(parsePrice('Квартира 9.5 млн тенге'),9500000);
 assert.equal(parseArea('48,5 м²'),48.5);assert.equal(parseRooms('2-комнатная квартира'),2);
});
test('only individual listing URLs from supported hosts are accepted',()=>{
 const task={site:'krisha',category:'monthly'};
 const hit={url:'https://krisha.kz/a/show/12345',title:'Аренда квартиры 2-комнатная Гоголя 120 000 ₸',description:'Караганда, Гоголя 41 48 м²'};
 assert.equal(parseSearchHit(hit,task).price,120000);
 assert.equal(parseSearchHit({...hit,url:'https://krisha.kz/arenda/kvartiry/karaganda/'},task),null);
 assert.equal(parseSearchHit({...hit,url:'https://evil.example/a/show/1234'},task),null);
});
test('buyout cannot be inferred from just the search term',()=>{
 const hit={url:'https://www.olx.kz/d/obyavlenie/test-IDabc.html',title:'Сдам квартиру',description:'Аренда в Караганде'};
 assert.equal(parseSearchHit(hit,{site:'olx',category:'buyout'}),null);
 assert.equal(parseSearchHit({...hit,description:'Аренда с последующим выкупом'},{site:'olx',category:'buyout'}).category,'buyout');
});
test('API validates task status and organic results only',()=>{
 const task={site:'kn',category:'sale'};
 const hit={type:'organic',url:'https://www.kn.kz/card/12345',title:'Продажа квартиры Караганда 15 млн тенге',description:'1-комнатная квартира 40 м2'};
 const response={status_code:20000,tasks:[{status_code:20000,result:[{items:[hit,{...hit,type:'ads'}]}]}]};
 assert.equal(extractSearchItems(response,task).length,1);
 assert.throws(()=>extractSearchItems({status_code:40000},task));
});
