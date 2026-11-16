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
   const selectors={header:'.storehead',hero:'#mvnEditorial',goal:'.mvn-theme-shop-goals',best:'.mvn-preview-best',globe:'.mvn-globtech-launch'};
   const width=document.documentElement.clientWidth;
   return {width,sections:Object.fromEntries(Object.entries(selectors).map(([key,selector])=>{
    const node=document.querySelector(selector);const rect=node?.getBoundingClientRect();
    return [key,rect?{left:rect.left,right:rect.right,width:rect.width,height:rect.height}:null];
   })),goalCards:[...document.querySelectorAll('.mvn-theme-shop-goals .mvn-editorial-category-grid>a')].map(e=>{
    const box=e.getBoundingClientRect();return {left:box.left,top:box.top,right:box.right,bottom:box.bottom};
   })};
  });
  console.log('MVN_FULLSCREEN_METRICS',viewport.width,JSON.stringify(boxes));
  for(const [name,b] of Object.entries(boxes.sections)){
   assert.ok(b,name+' must exist at '+viewport.width);
   assert.ok(b.width>=boxes.width*(viewport.width<600?.92:.94),name+' must span screen ('+JSON.stringify(b)+')');
   assert.ok(b.left>=-12&&b.right<=boxes.width+14,name+' must fit screen, not overflow');
  }
  assert.ok(boxes.goalCards.length>=4,'shop by goal cards should be present');
  for(let i=0;i<boxes.goalCards.length;i++)for(let j=i+1;j<boxes.goalCards.length;j++){
   const a=boxes.goalCards[i],b=boxes.goalCards[j];
   const overlap=Math.min(a.right,b.right)-Math.max(a.left,b.left)>6&&Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top)>6;
   assert.ok(!overlap,'goal category tiles must not overlap: '+i+' '+j);
  }
  assert.equal(failures.length,0,'browser JavaScript errors: '+failures.join(', '));
  await page.screenshot({path:'reports/visual-qa/fullscreen-'+viewport.width+'.png',fullPage:true});
  await page.close();
 }
 console.log('MVN_FULLSCREEN_DESKTOP_MOBILE_QA_PASS');
}finally{
 if(browser)await browser.close();
 if(app.exitCode===null){const ended=new Promise(ok=>app.once('exit',ok));app.kill();await ended;}
 rmSync(folder,{recursive:true,force:true});
}
