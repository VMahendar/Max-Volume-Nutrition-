import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=path=>readFileSync('public/'+path,'utf8');
const home=read('index.html');
const shop=read('shop.html');
const products=[
 ['Potency Whey','potency-whey.html','whey'],
 ['Nitro Mass','nitro-mass.html','mass'],
 ['Sturdy Pre-Workout','sturdy-pre-workout.html','pre'],
 ['Pro Creatine','pro-creatine.html','creatine'],
 ['Musclevite Multivitamin','musclevite-multivitamin.html','vitamins']
];
test('one homepage H1 and root shop and app mirrors remain identical',()=>{
 assert.equal(home,readFileSync('index.html','utf8'));
 assert.equal(shop,readFileSync('shop.html','utf8'));
 assert.equal(read('app.js'),readFileSync('app.js','utf8'));
 assert.equal(home.split('<h1 ').length-1,1);
 assert.ok(home.includes('<h1 id="mvnEditorialTitle"'));
});
test('product names link to detail pages in static and dynamic cards while cart remains',()=>{
 const script=read('app.js');
 for(const [name,url,id] of products){
  for(const html of [home,shop])assert.ok(html.includes('<h3><a href="'+url+'">'+name+'</a></h3>'),name+' missing detail link');
  assert.ok(script.includes(id+":'"+url+"'"),id+' missing dynamic link');
 }
 assert.ok(script.includes('data-detail'));
 assert.ok(script.includes('ADD TO CART'));
});
test('descriptions and titles are concise while draft policies remain noindex',()=>{
 for(const path of ['index.html','shop.html','dealer.html','nitro-mass.html','pro-creatine.html','sturdy-pre-workout.html','musclevite-multivitamin.html']){
  const html=read(path);
  const desc=html.match(/<meta name="description" content="([^"]+)"/)?.[1];
  const title=html.split('<title>')[1]?.split('</title>')[0]?.replaceAll('&amp;','&');
  assert.ok(desc && desc.length>=65 && desc.length<=160,path+' description');
  assert.ok(title && title.length<=60,path+' title');
 }
 for(const path of ['privacy.html','returns.html','shipping.html','terms.html']){
  const html=read(path);
  assert.ok(html.includes('<meta name="robots" content="noindex">'),path+' must remain noindex');
  assert.ok(html.includes('<meta name="description" content="'),path+' missing meta description');
 }
});
test('offers contain no unverified promotion and sitemap freshness is truthful',()=>{
 const offers=read('offers.html');
 assert.ok(offers.includes('Current offers, if any'));
 assert.ok(offers.includes('not an online payment'));
 assert.ok(offers.includes('wholesale enquiries'));
 const sitemap=read('sitemap.xml');
 for(const path of ['shop.html','dealer.html','nitro-mass.html','pro-creatine.html','sturdy-pre-workout.html','musclevite-multivitamin.html','offers.html']){
  const updated=['shop.html','nitro-mass.html','pro-creatine.html','sturdy-pre-workout.html'].includes(path)?'2026-11-17':'2026-11-15';
  assert.ok(sitemap.includes('<loc>https://maxvolumenutriton.shop/'+path+'</loc><lastmod>'+updated+'</lastmod>'),path);
 }
});
