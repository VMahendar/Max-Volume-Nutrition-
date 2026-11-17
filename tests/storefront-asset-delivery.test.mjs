import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,statSync} from 'node:fs';
import {brotliCompressSync,constants} from 'node:zlib';

const root=readFileSync('index.html','utf8');
const home=readFileSync('public/index.html','utf8');
const shop=readFileSync('public/shop.html','utf8');
const bundle=readFileSync('public/mvn-shopping-bundle-20261115.css','utf8');
const cssParts=[
  'mvn-home-layout.bundle.css',
  'mvn-advance-layout.css',
  'mvn-homepage-consistency.css',
  'mvn-supplement-store-reference.css',
  'mvn-info-pages.css',
  'mvn-storefront-cleanup.css',
  'mvn-showcase-shop.css'
];

test('homepage uses its focused theme while shop retains the ordered CSS bundle',()=>{
 assert.equal(root,home,'root and served homepage remain byte-identical');
 assert.equal(readFileSync('shop.html','utf8'),shop,'shop preview and served page remain byte-identical');
 assert.ok(home.includes('href="/mvn-orange-home-20261117.css?v=4"'),'replacement homepage uses its own responsive skin');
 for(const file of [shop]){
  assert.ok(file.includes('href="/mvn-shopping-bundle-20261115.css?v=1"'),'optimized CSS is linked');
  for(const name of cssParts)assert.ok(!file.includes('href="/'+name+'?'),'separate blocking '+name+' request was removed');
 }
 let previous=-1;
 for(const name of cssParts){
  const marker='/* BEGIN '+name+' */';
  const index=bundle.indexOf(marker);
  assert.ok(index>previous,'styles keep their cascade order: '+name);
  assert.ok(bundle.includes(readFileSync('public/'+name,'utf8').trim()),'source CSS retained verbatim: '+name);
  previous=index;
 }
 assert.equal(readFileSync('mvn-shopping-bundle-20261115.css','utf8'),bundle,'static preview has equivalent styles');
 const br=brotliCompressSync(Buffer.from(bundle),{params:{[constants.BROTLI_PARAM_QUALITY]:4}});
 assert.ok(br.length<110_000,'CSS bundle can be served as Brotli within a practical network budget');
});

test('responsive supplied lineup and optimized product images reduce transfer',()=>{
 const bytes=name=>statSync('public/assets/'+name).size;
 const original=bytes('mvn-orange-lineup-20261117.webp');
 assert.ok(bytes('mvn-orange-lineup-20261117-768.webp')<original*.6,'mobile uses a substantially smaller, exact original banner');

 assert.ok(bytes('mvn-creatine-blueberry-official-250g.webp')<75_000,'Blueberry manufacturer photo is optimized as same-origin WebP');
 assert.ok(bytes('mvn-hero-nitro-cutout-card.webp')<bytes('unicorn-pro-series-nitro-mass-3kg-double-rich-chocolate-cutout.webp'),'Nitro promo uses lightweight correct 3kg pack');
 assert.ok(home.includes('imagesrcset="/assets/mvn-orange-lineup-20261117-768.webp 768w'),'responsive banner preloaded');
 assert.ok(home.includes('srcset="assets/mvn-orange-lineup-20261117-768.webp 768w'),'responsive image candidates available');
 assert.ok(home.includes('fetchpriority="high"'),'LCP banner is prioritized');
 assert.ok(!home.includes('revakanya.com/assets/imgs/Pro%20Creatine%20Blueberry.png'),'homepage never requests the external full-size PNG');
});

test('static caching and compression do not enable caching private user data',()=>{
 const server=readFileSync('server.mjs','utf8');
 assert.ok(server.includes('brotliCompressSync'),'Brotli compression used for compressible assets');
 assert.ok(server.includes("res.setHeader('Vary','Accept-Encoding')"),'encodings keep separate caches');
 assert.ok(server.includes('max-age=2592000'),'dated media have monthly cache');
 assert.ok(server.includes('max-age=604800'),'other public assets have weekly cache');
 assert.ok(server.includes("res.setHeader('Cache-Control','no-store')"),'personalized requests default to no-store');
 assert.ok(server.includes("if(process.env.STAGING_MODE!=='true')"),'staging remains uncached');
});
