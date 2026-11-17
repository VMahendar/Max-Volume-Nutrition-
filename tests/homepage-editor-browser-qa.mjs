import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {spawn} from 'node:child_process';
import {mkdtempSync,rmSync,readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {tmpdir} from 'node:os';
import {randomBytes} from 'node:crypto';
import {setTimeout as delay} from 'node:timers/promises';
import {openCommerce,passwordHash} from '../commerce.mjs';

const dir=mkdtempSync(resolve(tmpdir(),'mvn-editor-browser-qa-'));
const origin='http://127.0.0.1:35326';
const store=openCommerce(dir);
const password=randomBytes(20).toString('hex');
store.db.prepare('INSERT INTO users VALUES(?,?,?,?,?,?)').run('visual-owner','editor-visual@example.com','Visual owner',await passwordHash(password),'admin',new Date().toISOString());
const server=spawn(process.execPath,['server.mjs'],{
 env:{...process.env,HOST:'127.0.0.1',PORT:'35326',DATA_DIR:dir,PUBLIC_ORIGIN:origin,
 NODE_ENV:'test',STAGING_MODE:'false',PAYMENTS_ENABLED:'false',SHIPROCKET_ENABLED:'false'},
 stdio:['ignore','pipe','pipe']
});
let browser,stderr='';
server.stderr.on('data',data=>stderr+=data);
try{
 let started=false;
 for(let i=0;i<80;i++){try{if((await fetch(origin+'/healthz')).ok){started=true;break}}catch{}await delay(200);}
 assert.ok(started,'Preview server failed: '+stderr);
 browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 const context=await browser.newContext({viewport:{width:1280,height:850}});
 // Confirm the public slideshow loads real packs without fetching the hidden editor montage.
 const originalStore=await context.newPage();
 const imageRequests=[];originalStore.on('request',r=>{if(r.resourceType()==='image')imageRequests.push(r.url());});
 await originalStore.goto(origin+'/',{waitUntil:'domcontentloaded'});
 await originalStore.waitForFunction(()=>{const image=document.querySelector('.mvn-campaign-stage img');return image?.complete&&image.naturalWidth>0;},null,{timeout:15000});
 assert.equal(await originalStore.locator('.storehead .original-brand-logo').count(),1,'one customer-facing logo');
 assert.equal(await originalStore.locator('.mvn-campaign-carousel').count(),1,'one hydrated carousel');
 assert.equal(await originalStore.locator('.mvn-campaign-slide').count(),5,'all configured campaign slides');
 assert.ok(!imageRequests.some(url=>/mvn-orange-lineup-20261117(?:-768)?\.webp/.test(url)),'hidden editor montage consumes no image request');
 await originalStore.close();
 const noScriptContext=await browser.newContext({javaScriptEnabled:false,viewport:{width:390,height:844}});
 const noScript=await noScriptContext.newPage();await noScript.goto(origin+'/');
 assert.equal(await noScript.locator('[data-server-rendered] .mvn-campaign-title').innerText(),'YOUR DAILY\nPROTEIN.','real first banner exists before hydration');
 assert.ok(await noScript.locator('[data-server-rendered] .mvn-campaign-cta').isVisible(),'first-banner link works without scripts');
 await noScriptContext.close();
 const page=await context.newPage(),errors=[];
 page.on('pageerror',error=>{errors.push('editor: '+error.message);console.log('EDITOR_JS_ERROR',error.message);});
 assert.equal((await page.goto(origin+'/layout-editor.html',{waitUntil:'domcontentloaded'})).status(),200);
 await page.locator('#loginForm').waitFor({state:'visible',timeout:15000});
 await page.locator('#loginForm input[name=email]').fill('editor-visual@example.com');
 await page.locator('#loginForm input[name=password]').fill(password);
 await page.locator('#loginForm button').click();
 await page.locator('#workspace').waitFor({state:'visible',timeout:15000});
 await page.locator('#sectionList button').filter({hasText:'Header & logo'}).click();
 await page.locator('#field-headerColor').waitFor({state:'visible',timeout:15000});
 await page.locator('#sectionList button').filter({hasText:'Main banner'}).click();
 await page.locator('#field-bannerZoom').waitFor({state:'visible'});
 assert.ok(await page.locator('#media').isVisible(),'visible banner replacement controls');
 assert.equal(await page.locator('#currentPhoto').isVisible(),true);
 const changeRange=async(selector,value)=>page.locator(selector).evaluate((el,v)=>{el.value=String(v);el.dispatchEvent(new Event('input',{bubbles:true}))},value);
 console.log('EDITOR_FRAME_METRICS',await page.locator('#preview').evaluate(frame=>{const e=frame.contentDocument?.querySelector('#mvnEditorial'),r=e?.getBoundingClientRect();return {viewport:frame.contentWindow.innerWidth,client:frame.contentDocument.documentElement.clientWidth,hero:r?{x:r.x,width:r.width,right:r.right}:null};}));
 // Direct manipulation must work in the real iframe, not only via sliders.
 await page.locator('#field-heroFullWidth').uncheck();
 await page.locator('#field-heroFullWidth').check();
 await page.waitForFunction(()=>document.querySelector('#preview').contentDocument?.querySelector('#mvnEditorial')?.style.width==='100vw',null,{timeout:15000});
 const fullWidthMetrics=await page.locator('#preview').evaluate(frame=>{const e=frame.contentDocument.querySelector('#mvnEditorial'),r=e.getBoundingClientRect();return {viewport:frame.contentWindow.innerWidth,client:frame.contentDocument.documentElement.clientWidth,scroll:frame.contentWindow.scrollX,x:r.x,width:r.width,right:r.right,style:e.getAttribute('style'),body:frame.contentDocument.body.getBoundingClientRect().toJSON()};});
 console.log('EDITOR_FULL_WIDTH_METRICS',JSON.stringify(fullWidthMetrics));
 assert.ok(fullWidthMetrics.width>=fullWidthMetrics.viewport*.98&&fullWidthMetrics.x>=-20&&fullWidthMetrics.right<=fullWidthMetrics.viewport+20,'full-width preview fits its viewport');
 const iframe=page.frameLocator('#preview');
 const imgDrag=iframe.locator('.mvn-owner-banner-img');
 // Hover waits for the editor's smooth section scrolling to settle before sampling drag coordinates.
 await imgDrag.hover();
 const initial=await imgDrag.boundingBox();
 assert.ok(initial&&initial.width>100,'banner visible for drag');
 await page.mouse.move(initial.x+initial.width*.50,initial.y+initial.height*.50);
 await page.mouse.down();await page.mouse.move(initial.x+initial.width*.54,initial.y+initial.height*.52,{steps:8});await page.mouse.up();
 await page.waitForFunction(()=>document.querySelector('#field-bannerX')&&Number(document.querySelector('#field-bannerX').value)!==0,null,{timeout:15000});
 assert.ok(Number(await page.locator('#field-bannerX').inputValue())!==0,'direct drag changes banner X control');
 const handle=iframe.locator('#mvn-drag-handle');
 await handle.waitFor({state:'visible',timeout:15000});
 await handle.hover({position:{x:10,y:10}});
 const corner=await handle.boundingBox();
 assert.ok(corner,'resize handle is visible');
 await page.mouse.move(corner.x+10,corner.y+10);await page.mouse.down();
 await page.mouse.move(corner.x+55,corner.y+30,{steps:7});await page.mouse.up();
 await page.waitForFunction(()=>Number(document.querySelector('#field-bannerZoom')?.value)!==100,null,{timeout:15000});
 assert.ok(Number(await page.locator('#field-bannerZoom').inputValue())>100,'orange corner drag resizes banner image');
 // Regular numeric controls remain available for precise adjustments.
  await changeRange('#field-bannerZoom',190);
 await changeRange('#field-bannerX',-16);
 await changeRange('#field-bannerY',10);

 await iframe.locator('.mvn-owner-banner-img').waitFor({state:'visible'});
 await page.waitForFunction(()=>{
  const img=document.querySelector('#preview').contentDocument?.querySelector('.mvn-owner-banner-img');
  return img?.style.transform.includes('scale(1.9)');
 },null,{timeout:15000});
 assert.match(await iframe.locator('.mvn-owner-banner-img').evaluate(el=>el.style.transform),/scale\(1\.9\)/,'banner zoom reflects in real preview');
 const png=readFileSync('public/icons/app-192.png');
 // The one-tap toolbar action should open the same upload control for the selected banner.
 assert.ok(await page.locator('#uploadPhotoQuick').isVisible(),'prominent Upload Photo action exists');
 await page.locator('#uploadPhotoQuick').click({noWaitAfter:true});
 assert.equal(await page.locator('#inspectorTitle').innerText(),'Banner image','quick upload targets the selected banner');
 await page.locator('#upload').setInputFiles({name:'editor-test-banner.png',mimeType:'image/png',buffer:png});
 await page.waitForFunction(()=>document.querySelector('#status')?.textContent.includes('Image uploaded'),null,{timeout:15000});
 const newImage=await page.locator('#currentPhoto').getAttribute('src');
 assert.match(newImage,/\/assets\/homepage\/[a-f0-9]{64}\.png$/,'uploaded banner displayed');
 await page.locator('#save').click();
 await page.waitForFunction(()=>document.querySelector('#status')?.textContent.includes('Draft saved'),null,{timeout:15000});
 assert.equal(store.setting('homepagePublishedV2'),null,'draft does not publish changes');
 await page.locator('#publish').click();
 await page.waitForFunction(()=>document.querySelector('#status')?.textContent.includes('Published'),null,{timeout:15000});
 const live=store.setting('homepagePublishedV2');
 assert.equal(live.fields.bannerZoom,190);
 assert.equal(live.fields.heroFullWidth,true,'full width layout is published safely');
 assert.equal(live.fields.bannerX,-16);
 assert.equal(live.fields.bannerImage,newImage.slice(1));
 await page.locator('[data-device=mobile]').click();
 assert.ok(await page.locator('#preview').evaluate(frame=>frame.classList.contains('mobile')),'mobile preview can be selected');
 const publicPage=await context.newPage();
 publicPage.on('pageerror',error=>errors.push('store: '+error.message));
 await publicPage.goto(origin+'/',{waitUntil:'domcontentloaded'});
 await publicPage.waitForFunction(()=>document.querySelector('.mvn-owner-banner-img')?.style.transform.includes('scale(1.9)'),null,{timeout:15000});
 assert.equal(await publicPage.locator('.mvn-owner-banner-img').getAttribute('src'),newImage,'published banner matches upload');
 assert.deepEqual(errors,[],'homepage editor and published storefront have no page exceptions');
 console.log('HOMEPAGE_EDITOR_BROWSER_QA PASSED: sign in, preview zoom, upload, draft, publish, mobile and storefront');
 await context.close();
}finally{
 if(browser)await browser.close();
 if(server.exitCode===null){const exited=new Promise(done=>server.once('exit',done));server.kill();await exited;}
 store.db.close();
 rmSync(dir,{recursive:true,force:true});
}
