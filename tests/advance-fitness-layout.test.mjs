import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

test('MVN homepage uses an adapted Advance Fitness Gym page structure',()=>{
  const html=readFileSync('public/index.html','utf8');
  const css=readFileSync('public/mvn-advance-layout.css','utf8');
  assert.match(html,/<body class="retail-home mvn-fitness-refresh mvn-advance-layout">/);
  assert.match(html,/mvn-advance-layout\.css\?v=20261115-theme-layout-1/);
  assert.match(html,/class="mvn-advance-hero-title"/);
  assert.match(html,/class="mvn-advance-welcome"/);
  assert.match(html,/assets\/mvn-banner-20261115-no-logo-no-pineapple\.webp/);
  assert.match(html,/class="mvn-editorial-category-grid"/);
  assert.equal((html.match(/class="mvn-advance-service-icon"/g)||[]).length,4);
  assert.ok(html.indexOf('class="mvn-editorial"') < html.indexOf('class="mvn-editorial-categories"'),'hero comes before features');
  assert.ok(html.indexOf('class="mvn-editorial-categories"') < html.indexOf('class="mvn-advance-welcome"'),'features before welcome');
  assert.ok(html.indexOf('class="mvn-advance-welcome"') < html.indexOf('id="shop"'),'welcome before retail products');
  assert.match(css,/\.mvn-editorial-promos\s*\{\s*display:\s*none !important/);
  assert.match(css,/\.mvn-editorial-layout\s*\{\s*display:\s*block !important/);
  assert.match(css,/@media \(max-width: 700px\)/);
});

test('commerce and independent app layout survive the theme adaptation',()=>{
  const html=readFileSync('public/index.html','utf8');
  const native=readFileSync('public/mobile-app.html','utf8');
  for(const token of ['id="grid"','id="search"','id="bag"','id="shop"','id="priceRange"','id="dealer"','id="checkoutFields"','id="drawer"']) {
    assert.ok(html.includes(token),'customer-facing commerce hook retained: '+token);
  }
  assert.equal(readFileSync('index.html','utf8'),html,'canonical and served homepages stay synchronized');
  assert.equal(readFileSync('mvn-advance-layout.css','utf8'),readFileSync('public/mvn-advance-layout.css','utf8'),'theme CSS is mirrored');
  assert.doesNotMatch(native,/mvn-advance-layout\.css/,'installed app remains independent');
});
