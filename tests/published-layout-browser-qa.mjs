import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {spawn} from 'node:child_process';
import {mkdtempSync,rmSync} from 'node:fs';
import {resolve} from 'node:path';
import {tmpdir} from 'node:os';
import {setTimeout as delay} from 'node:timers/promises';
import {openCommerce} from '../commerce.mjs';
let live=null;
for(let attempt=0;attempt<6;attempt++){
 try{
  const response=await fetch('https://maxvolumenutriton.shop/?qa=prod-regression-'+attempt,{signal:AbortSignal.timeout(20000),headers:{'Cache-Control':'no-cache'}});
  if(response.ok){live=response;break;}
  console.warn('Production snapshot temporarily unavailable, HTTP '+response.status+' (attempt '+(attempt+1)+')');
 }catch(error){console.warn('Production snapshot retry '+(attempt+1)+': '+error.message);}
 await delay(1500*(attempt+1));
}
assert.ok(live,'live production homepage must be reachable to reproduce published layout');
const raw=(await live.text()).match(/<script type="application\/json" id="mvnVisualBuilderConfig">([\s\S]*?)<\/script>/)?.[1];
assert.ok(raw,'live site should contain published visual builder design');
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
  const measurements=await page.evaluate(()=>{
   const selectors={hero:'#mvnEditorial',feature:'.mvn-owner-banner-feature',banner:'.mvn-owner-banner-img',goal:'.mvn-theme-shop-goals',best:'.mvn-preview-best',globe:'.mvn-globtech-launch'};
   const values=Object.fromEntries(Object.entries(selectors).map(([key,selector])=>{
    const r=document.querySelector(selector)?.getBoundingClientRect();return [key,r?{x:r.x,y:r.y,width:r.width,height:r.height,right:r.right}:null];
   }));
   const cards=[...document.querySelectorAll('.mvn-theme-shop-goals .mvn-editorial-category-grid > a')].map(el=>{const r=el.getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom};});
   return {viewport:document.documentElement.clientWidth,scrollWidth:document.documentElement.scrollWidth,values,cards};
  });
  console.log('LIVE_SAVED_DESIGN_REGRESSION',viewport.width,JSON.stringify(measurements));
  const extra=await page.evaluate(()=>{
   const selectors=['.announce','.storehead','.storehead .brand-identity','.storehead .original-brand-logo','.storehead .mvn-header-wordmark','.storehead .head-actions','.storehead .header-search','.storehead .mvn-preview-nav','.mvn-theme-main-nav','.mvn-globtech-launch','.mvn-globtech-launch > div','#shop','main','.recent-section','.mvn-home-contact','.mvn-home-contact-inner','.mvn-home-contact nav','.mvn-home-contact h2','body > footer'];
   return selectors.map(selector=>{
    const el=document.querySelector(selector);
    if(!el)return {selector,missing:true};
    const b=el.getBoundingClientRect(),s=getComputedStyle(el);
    return {selector,x:Math.round(b.x),y:Math.round(b.y),w:Math.round(b.width),h:Math.round(b.height),display:s.display,grid:s.gridTemplateColumns,gap:s.gap,padding:s.padding,margin:s.margin,transform:s.transform,fontSize:s.fontSize,visibility:s.visibility};
   });
  });
  console.log('LIVE_HEADER_FOOTER_GEOMETRY',viewport.width,JSON.stringify(extra));
  const get=selector=>extra.find(item=>item.selector===selector);
  const head=get('.storehead'),logo=get('.storehead .original-brand-logo'),actions=get('.storehead .head-actions'),brand=get('.storehead .brand-identity');
  const globCopy=get('.mvn-globtech-launch > div'),globe=get('.mvn-globtech-launch');
  const foot=get('.mvn-home-contact'),footInner=get('.mvn-home-contact-inner'),footNav=get('.mvn-home-contact nav');
  assert.ok(head.h>60&&head.h<145,'header must be compact');
  assert.ok(brand.w>100&&brand.x>=-4&&brand.x+brand.w<measurements.viewport*.6,'brand should fit left');
  assert.ok(logo.h>30&&logo.h<=head.h+2,'logo must not overflow header height');
  assert.ok(actions.w>70&&actions.x>measurements.viewport*.45&&actions.x+actions.w<=measurements.viewport+6,'header controls aligned right');
  assert.ok(globCopy.h>30&&globCopy.y>=globe.y-2&&globCopy.y+globCopy.h<=globe.y+globe.h+2,'Globe-Tech text inside section');
  assert.ok(foot.h>110&&footInner.w>measurements.viewport*.65&&footInner.h>60,'footer no longer hidden or blank');
  assert.ok(footNav.h>40,'footer shop links visible');
  const footerLinks=await page.locator('.mvn-home-contact a:visible').count();
  assert.ok(footerLinks>=10,'Footer should show functional support and shop links');



  const design=await page.evaluate(()=>{
   const props=selector=>{const el=document.querySelector(selector);if(!el)return null;const s=getComputedStyle(el),r=el.getBoundingClientRect();return {bg:s.backgroundColor,width:r.width,height:r.height,top:r.top,bottom:r.bottom,gap:s.gap,display:s.display};};
   return {
    header:props('.storehead'),actions:props('.storehead .head-actions #bag'),
    goals:props('.mvn-theme-shop-goals'),collection:props('#shop'),globe:props('.mvn-globtech-launch'),
    footer:props('.mvn-home-contact'),
    cards:[...document.querySelectorAll('.mvn-theme-shop-goals .mvn-editorial-category-grid > a')].map(el=>{const s=getComputedStyle(el),r=el.getBoundingClientRect();return {width:r.width,height:r.height,bg:s.backgroundColor};}),
    shopGrid:props('#shop #grid'),
    shopCards:[...document.querySelectorAll('#shop #grid > *')].slice(0,8).map(el=>{const r=el.getBoundingClientRect();return {width:r.width,height:r.height};})
   };
  });
  console.log('LIVE_UNIFIED_COLOUR_AND_COLLECTION',viewport.width,JSON.stringify(design));
  const dark='rgb(16, 17, 19)',light='rgb(246, 246, 244)';
  assert.equal(design.header?.bg,dark,'header must be one charcoal colour');
  assert.equal(design.actions?.bg,dark,'header actions must not create a grey strip');
  assert.equal(design.footer?.bg,dark,'footer must match header');
  assert.ok(measurements.values.best?.width>measurements.viewport*.94,'Best Sellers visible as one full-width collection');
  assert.ok(measurements.values.globe?.height<500,'Globe-Tech should not have a giant empty gap');
  assert.equal(design.collection?.display,'none','do not repeat full shop catalogue on homepage');
  assert.equal(design.globe?.bg,dark,'Globe-Tech and footer must be a continuous colour');
  assert.equal(design.goals?.bg,light,'shop-by-goal background must be consistent neutral white');
  if(design.collection?.display!=='none')assert.equal(design.collection?.bg,light,'collection must match shop-by-goal surface');
  assert.ok(design.cards.length>=4,'goal category tiles are present');
  assert.ok(design.cards.every(item=>item.width>80&&item.height>=170&&item.height<=320),'goal tiles must be usable, not tiny or oversized');
  const cardSizes=design.cards.map(item=>item.height);
  assert.ok(Math.max(...cardSizes)-Math.min(...cardSizes)<8,'goal tile heights must align');
  if(design.shopGrid?.display!=='none'&&design.shopCards.length>0)
    assert.ok(design.shopCards.every(item=>item.width>80),'collection product cards must have adequate width');

  const vw=measurements.viewport,values=measurements.values,cards=measurements.cards;
  for(const name of ['hero','goal','best','globe']){
   assert.ok(values[name]&&values[name].width>vw*.94,name+' must fill viewport with live edits at '+vw);
   assert.ok(values[name].x>=-8&&values[name].right<=vw+8,name+' must fit viewport');
  }
  assert.ok(values.feature.width>vw*.92,'hero feature width still broken '+JSON.stringify(values.feature));
  assert.ok(values.feature.x>=-8&&values.feature.right<=vw+8,'hero feature position still broken');
  assert.ok(values.banner.width>vw*.92,'banner image should span screen '+JSON.stringify(values.banner));
  assert.ok(values.banner.x>=-8&&values.banner.right<=vw+8,'banner offscreen');
  assert.ok(values.globe.height>100,'Globe-Tech section clipped');
  for(let i=0;i<cards.length;i++)for(let j=i+1;j<cards.length;j++){
   const a=cards[i],b=cards[j];
   const overlap=Math.min(a.right,b.right)-Math.max(a.left,b.left)>5&&Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top)>5;
   assert.ok(!overlap,'goal cards overlap '+i+' '+j);
  }
  assert.deepEqual(errors,[],'browser JavaScript errors');
  await page.close();
 }
 console.log('REAL_PRODUCTION_SAVED_EDITS_LAYOUT_PASS');
}finally{
 if(browser)await browser.close();
 if(app.exitCode===null){const done=new Promise(resolve=>app.once('exit',resolve));app.kill();await done;}
 C.db.close();rmSync(folder,{recursive:true,force:true});
}
