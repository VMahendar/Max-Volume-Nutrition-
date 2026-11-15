import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';

const home=()=>readFileSync('public/index.html','utf8');
test('business, certificate and support details live in About Us rather than homepage',()=>{
 const html=home(),about=readFileSync('public/about.html','utf8');
 const pages=['about','certificate','offers','brands','contact'];
 for(const name of pages){
  const url=name+'.html';
  assert.ok(existsSync('public/'+url),'dedicated page exists: '+url);
  const page=readFileSync('public/'+url,'utf8');
  assert.match(page,new RegExp('rel="canonical" href="https://maxvolumenutriton\\.shop/'+name+'\\.html"'),url+' canonical SEO URL');
  assert.match(page,/mvn-info-pages\\.css/,'consistent information page typography');
 }
 assert.doesNotMatch(html,/class="mvn-quick-pages"/,'no six-card directory on shopping homepage');
 assert.match(about,/id="certificate"/,'certificate is displayed on About Us');
 assert.match(about,/assets\\/IMG-20261102-WA0019\\.jpg/,'issued certificate image remains visible');
 assert.equal((about.match(/class="mvn-quick-page"/g)||[]).length,4,'other business and service links are grouped on About Us');
 for(const path of ['offers.html','brands.html','dealer.html','contact.html'])assert.ok(about.includes('href="'+path+'"'),'business link is on About Us: '+path);
 assert.doesNotMatch(html,/class="certificate-photo"/,'certificate image does not crowd homepage');
 assert.doesNotMatch(html,/class="brands-coming glotech-launch"/,'no large brand launch on homepage');
 assert.doesNotMatch(html,/class="dealer dealer-promo"/,'no duplicate dealer panel on homepage');
 assert.match(html,/id="offerCards" hidden/,'hidden promotions hook stays for cart logic');
 assert.equal(readFileSync('index.html','utf8'),html,'compatibility mirror matches homepage');
});
test('three-dot menu has exactly About Us, Contact and Wholesale; contact data stays on contact page',()=>{
 const html=home();
 const menu=html.match(/<nav class="mvn-more-panel"[^>]*>([\\s\\S]*?)<\\/nav>/)?.[1]||'';
 assert.equal((menu.match(/<a /g)||[]).length,3,'three-dot menu contains exactly three links');
 assert.match(menu,/href="about\\.html"/);
 assert.match(menu,/href="contact\\.html"/);
 assert.match(menu,/href="dealer\\.html"/);
 assert.doesNotMatch(menu,/certificate\\.html|offers\\.html|brands\\.html/,'those details are organized under About Us');
 const strip=html.match(/<div class="announce">[\\s\\S]*?<\\/div>/)?.[0]||'';
 assert.doesNotMatch(strip,/href=|mailto:|wa\\.me|77088|@gmail/,'no duplicate contact links in top strip');
 const c=readFileSync('public/contact.html','utf8');
 assert.match(c,/\\+91 77088 30513/);
 assert.match(c,/maxvolumenutrition@gmail\\.com/);
 assert.match(c,/href="tel:\\+917708830513"/);
 assert.match(c,/href="https:\\/\\/wa\\.me\\/917708830513"/);
 assert.match(c,/Kelambakkam/);
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
