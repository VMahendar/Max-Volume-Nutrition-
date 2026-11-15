// Browser smoke test for the approved Option 2 design reference.
// Deliberately checks the customer website, not the paused Android app.
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {spawn} from 'node:child_process';
import {mkdtempSync, mkdirSync, rmSync} from 'node:fs';
import {resolve} from 'node:path';
import {tmpdir} from 'node:os';
import {setTimeout as delay} from 'node:timers/promises';
import {unlockStorefront} from './unlocked-storefront.mjs';

const dir=mkdtempSync(resolve(tmpdir(),'mvn-option2-qa-'));
const origin='http://127.0.0.1:35319';
const folder='reports/visual-qa/option-two';
mkdirSync(folder,{recursive:true});
const server=spawn(process.execPath,['server.mjs'],{
 env:{...process.env,HOST:'127.0.0.1',PORT:'35319',DATA_DIR:dir,PUBLIC_ORIGIN:origin,
 NODE_ENV:'test',STAGING_MODE:'false',PAYMENTS_ENABLED:'false',SHIPROCKET_ENABLED:'false'},
 stdio:['ignore','pipe','pipe']
});
let err='';
server.stderr.on('data',v=>err+=v.toString());
let browser;
try {
 let ready=false;
 for(let i=0;i<60;i++){
  try{const response=await fetch(origin+'/healthz');if(response.ok){ready=true;break}}catch{}
  await delay(200);
 }
 assert.ok(ready,'test storefront failed to boot: '+err);
 browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 for(const size of [{name:'desktop',width:1440,columns:3},{name:'android',width:390,columns:2}]){
  const context=await browser.newContext({viewport:{width:size.width,height:900},isMobile:size.name==='android',hasTouch:size.name==='android'});
  await unlockStorefront(context);
  const page=await context.newPage();
  const errors=[];
  page.on('pageerror',error=>errors.push(error.message));

  const homeResponse=await page.goto(origin+'/',{waitUntil:'domcontentloaded'});
  assert.equal(homeResponse.status(),200,size.name+' home loads');
  assert.ok(await page.locator('#mvnEditorial').isVisible(),size.name+' complete group banner visible');
  const group=page.locator('.mvn-owner-banner-img');
  assert.equal(await group.getAttribute('src'),'assets/mvn-homepage-banner-20261115.webp');
  await page.waitForFunction(()=>{const i=document.querySelector('.mvn-owner-banner-img');return i?.complete&&[768,1152,1672].includes(i.naturalWidth)&&i.naturalHeight>300;});
  assert.ok((await group.evaluate(i=>i.currentSrc)).includes('mvn-homepage-banner-20261115'),size.name+' selected authentic responsive banner');
  assert.equal(await page.locator('.mvn-editorial-promo').count(),2,'two feature promotions retained');
  assert.equal(await page.locator('.mvn-editorial-category').count(),3,'three original shop-by-goal product cards');
  assert.equal(await page.locator('#shop').isVisible(),false,size.name+' catalogue hidden on homepage');
  assert.equal(await page.locator('#mvn-quick-categories').isVisible(),false,size.name+' auto category bar hidden on home');
  assert.equal((await page.locator('body').innerText()).match(/SHOP THE COLLECTION/g)?.length,1,size.name+' one Shop the Collection button');
  assert.equal(await page.locator('footer.mvn-home-footer').count(),0,size.name+' no duplicated large footer on the homepage');
  assert.equal(await page.locator('.mvn-header-more a[href="contact.html"]').count(),1,size.name+' Contact still opens its own page');
  const goalCreatine=page.locator('.mvn-editorial-category-creatine img.goal-main');
  const promoCreatine=page.locator('.mvn-editorial-promo-creatine > img');
  const genuinePhoto='assets/mvn-creatine-blueberry-official-250g.webp';
  assert.equal(await goalCreatine.getAttribute('src'),genuinePhoto,size.name+' correct Blueberry 250 g photo in goal card');
  assert.equal(await promoCreatine.getAttribute('src'),genuinePhoto,size.name+' same correct original photo in promotion');
  await promoCreatine.scrollIntoViewIfNeeded();
  await page.waitForFunction(()=>[...document.querySelectorAll('.mvn-editorial-category-creatine img,.mvn-editorial-promo-creatine img')].every(x=>x.complete&&x.naturalWidth>200),null,{timeout:16000});
  assert.ok((await page.locator('.mvn-theme-goal-art').first().evaluate(e=>getComputedStyle(e).backgroundImage)).includes('gradient'),size.name+' studio photo background');
  for(const img of await page.locator('.mvn-editorial-category .goal-main').all()){
    await img.scrollIntoViewIfNeeded();await img.evaluate(e=>e.decode());assert.ok(await img.evaluate(e=>e.naturalWidth>0),size.name+' photo loads');
  }
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)<=10,size.name+' no home horizontal overflow');
  await page.screenshot({path:folder+'/'+size.name+'-home.png',fullPage:true,animations:'disabled'});
  await page.locator('.mvn-hero-action-strip a').click();
  await page.waitForURL('**/shop.html');
  assert.ok(await page.locator('.mvn-shop-page-heading').isVisible(),size.name+' separate shop opens');
  assert.equal(await page.locator('#mvnEditorial').count(),0,size.name+' no hero repeated on shop');
  await page.locator('#grid .variant').first().waitFor({state:'visible',timeout:15000});
  assert.ok(await page.locator('#grid article.card').count()>=5,size.name+' five retail product families visible');
  assert.equal(await page.locator('link[rel="canonical"]').getAttribute('href'),'https://maxvolumenutriton.shop/shop.html',size.name+' unique catalogue canonical');
  const columns=await page.locator('#grid').evaluate(e=>getComputedStyle(e).gridTemplateColumns.split(' ').filter(Boolean).length);
  assert.equal(columns,size.columns,size.name+' responsive shop grid');
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)<=10,size.name+' no shop overflow');
  await page.screenshot({path:folder+'/'+size.name+'-shop.png',fullPage:true,animations:'disabled'});
  await page.locator('#priceRange').selectOption('under1000');
  assert.ok(await page.locator('#grid article.card').count()>=1,size.name+' price filtering');
  await page.locator('#priceRange').selectOption('all');
  await page.locator('.cats [data-cat="mass"]').click();
  assert.equal(await page.locator('#grid article.card').count(),1,size.name+' mass-gainer filter');
  await page.locator('.cats [data-cat="all"]').click();
  await page.locator('#grid .add[data-id="whey"]').click();
  assert.equal(await page.locator('#count').innerText(),'1',size.name+' cart increments');
  assert.equal(await page.locator('#drawer').getAttribute('aria-hidden'),'false',size.name+' cart drawer opens');
  await page.locator('#close').click();
  await page.goto(origin+'/',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>document.querySelector('#count')?.textContent.trim()==='1');
  assert.equal(await page.locator('#count').innerText(),'1',size.name+' cart persists on homepage');
  await page.locator('.mvn-editorial-category[data-cat="pre"]').click();
  await page.waitForURL(/\/shop\.html\?cat=pre/);
  await page.locator('#grid article.card').first().waitFor({state:'visible'});
  assert.equal(await page.locator('#grid article.card').count(),1,size.name+' pre-workout goal navigates to filtered shop');
  await page.goto(origin+'/',{waitUntil:'domcontentloaded'});
  await page.locator('#q').fill('creatine');
  await page.locator('#q').press('Enter');
  await page.waitForURL(/\/shop\.html\?q=creatine/);
  await page.locator('#grid article.card').first().waitFor({state:'visible'});
  assert.equal(await page.locator('#grid article.card').count(),1,size.name+' home search routes to matching shop');
  await page.goto(origin+'/',{waitUntil:'domcontentloaded'});
  await page.locator('.mvn-header-more summary').click();
  assert.equal(await page.locator('.mvn-more-panel a').count(),3,size.name+' uncluttered three-dot menu');
  await page.locator('.mvn-more-panel a[href="contact.html"]').click();
  await page.waitForURL('**/contact.html');
  assert.ok((await page.locator('main').innerText()).includes('+91 77088 30513'),size.name+' phone only on Contact page');
  assert.ok((await page.locator('main').innerText()).includes('maxvolumenutrition@gmail.com'),size.name+' email only on Contact page');
  assert.deepEqual(errors,[],size.name+' unexpected Javascript errors');
  console.log('PASS MVN '+size.name+' showcase→shop, goal routes, product photos, filters, cart and Contact');
  await context.close();
 }
} finally {
 await browser?.close();
 if(server.exitCode===null){const done=new Promise(resolve=>server.once('exit',resolve));server.kill();await done;}
 rmSync(dir,{recursive:true,force:true});
}
