import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {chromium} from 'playwright';
import {mkdtempSync,rmSync,mkdirSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {resolve} from 'node:path';
import {setTimeout as delay} from 'node:timers/promises';
const folder=mkdtempSync(resolve(tmpdir(),'mvn-width-qa-'));
const origin='http://127.0.0.1:35944';
const app=spawn(process.execPath,['server.mjs'],{
 env:{...process.env,HOST:'127.0.0.1',PORT:'35944',DATA_DIR:folder,PUBLIC_ORIGIN:origin,NODE_ENV:'test',STAGING_MODE:'false',PAYMENTS_ENABLED:'false',SHIPROCKET_ENABLED:'false'},
 stdio:['ignore','pipe','pipe']
});
let errors='',browser;
app.stderr.on('data',buffer=>errors+=buffer.toString());
try{
 let ready=false;for(let attempt=0;attempt<70;attempt++){try{if((await fetch(origin+'/healthz')).ok){ready=true;break;}}catch{}await delay(250);}
 assert.ok(ready,'test server failed: '+errors);
 browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 mkdirSync('reports/visual-qa',{recursive:true});
 for(const viewport of [{width:1440,height:900},{width:1920,height:1080},{width:390,height:844}]){
  const page=await browser.newPage({viewport});
  const failures=[];
  page.on('pageerror',e=>failures.push(e.message));
  assert.equal((await page.goto(origin+'/',{waitUntil:'networkidle'})).status(),200);
  const boxes=await page.evaluate(()=>{
   const selectors={header:'.storehead',hero:'#mvnEditorial',collection:'.mvn-home-collection-entry',best:'.mvn-preview-best',globe:'.gt-banner'};
   const width=document.documentElement.clientWidth;
   return {width,sections:Object.fromEntries(Object.entries(selectors).map(([key,selector])=>{
    const node=document.querySelector(selector);const rect=node?.getBoundingClientRect();
    return [key,rect?{left:rect.left,right:rect.right,width:rect.width,height:rect.height}:null];
   })),goalCards:[...document.querySelectorAll('.mvn-preview-best .mvn-preview-best-grid>a')].map(e=>{
    const box=e.getBoundingClientRect();return {left:box.left,top:box.top,right:box.right,bottom:box.bottom};
   })};
  });
  console.log('MVN_FULLSCREEN_METRICS',viewport.width,JSON.stringify(boxes));
  for(const [name,b] of Object.entries(boxes.sections)){
   assert.ok(b,name+' must exist at '+viewport.width);
   assert.ok(b.width>=(name==='best'?Math.min(boxes.width,1440):boxes.width)*(viewport.width<600?.92:.94),name+' must span screen ('+JSON.stringify(b)+')');
   assert.ok(b.left>=-12&&b.right<=boxes.width+14,name+' must fit screen, not overflow');
  }
  assert.equal(boxes.goalCards.length,4,'exactly four featured best sellers should be visible');
  for(let i=0;i<boxes.goalCards.length;i++)for(let j=i+1;j<boxes.goalCards.length;j++){
   const a=boxes.goalCards[i],b=boxes.goalCards[j];
   const overlap=Math.min(a.right,b.right)-Math.max(a.left,b.left)>6&&Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top)>6;
   assert.ok(!overlap,'featured product tiles must not overlap: '+i+' '+j);
  }
  const popupButton=page.locator('#mvnOpenCollection');
  await popupButton.click();
  assert.equal(await page.locator('#mvnCollectionDialog').evaluate(el=>el.open),true,'Shop Collection popup opens');
  assert.equal(await page.locator('#mvnCollectionDialog .mvn-collection-dialog-grid a').count(),6,'Popup has six current category links');
  await page.locator('#mvnCloseCollection').click();
  assert.equal(await page.locator('#mvnCollectionDialog').evaluate(el=>el.open),false,'Popup closes');
    assert.equal(failures.length,0,'browser JavaScript errors: '+failures.join(', '));
  await page.screenshot({path:'reports/visual-qa/fullscreen-'+viewport.width+'.png',fullPage:true});
  // Shop keeps its live product/cart functionality but matches the About/Contact
  // charcoal, paper and copper design rather than the old blue header/cards.
  const shop=await browser.newPage({viewport});
  const shopResponse=await shop.goto(origin+'/shop.html',{waitUntil:'networkidle'});
  assert.equal(shopResponse.status(),200);
  const shopVisual=await shop.evaluate(()=>{
   const color=selector=>{const el=document.querySelector(selector);return el?getComputedStyle(el).backgroundColor:null;};
   return {header:color('header.storehead'),intro:color('#shop>.section-title'),paper:color('#shop'),
    button:color('#shop .collection-results .card .add'),cards:document.querySelectorAll('#shop #grid .card').length,
    cart:!!document.querySelector('#bag'),filters:!!document.querySelector('.cats')};
  });
  assert.equal(shopVisual.header,'rgb(8, 8, 8)','Shop header matches About/Contact charcoal');
  assert.equal(shopVisual.intro,'rgb(8, 8, 8)','Shop collection introduction is charcoal, not navy');
  assert.equal(shopVisual.paper,'rgb(248, 247, 245)','Shop background matches info pages');
  assert.ok(shopVisual.cards>=4,'the full shop catalogue is still available');
  assert.ok(shopVisual.cart&&shopVisual.filters,'Shop cart and category filters remain in place');
  await shop.close();
  await page.close();
 }
 console.log('MVN_FULLSCREEN_DESKTOP_MOBILE_QA_PASS');
}finally{
 if(browser)await browser.close();
 if(app.exitCode===null){const ended=new Promise(ok=>app.once('exit',ok));app.kill();await ended;}
 rmSync(folder,{recursive:true,force:true});
}
