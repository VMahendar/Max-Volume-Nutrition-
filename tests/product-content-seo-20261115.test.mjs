import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const products=[
 {path:'nitro-mass.html',heading:'Nitro Mass Gainer 3 kg and 5 kg: ordering questions',context:['3 kg jar','5 kg bucket'],links:['/dealer.html','/sturdy-pre-workout.html']},
 {path:'pro-creatine.html',heading:'Pro Creatine questions before ordering',context:['Blueberry','Cranberry','250 g'],links:['/shop.html','/dealer.html']},
 {path:'sturdy-pre-workout.html',heading:'Sturdy Pre-Workout Watermelon 250 g enquiries',context:['Watermelon','250 g'],links:['/shop.html','/dealer.html']},
 {path:'musclevite-multivitamin.html',heading:'Musclevite 60-tablet bottle: ordering questions',context:['60-tablet','ingredients'],links:['/shop.html','/dealer.html']}
];
test('each independently indexed product has unique, useful, crawlable customer help',()=>{
 for(const product of products){
  const html=readFileSync('public/'+product.path,'utf8');
  assert.ok(html.includes(product.heading),product.path);
  for(const term of product.context)assert.ok(html.includes(term),product.path+' missing '+term);
  for(const href of product.links)assert.ok(html.includes('href="'+href+'"'),product.path+' missing crawlable internal link '+href);
  assert.ok(html.includes('rel="canonical" href="https://maxvolumenutriton.shop/'+product.path+'"'));
  assert.ok(html.includes('<!-- MVN_PRODUCT_SEO -->'),'Keep live variant data and verified reviews injected by the server');
  assert.ok(!html.includes('href="https://example.com/'),'Do not link to demonstration products');
 }
});
test('retail information never advertises active payment or automated shipping',()=>{
 for(const {path} of products){
  const html=readFileSync('public/'+path,'utf8');
  assert.match(html,/payment and automated shipping remain disabled|payments and automated shipping are disabled/i,path);
 }
});
test('the Pro Creatine root mirror matches the public product page',()=>{
 assert.equal(readFileSync('pro-creatine.html','utf8'),readFileSync('public/pro-creatine.html','utf8'));
});
