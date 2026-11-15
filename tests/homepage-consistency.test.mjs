import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
test('screenshot reference maintains a consistent scrolling storefront without duplicated Whey panels',()=>{
 const html=readFileSync('public/index.html','utf8'),css=readFileSync('public/mvn-supplement-store-reference.css','utf8');
 assert.match(html,/mvn-supplement-store-reference\.css\?v=20261115-ref1/);
 assert.match(html,/SHOP BY <em>GOAL<\/em>/);
 assert.equal((html.match(/class="mvn-theme-goal-art"/g)||[]).length,3);
 assert.doesNotMatch(html,/class="mvn-advance-welcome"/,'no redundant large product/promo panel');
 assert.doesNotMatch(html,/option2-shop-heading/,'obsolete blue heading sidebar absent');
 assert.match(html,/id="shop"/,'catalogue remains lower in page');
 assert.match(css,/#shop \.collection-results \.card/,'catalogue style is retained');
 assert.match(css,/\.mvn-theme-main-nav/,'site navigation follows the reference');
 assert.match(css,/\.mvn-editorial-promos/,'two right promo banners follow the reference');
 assert.equal(readFileSync('index.html','utf8'),html,'mirrored HTML remains synchronized');
});
test('five product families, filters, cart and WhatsApp remain discoverable',()=>{
 const html=readFileSync('public/index.html','utf8');
 for(const v of ['id="grid"','id="sort"','id="priceRange"','id="collectionTitle"','id="activeFilters"','id="bag"','id="drawer"','id="checkoutFields"','id="send"'])assert.ok(html.includes(v),'retail hook '+v);
 for(const src of ['mvn-hero-whey-cutout-card.webp','sturdy-watermelon-front-card.webp','mvn-hero-creatine-cutout-card.webp','musclevite-front.webp'])assert.ok(html.includes(src),'real product imagery '+src);
 assert.match(html,/assets\/mvn-banner-20261115-no-logo-no-pineapple\.webp/);
});
