import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {mkdirSync,writeFileSync} from 'node:fs';
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
mkdirSync('reports/visual-qa',{recursive:true});
const url='https://maxvolumenutriton.shop/?audit=20261117-'+Date.now();
const names={
 header:'.storehead',hero:'#mvnEditorial',heroLayout:'#mvnEditorial .mvn-editorial-layout',
 heroFeature:'#mvnEditorial .mvn-owner-banner-feature',
 heroImage:'#mvnEditorial .mvn-owner-banner-img',
 goals:'.mvn-theme-shop-goals',goalGrid:'.mvn-theme-shop-goals .mvn-editorial-category-grid',
 best:'.mvn-preview-best',bestGrid:'.mvn-preview-best-grid',
 globe:'.mvn-globtech-launch',footer:'.mvn-home-contact'
};
let failures=0;
try{
 for(const width of [1280,1366,1440,1920,390]){
  const page=await browser.newPage({viewport:{width,height:900}});
  const issues=[];page.on('pageerror',error=>issues.push(error.message));
  const response=await page.goto(url,{waitUntil:'networkidle',timeout:35000});
  await page.waitForTimeout(900);
  const metrics=await page.evaluate(names=>{
   let obj={viewport:document.documentElement.clientWidth,screen:screen.width,innerWidth,
    docScrollWidth:document.documentElement.scrollWidth,
    repairScript:!![...document.scripts].find(s=>s.src.includes('mvn-storefront-screen-fit')),
    publishedDesign:!!document.querySelector('#mvnVisualBuilderConfig'),
    homepageDesign:!!document.querySelector('#mvnHomepageDesign'),
    viewportMeta:document.querySelector('meta[name=viewport]')?.content,
    serviceWorkers:!!navigator.serviceWorker?.controller,blocks:{},scripts:[]};
   for(const [key,selector] of Object.entries(names)){
    const node=document.querySelector(selector);
    if(!node){obj.blocks[key]=null;continue;}
    const rect=node.getBoundingClientRect(),css=getComputedStyle(node);
    obj.blocks[key]={x:Math.round(rect.x),y:Math.round(rect.y),width:Math.round(rect.width),height:Math.round(rect.height),
     display:css.display,position:css.position,transform:css.transform,
     maxWidth:css.maxWidth,marginLeft:css.marginLeft,marginRight:css.marginRight,
     overflow:css.overflow,grid:css.gridTemplateColumns,
     inline:node.getAttribute('style')?.slice(0,450)};
   }
   obj.scripts=[...document.scripts].map(s=>s.src||'').filter(s=>s.includes('builder')||s.includes('screen-fit')||s.includes('homepage'));
   return obj;
  },names);
  console.log('PRODUCTION_LAYOUT_AUDIT '+width+' '+JSON.stringify(metrics));
  console.log('PRODUCTION_BROWSER_ERRORS '+width+' '+JSON.stringify(issues));
  await page.screenshot({path:'reports/visual-qa/production-'+width+'.png',fullPage:true});
  const affected=['header','hero','goals','best','globe'];
  for(const key of affected){const box=metrics.blocks[key];if(!box||box.width<width*.90||box.x>width*.04){console.error('PRODUCTION_HALF_WIDTH_FAILURE '+width+' '+key+' '+JSON.stringify(box));failures++;}}
  if(response.status()!==200)failures++;
  await page.close();
 }
}finally{await browser.close();}
assert.equal(failures,0,'Live MVN website still has narrowed sections; see logs and screenshots');
console.log('LIVE_PRODUCTION_FULL_WIDTH_PASS');
