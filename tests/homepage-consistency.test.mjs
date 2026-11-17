import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
test('screenshot reference maintains a consistent scrolling storefront without duplicated Whey panels',()=>{
 const html=readFileSync('public/index.html','utf8'),css=readFileSync('public/mvn-supplement-store-reference.css','utf8');
 assert.match(html,/mvn-orange-home-20261117\.css\?v=6/);
 assert.match(html,/id="mvnBestSellers">BEST SELLERS/);
 assert.equal((html.match(/class="mvn-home-collection-entry"/g)||[]).length,1);
 assert.equal((html.match(/class="mvn-preview-best-grid"/g)||[]).length,1);
 assert.match(html,/id="mvnCollectionDialog"/,"collection opens an accessible modal");
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
 for(const src of ['mvn-hero-whey-cutout-card.webp','sturdy-watermelon-front-card.webp','musclevite-front-20261116.webp'])assert.ok(html.includes(src),'real product imagery '+src);
 assert.match(html,/assets\/mvn-orange-lineup-20261117\.webp/);
 assert.match(html,/mvn-creatine-blueberry-official-250g\.webp/,'original Blueberry pack served as optimized same-origin WebP');
});
