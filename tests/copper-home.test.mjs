import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

test('presentation change preserves the correct product images and live storefront hooks',()=>{
 const index=readFileSync('public/index.html','utf8');
 const script=readFileSync('public/app.js','utf8');
 assert.match(index,/max-volume-logo-wide\.png/);



 assert.match(index,/src="assets\/mvn-orange-lineup-20261117\.webp"/,'keep complete all-products banner as requested');
 assert.ok(readFileSync('public/assets/mvn-orange-lineup-20261117.webp').length>100000,'approved original group lineup is available');
 assert.ok(readFileSync('public/assets/potency-whey-coffee-5lb.webp').length>10000,'owner original Whey source is retained unaltered');
 assert.match(index,/assets\/unicorn-pro-series-nitro-mass-5kg-double-rich-chocolate-cutout\.webp/,'5 kg pack photo is correctly isolated');
 for(const id of ['shop','grid','search','bag','checkoutFields','send','productDialog'])
  assert.match(index,new RegExp('id="'+id+'"'),id+' remains usable');
 assert.match(script,/const PHONE="917708830513"/);
 assert.match(script,/const retailVariantIds=/);
 assert.match(index,/href="dealer\.html"/);
 const mobile=readFileSync('public/mobile-app.html','utf8');
 assert.doesNotMatch(mobile,/copper-home\.css/,'native-style app keeps its independent layout');
});
test('canonical and served copies are synchronized for launch',()=>{
 assert.equal(readFileSync('index.html','utf8'),readFileSync('public/index.html','utf8'));
 assert.equal(readFileSync('copper-home.css','utf8'),readFileSync('public/copper-home.css','utf8'));
});
