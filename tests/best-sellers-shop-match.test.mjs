import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
test('homepage best sellers matches shop cards and original product photography',()=>{
 const home=readFileSync('public/index.html','utf8');
 const mirror=readFileSync('index.html','utf8');
 const shop=readFileSync('public/shop.html','utf8');
 const css=readFileSync('public/mvn-best-sellers-shop-match.css','utf8');
 assert.equal(home,mirror,'mirrored homepage must match');
 assert.match(home,/mvn-best-sellers-shop-match\.css/);
 const section=home.match(/<section class="mvn-preview-best mvn-home-featured"[\s\S]*?<\/section>/)?.[0];
 assert.ok(section,'Best Sellers section present');
 assert.equal((section.match(/class="mvn-best-product"/g)||[]).length,4);
 for(const src of ['mvn-hero-whey-cutout-card.webp','unicorn-pro-series-nitro-mass-5kg-double-rich-chocolate-cutout.webp','sturdy-watermelon-front-card.webp','mvn-creatine-blueberry-official-250g.webp']){
  assert.ok(section.includes(src),'homepage Best Sellers uses '+src);
  assert.ok(shop.includes(src),'Shop All uses '+src);
 }
 for(const url of ['/potency-whey.html','/nitro-mass.html','/sturdy-pre-workout.html','/pro-creatine.html'])assert.ok(section.includes(url));
 assert.match(css,/grid-template-columns:repeat\(4,minmax\(0,1fr\)\)/);
 assert.match(css,/grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
 assert.match(css,/object-fit:contain/);
 assert.match(home,/mvn-homepage-banner-20261115\.webp/,'approved hero is unchanged');
});
