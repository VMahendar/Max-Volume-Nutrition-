import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {buildProductFragments,PRODUCT_PAGE_IDS} from '../product-seo.mjs';

const catalogue=[
 {id:'potency-whey',name:'Potency Whey',brand:'Unicorn Pro Series',description:'Whey protein for training.',
  variants:[{id:'whey-coffee',label:'Coffee · 5 lb',pricePaise:550000},{id:'whey-chocolate',label:'Chocolate · 5 lb',pricePaise:550000}]},
 {id:'nitro-mass',name:'Nitro Mass',brand:'Unicorn Pro Series',description:'Mass gainer.',
  variants:[{id:'mass-3kg',label:'3 kg',pricePaise:259900},{id:'mass-5kg',label:'5 kg',pricePaise:349900}]}
];
const schema=fragment=>JSON.parse(fragment.schema.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);

test('rich product snippet uses real catalog retail offers and visible matching prices',()=>{
 const whey=buildProductFragments('/potency-whey.html',catalogue,[]);
 assert.equal(whey.productId,'potency-whey');
 assert.equal(whey.reviewCount,0);
 const data=schema(whey);
 assert.equal(data['@type'],'Product');
 assert.equal(data.offers['@type'],'Offer');
 assert.equal(data.offers.price,'5500.00');
 assert.equal(data.offers.priceCurrency,'INR');
 assert.equal(data.aggregateRating,undefined,'Never invent stars');
 assert.equal(data.review,undefined,'Never invent review text');
 assert.equal(data.offers.availability,undefined,'Never claim unknown stock');
 assert.ok(whey.content.includes('₹5,500'));
 assert.ok(whey.content.includes('No published customer reviews yet'));
 const mass=buildProductFragments('/nitro-mass.html',catalogue,[]);
 const group=schema(mass);
 assert.equal(group['@type'],'ProductGroup');
 assert.equal(group.productGroupID,'nitro-mass');
 assert.deepEqual(group.variesBy,['https://schema.org/size']);
 assert.deepEqual(group.hasVariant.map(v=>v.sku),['mass-3kg','mass-5kg']);
 assert.deepEqual(group.hasVariant.map(v=>v.offers.price),['2599.00','3499.00']);
 assert.deepEqual(group.hasVariant.map(v=>v.offers.url),[
  'https://maxvolumenutriton.shop/nitro-mass.html?pack=3kg',
  'https://maxvolumenutriton.shop/nitro-mass.html?pack=5kg'
 ]);
 assert.ok(!group.aggregateRating,'Do not invent Nitro Mass reviews');
 assert.ok(!group.hasVariant.some(v=>v.offers.availability),'Do not invent Nitro stock');
 assert.ok(mass.gallery.includes('₹2,599'));
 assert.ok(mass.gallery.includes('₹3,499'));
 assert.ok(mass.gallery.includes('mass-3kg-double-rich-chocolate-cutout.webp'));
 assert.ok(mass.gallery.includes('mass-5kg-double-rich-chocolate-cutout.webp'));
});

test('only approved genuine reviews are shown and reflected in JSON-LD',()=>{
 const reviews=[
  {status:'approved',rating:5,title:'Good quality',body:'Worked well in my routine, consistent product.',created:'2026-11-14T00:00:00Z',name:'Customer One'},
  {status:'rejected',rating:1,title:'hidden',body:'unapproved review text',created:'2026-11-14',name:'Someone'},
  {status:'approved',rating:3,title:'It was fine',body:'Review with <script>alert(1)</script> markup',created:'2026-11-14',name:'Customer Two'}
 ];
 const rendered=buildProductFragments('/potency-whey.html',catalogue,reviews);
 const data=schema(rendered);
 assert.equal(rendered.reviewCount,2);
 assert.equal(data.aggregateRating.ratingValue,4);
 assert.equal(data.aggregateRating.reviewCount,2);
 assert.equal(data.review.length,2);
 assert.equal(data.review[0].author.name,'Customer');
 assert.ok(!rendered.content.includes('unapproved review text'));
 assert.ok(rendered.content.includes('&lt;script&gt;'));
 assert.ok(!rendered.content.includes('<script>alert(1)</script>'));
 assert.ok(!rendered.schema.includes('</script><script>alert'));
});

test('if no real price and no approved review, do not emit invalid Product schema',()=>{
 const result=buildProductFragments('/potency-whey.html',[{...catalogue[0],variants:[]}],[]);
 assert.equal(result.schema,'');
 assert.ok(result.content.includes('confirm the price'));
 assert.equal(buildProductFragments('/unknown.html',catalogue,[]),null);
});

test('public product pages host a single server rendered snippet and review interface',()=>{
 const server=readFileSync('server.mjs','utf8');
 assert.ok(server.includes("buildProductFragments(u.pathname,C.catalogue(null),approved,{selectedPack:u.searchParams.get('pack')})"));
 assert.ok(server.includes("r.status='approved'"));
 for(const path of Object.keys(PRODUCT_PAGE_IDS)){
  const html=readFileSync('public'+path,'utf8');
  assert.ok(html.includes('<!-- MVN_PRODUCT_SEO -->'),path+' missing schema hook');
  assert.ok(html.includes('<!-- MVN_PRODUCT_DETAILS -->'),path+' missing visible details hook');
  assert.ok(html.includes('/product-reviews.js?v=20261115-1'),path+' review JavaScript missing');
  assert.ok(html.includes('/product-reviews.css?v=20261115-1'),path+' responsive review stylesheet missing');
  assert.ok(!/<script type="application\/ld\+json">\s*\{"@context":"https:\/\/schema.org","@type":"Product"/.test(html),'Do not publish stale static Product offers');
 }
});

test('Nitro pack URL preselection picks matching photo, price and enquiry without changing canonical',()=>{
 const pack3=buildProductFragments('/nitro-mass.html',catalogue,[],{selectedPack:'3kg'});
 const pack5=buildProductFragments('/nitro-mass.html',catalogue,[],{selectedPack:'5kg'});
 assert.ok(pack3.gallery.includes('nitro-pack-card is-selected&quot;')===false);
 assert.match(pack3.gallery,/nitro-pack-card is-selected" id="nitro-3kg"/);
 assert.match(pack5.gallery,/nitro-pack-card is-selected" id="nitro-5kg"/);
 assert.ok(pack3.gallery.includes('Enquire about 3 kg'));
 assert.equal(schema(pack3).url,'https://maxvolumenutriton.shop/nitro-mass.html');
 const page=readFileSync('public/nitro-mass.html','utf8');
 assert.ok(page.includes('<!-- MVN_NITRO_GALLERY -->'));
 assert.ok(page.includes('rel="canonical" href="https://maxvolumenutriton.shop/nitro-mass.html"'));
});

test('static assets gain caching but protected staging and HTML remain uncached',()=>{
 const server=readFileSync('server.mjs','utf8');
 assert.ok(server.includes("if(process.env.STAGING_MODE!=='true')"));
 assert.ok(server.includes('max-age=604800'),'public static media and versioned CSS get longer cache lifetimes');
 assert.ok(server.includes('max-age=2592000'),'dated static media and icons get month-long cache');
 assert.ok(server.includes('Content-Encoding'),'Brotli/Gzip response compression remains enabled');
 assert.ok(server.includes('Vary'),'correct CDN vary semantics');
 assert.ok(server.includes('must-revalidate'));
 assert.ok(server.includes("res.setHeader('Cache-Control','no-store')"));
});
