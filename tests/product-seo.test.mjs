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
 assert.equal(schema(mass).offers['@type'],'Offer');
 assert.equal(schema(mass).offers.price,'3499.00','Offer must refer to the displayed 5 kg image/pack');
 assert.ok(mass.content.includes('₹2,599'));
 assert.ok(mass.content.includes('₹3,499'));
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
 assert.ok(server.includes('buildProductFragments(u.pathname,C.catalogue(null),approved)'));
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

test('static assets gain caching but protected staging and HTML remain uncached',()=>{
 const server=readFileSync('server.mjs','utf8');
 assert.ok(server.includes("if(process.env.STAGING_MODE!=='true')"));
 assert.ok(server.includes('max-age=3600'));
 assert.ok(server.includes('max-age=86400'));
 assert.ok(server.includes("res.setHeader('Cache-Control','no-store')"));
});
