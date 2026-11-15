import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';

const home=()=>readFileSync('public/index.html','utf8');
test('contact, certificate and other detailed sections open their own pages',()=>{
 const html=home();
 const links=['about','certificate','offers','brands','contact'];
 for(const name of links){
  const url=name+'.html';
  assert.ok(existsSync('public/'+url),'dedicated page exists: '+url);
  const page=readFileSync('public/'+url,'utf8');
  assert.match(page,new RegExp('rel="canonical" href="https://maxvolumenutriton\\.shop/'+name+'\\.html"'),url+' canonical SEO URL');
  assert.match(page,/mvn-info-pages\.css/,'same navigation and typography for '+name);
  assert.ok(html.includes('href="'+url+'"'),'homepage provides dedicated link '+name);
 }
 assert.equal((html.match(/class="mvn-quick-page"/g)||[]).length,6,'six genuine click-through destinations on homepage');
 assert.match(html,/<a class="mvn-quick-page" href="contact\.html" id="contact"/);
 assert.match(html,/<a class="mvn-quick-page" href="certificate\.html" id="certificate"/);
 assert.doesNotMatch(html,/class="certificate-photo"/,'original certificate picture not dumped into homepage');
 assert.doesNotMatch(html,/class="brands-coming glotech-launch"/,'large brand launch is on its own page');
 assert.doesNotMatch(html,/class="dealer dealer-promo"/,'detailed dealer page replaces repeated giant homepage block');
 assert.match(html,/id="offerCards" hidden/,'offer application widget stays present for cart JS without displaying details');
 assert.equal(readFileSync('index.html','utf8'),html,'compatibility mirror matches homepage');
});
test('contact data appears on contact page, not the top homepage strip',()=>{
 const html=home();
 const strip=html.match(/<div class="announce">[\s\S]*?<\/div>/)?.[0]||'';
 assert.match(strip,/href="contact\.html"/);
 assert.doesNotMatch(strip,/mailto:|wa\.me|77088|@gmail/,'top strip invites opening Contact page rather than repeating contact details');
 const c=readFileSync('public/contact.html','utf8');
 assert.match(c,/\+91 77088 30513/);
 assert.match(c,/maxvolumenutrition@gmail\.com/);
 assert.match(c,/href="tel:\+917708830513"/);
 assert.match(c,/href="https:\/\/wa\.me\/917708830513"/);
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
