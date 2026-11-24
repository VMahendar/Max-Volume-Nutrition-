import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const source=readFileSync('public/app.js','utf8');
const body=source.slice(source.indexOf('function shopCardPrice('),source.indexOf('function card(p){'));
const sandbox={isFullShop:true,document:{body:{classList:{contains:()=>false}}},money:n=>'₹'+Number(n).toLocaleString('en-IN'),packFacts:(p,i)=>p.variants[i].facts||'',safe:x=>String(x),retailOfferMarkup:()=>'',priceMarkup:v=>v.price===null?'Coming soon':'fallback'};
vm.createContext(sandbox);vm.runInContext(body,sandbox);
test('shop pricing uses exact variant MRP, discount and known servings',()=>{
 const p={variants:[{price:5500,mrp:8599,facts:'Pack label: 24 g protein · 70 servings per pack'},{price:3499,facts:'Pack label: 50 servings per pack'},{price:null}]};
 const first=sandbox.shopCardPrice(p,0);
 assert.match(first,/₹5,500/);assert.match(first,/MRP ₹8,599/);assert.match(first,/36% off/);assert.match(first,/₹79\/serving/);
 assert.match(sandbox.shopCardFacts(p,0),/shop-fact-pill/);
 const second=sandbox.shopCardPrice(p,1);assert.match(second,/₹70\/serving/);assert.doesNotMatch(second,/mrp-value|discount-value/);
 assert.equal(sandbox.shopCardPrice(p,2),'Coming soon');
});
test('shop and source mirrors use new price presentation',()=>{
 assert.equal(readFileSync('shop.html','utf8'),readFileSync('public/shop.html','utf8'));
 assert.equal(readFileSync('app.js','utf8'),source);
 assert.match(readFileSync('public/shop.html','utf8'),/mvn-shop-price-forward-20261124\.css/);
 assert.match(source,/shopCardPrice\(p,s\.value\)/);
});
