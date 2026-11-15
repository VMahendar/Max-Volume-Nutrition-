import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=path=>readFileSync('public/'+path,'utf8');
const home=read('index.html');
const shop=read('shop.html');
const productLinks=[
 ['Potency Whey','potency-whey.html','whey'],
 ['Nitro Mass','nitro-mass.html','mass'],
 ['Sturdy Pre-Workout','sturdy-pre-workout.html','pre'],
 ['Pro Creatine','pro-creatine.html','creatine'],
 ['Musclevite Multivitamin','musclevite-multivitamin.html','vitamins']
];
test('homepage has one descriptive H1 and root mirror matches served page',()=>{
  assert.equal(home,readFileSync('index.html','utf8'));
  assert.equal((home.match(/<h1\\b/gi)||[]).length,1);
  assert.match(home,/<h1 id="mvnEditorialTitle"/);
});
test('crawlable links in static and JavaScript-rendered retail cards preserve cart interactions',()=>{
  const app=read('app.js');
  for(const [name,url,id] of productLinks){
    for(const [path,html] of [['home',home],['shop',shop]])assert.ok(html.includes('<h3><a href="'+url+'">'+name+'</a></h3>'),path+' '+name+' missing link');
    assert.ok(app.includes(id+":'"+url+"'"),id+' missing dynamic product URL');
  }
  assert.match(app,/data-detail/);
  assert.match(app,/ADD TO CART/);
});
test('public search descriptions are concise while draft policies stay noindex',()=>{
  for(const path of ['index.html','shop.html','dealer.html','nitro-mass.html','pro-creatine.html','sturdy-pre-workout.html','musclevite-multivitamin.html']){
    const html=read(path);
    const description=html.match(/<meta name="description" content="([^"]+)"/)?.[1];
    const title=html.match(/<title>([^<]+)<\\/title>/)?.[1]?.replace(/&amp;/g,'&');
    assert.ok(description && description.length>=65 && description.length<=160,path+' needs concise description');
    assert.ok(title && title.length<=60,path+' needs concise title');
  }
  for(const path of ['privacy.html','returns.html','shipping.html','terms.html']){
    const html=read(path);
    assert.match(html,/<meta name="robots" content="noindex">/);
    assert.match(html,/<meta name="description" content="[^"]{70,160}">/);
  }
});
test('offers remain truthful and published sitemap dates match updated public pages',()=>{
  assert.match(read('offers.html'),/Current offers, if any/);
  assert.match(read('offers.html'),/not an online payment/);
  assert.match(read('offers.html'),/wholesale enquiries/);
  const sitemap=read('sitemap.xml');
  for(const path of ['shop.html','dealer.html','nitro-mass.html','pro-creatine.html','sturdy-pre-workout.html','musclevite-multivitamin.html','offers.html'])
    assert.match(sitemap,new RegExp('<loc>https://maxvolumenutriton\\.shop/'+path.replace('.','\\.')+'</loc><lastmod>2026-11-15</lastmod>'),path);
});
