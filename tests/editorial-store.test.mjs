import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

test('store remains a multi-brand retailer and does not make unverified territory claims',()=>{
 const index=readFileSync('public/index.html','utf8');
 assert.match(index,/UNICORN PRO SERIES/,'current verified brand displayed');
 assert.match(index,/GLOB TECH is on our upcoming-brand roadmap/,'upcoming brand clearly labelled');
 assert.doesNotMatch(index,/Max Volume Nutrition is the authorized exclusive distributor for Tamil Nadu and Puducherry/);



 assert.match(index,/src="assets\/mvn-banner-20261115-no-logo-no-pineapple\.webp"/,'keep complete all-products banner as requested');
 assert.ok(readFileSync('public/assets/mvn-banner-20261115-no-logo-no-pineapple.webp').length>100000,'approved original group lineup is available');
 assert.ok(readFileSync('public/assets/potency-whey-coffee-5lb.webp').length>10000,'original Potency Whey source photo remains preserved');
 assert.match(index,/assets\\/unicorn-pro-series-nitro-mass-5kg-double-rich-chocolate-cutout\\.webp/,'5 kg pack photo is correctly isolated');
 for(const id of ['search','q','bag','shop','grid','priceRange','sort','drawer','checkoutFields','certificate','brands','dealer']){
  assert.ok(index.includes('id="'+id+'"'),'functional anchor kept: '+id);
 }
 assert.match(index,/href="wholesale-account\.html"/);
 assert.match(index,/href="dealer\.html"/);
 assert.doesNotMatch(readFileSync('public/mobile-app.html','utf8'),/editorial-store\.css/,'mobile app retains independent app layout');
});
test('two homepage source copies and their editorial styles are in sync',()=>{
 assert.equal(readFileSync('index.html','utf8'),readFileSync('public/index.html','utf8'));
 assert.equal(readFileSync('editorial-store.css','utf8'),readFileSync('public/editorial-store.css','utf8'));
});
