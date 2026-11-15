import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';

const home=()=>readFileSync('public/index.html','utf8');
test('business, certificate and support details live in About Us rather than homepage',()=>{
 const html=home(),about=readFileSync('public/about.html','utf8');
 for(const name of ['about','certificate','offers','brands','contact']){
  const url=name+'.html';
  assert.ok(existsSync('public/'+url),'dedicated page exists: '+url);
  const page=readFileSync('public/'+url,'utf8');
  assert.ok(page.includes('rel="canonical" href="https://maxvolumenutriton.shop/'+url+'"'),url+' canonical SEO URL');
  assert.ok(page.includes('mvn-info-pages.css'),'consistent information page typography');
 }
 assert.ok(!html.includes('class="mvn-quick-pages"'),'no six-card directory on homepage');
 assert.ok(about.includes('id="certificate"'),'certificate on About Us');
 assert.ok(about.includes('assets/IMG-20261102-WA0019.jpg'),'original certificate photo');
 assert.equal((about.match(/class="mvn-quick-page"/g)||[]).length,4,'business and service links on About Us');
 for(const path of ['offers.html','brands.html','dealer.html','contact.html'])assert.ok(about.includes('href="'+path+'"'),'business link on About Us: '+path);
 assert.ok(!html.includes('class="certificate-photo"'),'certificate not repeated on homepage');
 assert.ok(!html.includes('class="brands-coming glotech-launch"'),'brand launch not duplicated');
 assert.ok(!html.includes('class="dealer dealer-promo"'),'no duplicate dealer panel');
 assert.ok(html.includes('id="offerCards" hidden'),'hidden offers hook preserved');
 assert.equal(readFileSync('index.html','utf8'),html,'compatibility mirror matches homepage');
});
test('three-dot menu has exactly About Us, Contact and Wholesale; contact data stays separate',()=>{
 const html=home();
 const menu=html.split('<nav class="mvn-more-panel"')[1]?.split('</nav>')[0]||'';
 assert.equal((menu.match(/<a /g)||[]).length,3,'exactly three links in header menu');
 for(const target of ['about.html','contact.html','dealer.html'])assert.ok(menu.includes('href="'+target+'"'),'menu destination '+target);
 for(const target of ['certificate.html','offers.html','brands.html'])assert.ok(!menu.includes(target),'information grouped under About Us');
 const strip=html.split('<div class="announce">')[1]?.split('</div>')[0]||'';
 assert.ok(!strip.includes('href=')&&!strip.includes('wa.me')&&!strip.includes('mailto:'),'no duplicate contact in top strip');
 const c=readFileSync('public/contact.html','utf8');
 for(const value of ['+91 77088 30513','maxvolumenutrition@gmail.com','href="tel:+917708830513"','href="https://wa.me/917708830513"','Kelambakkam'])assert.ok(c.includes(value),'contact detail '+value);
});
test('certificate is viewable in full on the dedicated page',()=>{
 const c=readFileSync('public/certificate.html','utf8');
 assert.ok(existsSync('public/assets/IMG-20261102-WA0019.jpg'),'original certificate image is available');
 assert.match(c,/Revakanya Industries Pvt\. Ltd\./);
 assert.match(c,/assets\/IMG-20261102-WA0019\.jpg/);
 assert.match(c,/OPEN ORIGINAL CERTIFICATE/);
 assert.match(c,/not presented here as proof of exclusive territory rights/,'certificate does not claim unsupported exclusive rights');
});
test('offers page follows live published promotional feed, keeps cart price validation',()=>{
 const offers=readFileSync('public/offers.html','utf8');
 const script=readFileSync('public/mvn-offers-page.js','utf8');
 assert.match(offers,/mvn-offers-page\.js/);
 assert.match(script,/api\/promotions\?surface=web/);
 assert.match(script,/textContent/);
 const app=readFileSync('public/app.js','utf8');
 assert.match(app,/\$\("offerCards"\)/,'existing checkout offer logic remains intact');
 for(const key of ['id="grid"','id="bag"','id="checkoutFields"','id="priceRange"'])assert.ok(home().includes(key),key+' shop hook remains');
});
