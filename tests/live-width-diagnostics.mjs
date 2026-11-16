import {chromium} from 'playwright';
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
try{
 for(const width of [1366,1440,1920]){
  const page=await browser.newPage({viewport:{width,height:900}});
  const response=await page.goto('https://maxvolumenutriton.shop/?qa=diagnose-20261117',{waitUntil:'networkidle',timeout:35000});
  await page.waitForTimeout(1000);
  const result=await page.evaluate(()=>{
   const selectors=['html','body','.storehead','#mvnEditorial','#mvnEditorial .mvn-editorial-layout','#mvnEditorial .mvn-owner-banner-feature','#mvnEditorial .mvn-owner-banner-link','#mvnEditorial .mvn-owner-banner-img','.mvn-theme-shop-goals','.mvn-theme-shop-goals .mvn-editorial-category-grid','.mvn-theme-shop-goals .mvn-editorial-category','.mvn-preview-best','.mvn-preview-best .mvn-preview-best-grid','.mvn-globtech-launch'];
   const items=selectors.map(selector=>{
    const el=document.querySelector(selector);
    if(!el)return {selector,exists:false};
    const b=el.getBoundingClientRect(),s=getComputedStyle(el);
    return {selector,left:Math.round(b.left),right:Math.round(b.right),width:Math.round(b.width),height:Math.round(b.height),top:Math.round(b.top),cssWidth:s.width,cssMaxWidth:s.maxWidth,display:s.display,position:s.position,transform:s.transform,overflow:s.overflow,gridTemplateColumns:s.gridTemplateColumns,inlineStyle:el.getAttribute('style')?.slice(0,350)};
   });
   const design=document.getElementById('mvnVisualBuilderConfig');
   let published=null;try{const json=JSON.parse(design?.textContent||'null');published=Object.fromEntries(Object.entries(json?.pages||{}).map(([k,arr])=>[k,{count:arr.length,first:arr.slice(0,8).map(x=>({action:x.action,target:x.target,device:x.device,values:x.values}))}]));}catch(e){published={error:String(e)}}
   const homepageDesign=document.getElementById('mvnHomepageDesign');
   let legacy=null;try{const json=JSON.parse(homepageDesign?.textContent||'null');legacy=json?{heroFullWidth:json.heroFullWidth,bannerZoom:json.bannerZoom,heroCopyWidth:json.heroCopyWidth,sectionGap:json.sectionGap,bannerWidth:json.bannerWidth}:null;}catch{}
   return {viewport:innerWidth,clientWidth:document.documentElement.clientWidth,scrollWidth:document.documentElement.scrollWidth,href:location.href,fullscreenCssPresent:!!document.querySelector('link[href*="mvn-fullscreen-layout"]'),published,legacy,items};
  });
  console.log('LIVE_PRODUCTION_VIEW_'+width+' STATUS='+response.status()+' '+JSON.stringify(result));
  await page.close();
 }
}finally{await browser.close();}
