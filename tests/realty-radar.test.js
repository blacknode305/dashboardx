import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeListings,filterListings,analyzeListing,analyzeListings} from '../client/js/module/Widget/RealtyRadarAnalysis.js';
const item=(n,extra={})=>({title:'Объявление '+n,url:'https://example.org/a/'+n,category:'monthly',price:100000+n*1000,
  rooms:2,area:50,address:'Гоголя, '+n,priceUnit:'month',...extra});
test('rejects invalid links and excludes malformed prices',()=>{
 const r=normalizeListings([item(1),item(2,{url:'javascript:alert(1)'}),item(3,{price:0})]);
 assert.equal(r.length,1);
});
test('keeps buyout distinct and filters by budget, streets and rooms',()=>{
 const rows=normalizeListings([item(1),item(2,{category:'rent_to_own'}),item(3,{price:155000}),item(4,{rooms:3,address:'Лободы, 5'})]);
 assert.equal(filterListings(rows,{tab:'monthly',maxPrice:150000,rooms:[2],streets:['Гоголя']}).length,1);
 assert.equal(filterListings(rows,{tab:'buyout'}).length,1);
});
test('does not invent a market discount from one comparable',()=>{
 const rows=normalizeListings([item(1),item(2)]);
 assert.equal(analyzeListing(rows[0],rows).discount,null);
});
test('benchmark is based on compatible listings, excluding the candidate',()=>{
 const rows=normalizeListings([
 item(1,{price:70000}),item(2,{price:100000}),item(3,{price:100000}),item(4,{price:100000})
 ]);
 const analyzed=analyzeListing(rows[0],rows);
 assert.equal(analyzed.median,102000);
 assert.ok(analyzed.discount>25);
});
test('sale price per square meter; short-term units are kept separate',()=>{
 const rows=normalizeListings([item(1,{category:'sale',price:20000000,priceUnit:'total',area:50}),
 item(2,{category:'short',price:12000,priceUnit:'day'}),item(3,{category:'short',price:2000,priceUnit:'hour'})]);
 assert.equal(rows.find(x=>x.tab==='sale').priceUnit,'total');
 assert.equal(analyzeListings(rows,{tab:'sale'})[0].unitCost,400000);
 assert.equal(filterListings(rows,{tab:'short'}).length,2);
});
