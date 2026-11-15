import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

test('store remains a multi-brand retailer and does not make unverified territory claims',()=>{
 const index=readFileSync('public/index.html','utf8');
 assert.match(index,/UNICORN PRO SERIES/,'current verified brand displayed');
 assert.match(readFileSync('public/brands.html','utf8'),/GLOB TECH is on the Max Volume Nutrition upcoming-brand roadmap/,'upcoming brand clearly labelled on its own page');
 assert.match(index,/href="brands.html"/,'homepage links to the brand page instead of expanding it inline');
 assert.doesNotMatch(index,/Max Volume Nutrition is the authorized exclusive distributor for Tamil Nadu and Puducherry/);



 assert.match(index,/src="assets\/mvn-homepage-banner-20261115\.webp"/,'keep complete all-products banner as requested');
 assert.ok(readFileSync('public/assets/mvn-homepage-banner-20261115.webp').length>100000,'approved original group lineup is available');
 assert.ok(readFileSync('public/assets/potency-whey-coffee-5lb.webp').length>10000,'original Potency Whey source photo remains preserved');
 assert.match(index,/assets\/unicorn-pro-series-nitro-mass-5kg-double-rich-chocolate-cutout\.webp/,'5 kg pack photo is correctly isolated');
 for(const id of ['search','q','bag','shop','grid','priceRange','sort','drawer','checkoutFields']){
  assert.ok(index.includes('id="'+id+'"'),'functional anchor kept: '+id);
 }
 assert.match(index,/href="wholesale-account\.html"/);
 const about=readFileSync("public/about.html","utf8");
 assert.match(about,/id="certificate"/,"certificate is now presented within About Us");
 assert.match(about,/assets\/IMG-20261102-WA0019\.jpg/,"original certificate kept");
 assert.match(index,/href="dealer\.html"/);
 assert.doesNotMatch(readFileSync('public/mobile-app.html','utf8'),/editorial-store\.css/,'mobile app retains independent app layout');
});
test('two homepage source copies and their editorial styles are in sync',()=>{
 assert.equal(readFileSync('index.html','utf8'),readFileSync('public/index.html','utf8'));
 assert.equal(readFileSync('editorial-store.css','utf8'),readFileSync('public/editorial-store.css','utf8'));
});
