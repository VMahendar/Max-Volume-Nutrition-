import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {spawn} from 'node:child_process';
import {mkdtempSync,rmSync} from 'node:fs';
import {resolve} from 'node:path';
import {tmpdir} from 'node:os';
import {setTimeout as delay} from 'node:timers/promises';
import {openCommerce} from '../commerce.mjs';
const live=await fetch('https://maxvolumenutriton.shop/?qa=prod-regression',{signal:AbortSignal.timeout(30000)});
assert.equal(live.status,200,'public homepage available');
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
