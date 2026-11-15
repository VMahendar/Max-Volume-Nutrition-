import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

test('full homepage uses one fitness design and avoids repeat Whey marketing photo',()=>{
  const html=readFileSync('public/index.html','utf8');
  const css=readFileSync('public/mvn-homepage-consistency.css','utf8');
  assert.match(html,/mvn-homepage-consistency\.css\?v=20261115-1/,'new presentation layer is loaded last');
  assert.match(html,/mvn-home-feature-stack/,'welcome has value statements instead of repeated product image');
  const welcome=html.match(/<section class="mvn-advance-welcome"[\s\S]*?<\/section>/)?.[0]||'';
  assert.doesNotMatch(welcome,/<img /,'no extra Potency Whey image between banner and catalogue');
  assert.doesNotMatch(html,/option2-shop-heading/,'old duplicate sidebar title removed');
  assert.match(css,/#shop > \.section-title/,'shop heading continues the theme');
  assert.match(css,/#shop \.collection-results #grid/,'retail grid is restyled');
  assert.match(css,/\.offers-hub/,'offers carry theme through lower sections');
  assert.match(css,/\.site-footer/,'footer carries consistent accent');
  assert.equal(readFileSync('index.html','utf8'),html,'mirror HTML is in sync');
  assert.equal(readFileSync('mvn-homepage-consistency.css','utf8'),css,'mirror CSS is in sync');
});

test('the existing five-product catalogue and interaction hooks survive layout cleanup',()=>{
  const html=readFileSync('public/index.html','utf8');
  for(const v of ['id="grid"','id="sort"','id="priceRange"','id="collectionTitle"','id="activeFilters"','id="bag"','id="drawer"','id="checkoutFields"','id="send"']) {
    assert.ok(html.includes(v),'retained interactive hook: '+v);
  }
  for(const src of ['mvn-hero-whey-cutout-card.webp','sturdy-watermelon-front-card.webp','mvn-hero-creatine-cutout-card.webp','musclevite-front.webp']) {
    assert.ok(html.includes(src),'preserved original product asset: '+src);
  }
  assert.match(html,/assets\/mvn-banner-20261115-no-logo-no-pineapple\.webp/);
});
