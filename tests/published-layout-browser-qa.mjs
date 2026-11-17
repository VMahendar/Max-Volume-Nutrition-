import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {spawn} from 'node:child_process';
import {mkdtempSync,rmSync} from 'node:fs';
import {resolve} from 'node:path';
import {tmpdir} from 'node:os';
import {setTimeout as delay} from 'node:timers/promises';
import {openCommerce} from '../commerce.mjs';
let raw=null;
for(let attempt=0;attempt<6;attempt++){
 try{
  const response=await fetch('https://maxvolumenutriton.shop/?qa=prod-regression-'+attempt,{signal:AbortSignal.timeout(20000),headers:{'Cache-Control':'no-cache'}});
  const html=await response.text();
  raw=html.match(/<script\b[^>]*\bid="mvnVisualBuilderConfig"[^>]*>([\s\S]*?)<\/script>/)?.[1];
  if(response.ok&&raw)break;
  console.warn('Waiting for complete production HTML: HTTP '+response.status+', configuration present: '+Boolean(raw));
 }catch(error){console.warn('Production snapshot retry: '+error.message);}
 await delay(1500*(attempt+1));
}
assert.ok(raw,'complete live production HTML must include its published design configuration');
const published=JSON.parse(raw);
assert.ok(published.pages?.['/']?.length>0,'reproduce real published operations');
console.log('REAL_PUBLISHED_LAYOUT_OPS',published.pages['/'].length);
const folder=mkdtempSync(resolve(tmpdir(),'mvn-live-layout-regression-'));
const C=openCommerce(folder);C.set('visualBuilderPublishedV1',published);
const origin='http://127.0.0.1:35945';
const app=spawn(process.execPath,['server.mjs'],{env:{...process.env,HOST:'127.0.0.1',PORT:'35945',DATA_DIR:folder,PUBLIC_ORIGIN:origin,NODE_ENV:'test',STAGING_MODE:'false',PAYMENTS_ENABLED:'false',SHIPROCKET_ENABLED:'false'},stdio:['ignore','pipe','pipe']});
let stderr='',browser;app.stderr.on('data',chunk=>stderr+=chunk.toString());
try{
 let ready=false;for(let i=0;i<80;i++){try{if((await fetch(origin+'/healthz')).ok){ready=true;break;}}catch{}await delay(200);}
 assert.ok(ready,'app must boot: '+stderr);
 browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 for(const viewport of [{width:1366,height:768},{width:1440,height:900},{width:1920,height:1080},{width:390,height:844}]){
  const page=await browser.newPage({viewport}),errors=[];page.on('pageerror',error=>errors.push(error.message));
  assert.equal((await page.goto(origin+'/',{waitUntil:'networkidle',timeout:35000})).status(),200);
  const measures=await page.evaluate(()=>{
   const box=selector=>{const e=document.querySelector(selector),r=e?.getBoundingClientRect();return r?{x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom,bg:getComputedStyle(e).backgroundColor}:null;};
   return {width:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth,hero:box('#mvnEditorial'),header:box('.storehead'),best:box('.mvn-home-featured'),globe:box('.gt-banner'),copy:box('.gt-banner-copy'),footer:box('.mvn-home-contact'),collection:box('.mvn-home-collection-entry'),cards:[...document.querySelectorAll('.mvn-best-product')].map(e=>{const r=e.getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom,height:r.height};}),catalogHidden:getComputedStyle(document.querySelector('#shop')).display==='none'};
  });
  console.log('CURRENT_PUBLISHED_LAYOUT',viewport.width,JSON.stringify(measures));
  assert.ok(measures.scroll<=measures.width+2,'published operations must not cause horizontal overflow');
  for(const key of ['hero','header','globe','footer','collection']){
   const r=measures[key];assert.ok(r&&r.width>=measures.width*.92&&r.x>=-8&&r.right<=measures.width+8,key+' must fit the full viewport');
  }
  assert.ok(measures.best.width>=Math.min(measures.width,1440)*.94,'Best Sellers uses the approved centered shop width');
  assert.equal(measures.header.bg,'rgb(8, 8, 8)');assert.equal(measures.footer.bg,'rgb(8, 8, 8)');
  assert.ok(measures.header.height>60&&measures.header.height<170,'compact responsive header');
  assert.ok(measures.copy.y>=measures.globe.y-2&&measures.copy.bottom<=measures.globe.bottom+2,'Coming Soon copy stays inside its banner');
  assert.ok(measures.globe.height>100&&measures.globe.height<1000,'brand banner has no giant blank area');
  assert.ok(measures.catalogHidden,'homepage must not repeat the full shop catalogue');
  assert.equal(measures.cards.length,4);assert.ok(measures.cards.every(c=>c.height>=170&&c.height<600));
  for(const card of measures.cards){const row=measures.cards.filter(c=>Math.abs(c.top-card.top)<4);assert.ok(Math.max(...row.map(c=>c.height))-Math.min(...row.map(c=>c.height))<8,'card heights align within each responsive row');}
  for(let i=0;i<4;i++)for(let j=i+1;j<4;j++){const a=measures.cards[i],b=measures.cards[j];assert.ok(!(Math.min(a.right,b.right)-Math.max(a.left,b.left)>5&&Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top)>5),'cards must not overlap');}
  assert.equal(await page.locator('.mvn-campaign-slide').count(),5);
  assert.match(await page.locator('.gt-kicker').first().innerText(),/COMING SOON/i);
  assert.ok(await page.locator('.mvn-home-contact a:visible').count()>=10,'footer support/shop links visible');
  await page.locator('#mvnOpenCollection').click();
  const popup=page.locator('#mvnCollectionDialog');assert.equal(await popup.evaluate(el=>el.open),true);
  assert.equal(await popup.locator('.mvn-collection-dialog-grid > a').count(),6,'current four core categories plus amino and Globe-Tech');
  await page.locator('#mvnCloseCollection').click();assert.equal(await popup.evaluate(el=>el.open),false);
  assert.deepEqual(errors,[],'browser JavaScript errors');
  await page.close();
 }
 console.log('REAL_PRODUCTION_SAVED_EDITS_LAYOUT_PASS');
}finally{
 if(browser)await browser.close();
 if(app.exitCode===null){const done=new Promise(resolve=>app.once('exit',resolve));app.kill();await done;}
 C.db.close();rmSync(folder,{recursive:true,force:true});
}
