import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

test('supplement store screenshot reference drives the actual homepage structure',()=>{
 const html=readFileSync('public/index.html','utf8');
 const css=readFileSync('public/mvn-supplement-store-reference.css','utf8');
 assert.match(html,/mvn-advance-layout mvn-supplement-theme/);
 assert.match(html,/mvn-shopping-bundle-20261115\.css\?v=1/,"approved reference CSS now ships inside one bundle");
 assert.match(readFileSync("public/mvn-shopping-bundle-20261115.css","utf8"),/mvn-supplement-store-reference\.css/);
 assert.match(html,/class="mvn-theme-categories"/);
 assert.match(html,/class="mvn-theme-main-nav"/);
 assert.doesNotMatch(html,/class="mvn-theme-slider-copy"/, "hero pack photo must remain unobstructed");
 assert.match(html,/class="mvn-hero-action-strip"/, "CTA lives below pack photograph");
 assert.match(html,/class="mvn-editorial-promos"/);
 assert.match(html,/class="mvn-preview-best mvn-home-featured"/,"owner-approved Best Sellers follows hero");
 assert.equal((html.match(/class="mvn-editorial-category mvn-editorial-category-/g)||[]).length,0,"old Shop by Goal no longer appears");
 assert.equal((html.match(/class="mvn-home-collection-entry"/g)||[]).length,1,"one clear collection entry point");
 assert.equal((html.match(/class="mvn-preview-best-grid"/g)||[]).length,1,"one featured products grid");
 assert.equal((html.match(/<a href="\/(?:potency-whey|pro-creatine|sturdy-pre-workout|nitro-mass)\.html">/g)||[]).length,4,"four original featured supplement links");
 assert.doesNotMatch(html,/class="mvn-advance-welcome"/,'do not insert text-heavy repeat section between goals and catalogue');
 assert.match(html,/assets\/mvn-homepage-banner-20261115\.webp/);
 assert.ok(readFileSync('public/assets/mvn-homepage-banner-20261115.webp').length>100000);
 assert.ok(html.indexOf('<section id="mvnEditorial"')<html.indexOf('class="mvn-preview-best mvn-home-featured"'),'hero before featured cards');
 assert.ok(html.indexOf('class="mvn-preview-best mvn-home-featured"')<html.indexOf('class="mvn-home-collection-entry"'),'best sellers before collection popup');
 assert.match(css,/mvn-editorial-layout\s*\{/,'split-screen campaign layout');
 assert.match(css,/mvn-editorial-promos\s*\{/,'right-side promos are styled');
 assert.match(css,/@media\(max-width:560px\)/,'Android mobile responsive layout');
});

test('existing MVN commerce, search and independent mobile app are preserved',()=>{
 const html=readFileSync('public/index.html','utf8');
 const native=readFileSync('public/mobile-app.html','utf8');
 for(const token of ['id="grid"','id="search"','id="bag"','id="shop"','id="priceRange"','id="checkoutFields"','id="drawer"'])assert.ok(html.includes(token),'retail hook '+token);
 assert.equal(readFileSync('index.html','utf8'),html,'production/public page and mirrored homepage match');
 assert.match(html,/href="dealer.html"/,"wholesale remains reachable");
 assert.equal(readFileSync('mvn-supplement-store-reference.css','utf8'),readFileSync('public/mvn-supplement-store-reference.css','utf8'));
 assert.doesNotMatch(native,/mvn-supplement-store-reference\.css/,'native app layout remains independent');
});
