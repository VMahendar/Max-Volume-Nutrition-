import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
test('featured products offer real official social contact without altering checkout hooks',()=>{
 const pages=['potency-whey','nitro-mass','sturdy-pre-workout','pro-creatine'];
 const stylesheet=readFileSync('public/mvn-product-social-links.css','utf8');
 assert.match(stylesheet,/\.mvn-product-social/);
 for(const page of pages){
  const html=readFileSync('public/'+page+'.html','utf8');
  assert.match(html,/class="mvn-product-social"/,page+' social links');
  assert.match(html,/https:\/\/www\.instagram\.com\/maxvolumenutrition\//,page+' official instagram');
  assert.match(html,/https:\/\/wa\.me\/917708830513\?text=/,page+' whatsapp');
  assert.match(html,/mvn-product-social-links\.css/,page+' styling');
  assert.match(html,/data-mvn-product-order=/,page+' ordering unchanged');
 }
});