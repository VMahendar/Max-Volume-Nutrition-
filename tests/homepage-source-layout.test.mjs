import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const html=readFileSync('public/index.html','utf8');
const css=readFileSync('public/mvn-showcase-shop.css','utf8');
const bundle=readFileSync('public/mvn-shopping-bundle-20261115.css','utf8');
const runtime=readFileSync('public/site-builder-runtime.js','utf8');

test('approved homepage banner is preserved',()=>{
 assert.match(html,/src="assets\/mvn-homepage-banner-20261115\.webp"/);
 assert.match(html,/class="mvn-owner-banner-img"/);
});
test('catalogue remains visible on home rather than explicitly hidden',()=>{
 assert.match(html,/<main id="shop">/);
 assert.match(html,/id="grid" class="grid"/);
 const hideBlock=css.split('display:none!important;')[0];
 assert.doesNotMatch(hideBlock,/main#shop/);
 assert.match(css,/main#shop\{\s*display:block!important;/);
 assert.match(bundle,/main#shop\{\s*display:block!important;/);
});
test('four original goal products and footer remain in homepage markup',()=>{
 for(const image of ['mvn-hero-whey-cutout-card.webp','sturdy-watermelon-front-card.webp','mvn-creatine-blueberry-official-250g.webp'])
   assert.ok(html.includes(image),image);
 assert.match(html,/mvn-home-contact/);
});
test('published editor geometry cannot hide homepage shopping sections',()=>{
 assert.match(runtime,/\['move','resize','hide','style'\]\.includes\(op\.action\)/);
 assert.match(runtime,/e\.closest\('\.storehead,\.mvn-theme-shop-goals,#shop,\.mvn-home-contact'\)/);
});
