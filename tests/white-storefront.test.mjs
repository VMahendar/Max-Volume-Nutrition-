import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');

test('retail flagship keeps original logo, integrates masthead and leads with products',()=>{
 const html=read('public/index.html'),css=read('public/flagship.css');
 assert.ok(html.includes('<link rel="stylesheet" href="/mvn-orange-home-20261117.css?v=7">'));
 assert.ok(read('public/mvn-home-base.bundle.css').includes('/* flagship.css — source of truth */'),'flagship styling retained inside the cacheable homepage bundle');
 assert.match(css,/background:#fff!important/,'white retail shopping canvas');
 assert.match(css,/\.retail-home \.storehead\{\s*background:var\(--mvn-night\)!important/);
 assert.match(css,/\.retail-home \.brand-identity\{\s*background:transparent!important/,'logo has no separate pasted-on backdrop');
 assert.match(css,/background-image:url\('max-volume-logo-wide.png'\)/,'original source artwork is scaled as a continuous masthead image');
 assert.match(css,/mix-blend-mode:screen/,'original black-background logo integrates with masthead');
 assert.match(css,/\.retail-home \.placeholder\[hidden\]/,'hidden placeholders must remain hidden after a real product image loads');
 assert.ok(html.includes('src="mvn-app-header-logo.webp"'),'approved original MVN header image is retained without repeating it in a huge footer');
 assert.ok(html.includes('FUEL EVERY<br><strong>REP.</strong>'),'product-first hero rather than duplicating company name');
 assert.ok(!html.includes('distribution-feature'),'repeated Unicorn promotion removed');
 assert.ok(!html.includes('category-tiles'),'no duplicated category lists');
 assert.match(html,/section class="benefits" aria-label="Shop by category"/);
 assert.ok(html.includes('href="dealer.html"'),'dealer destination retained');
 assert.ok(html.includes('UNICORN PRO SERIES'),'genuine brand retained in product and distributor context');
});

test('homepage excludes demonstrably incorrect product photos and retains verified stock imagery',()=>{
 const html=read('public/index.html'),app=read('public/app.js'),both=html+'\n'+app;
 const seed=JSON.parse(read('data/products.json'));
 const pub=JSON.parse(read('public/catalog.json'));
 assert.ok(!both.includes('static.wixstatic.com'),'no stale Wix-hosted hero or product photos');
 for(const name of ['potency-whey-coffee-5lb.webp','unicorn-pro-series-nitro-mass-3kg-double-rich-chocolate-cutout.webp','unicorn-pro-series-nitro-mass-5kg-double-rich-chocolate-cutout.webp']){
  assert.ok(existsSync(new URL('../public/assets/'+name,import.meta.url)),name+' exists');
  assert.ok(both.includes('assets/'+name),name+' used');
 }
 for(const wrong of ['assets/sturdy-pre-workout.png']){
  assert.ok(!both.includes(wrong),'incorrect-size/flavour photograph must never show on storefront: '+wrong);
 }
 for(const source of [seed,pub]){
  const sturdy=source.find(p=>p.id==='sturdy-pre');
  const watermelon=sturdy.variants.find(v=>v.id==='pre-watermelon');
  assert.equal(sturdy.image,'assets/sturdy-watermelon-front.webp','Watermelon uses the actual matched pack image');
  assert.equal(watermelon.image,'assets/sturdy-watermelon-front.webp');
  assert.deepEqual(watermelon.images.map(image=>image.src),['assets/sturdy-watermelon-front.webp','assets/sturdy-watermelon-back.webp']);
  assert.equal(source.find(p=>p.id==='pro-creatine').variants.find(v=>v.id==='creatine-cranberry').image,'assets/pro-creatine.png');
 }
 assert.ok(existsSync(new URL('../data/image-assets/sturdy-watermelon-front.webp.b64',import.meta.url)),'isolated Sturdy front is stored in repo');
 assert.ok(existsSync(new URL('../data/image-assets/sturdy-watermelon-back.webp.b64',import.meta.url)),'isolated original back is stored in repo');
 assert.ok(app.includes('assets/sturdy-watermelon-front.webp'));
 assert.match(app,/3 kg · Double Rich Chocolate",price:2599,img:"assets\/unicorn-pro-series-nitro-mass-3kg-double-rich-chocolate-cutout\.webp"/,'3 kg must use its own verified jar photo');
 assert.match(app,/5 kg · Bucket",price:3499,img:"assets\/unicorn-pro-series-nitro-mass-5kg-double-rich-chocolate-cutout\.webp/,'5 kg must use its own bucket cutout');
 assert.match(app,/Chocolate · 5 lbs.*?img:null/,'Chocolate must not use Coffee photo');
 assert.match(app,/Blueberry · 250 g.*?img:"assets\/mvn-creatine-blueberry-official-250g\.webp"/,'Blueberry uses manufacturer original white-and-blue pack');
});

test('public retail offers use verified MRP and keep confidential wholesale pricing private',()=>{
 const app=read('public/app.js'),seed=JSON.parse(read('public/catalog.json'));
 assert.match(app,/mrp:8599/);assert.match(app,/mrp:1499/);
 assert.ok(app.includes('function priceMarkup(v)'));
 assert.ok(app.includes('class="discount-value"'));
 const whey=seed.find(p=>p.id==='potency-whey').variants;
 assert.deepEqual(whey.map(v=>v.mrpPaise),[859900,859900]);
 assert.deepEqual(whey.map(v=>v.pricePaise),[550000,550000]);
 assert.ok(seed.find(p=>p.id==='nitro-mass').variants.every(v=>v.mrpPaise===undefined),'never invent Nitro MRP');
 assert.ok(!app.includes('wholesale":'),'wholesale prices cannot ship in public JS');
});
