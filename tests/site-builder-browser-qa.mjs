import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {spawn} from 'node:child_process';
import {mkdtempSync,rmSync,readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {tmpdir} from 'node:os';
import {randomBytes} from 'node:crypto';
import {setTimeout as delay} from 'node:timers/promises';
import {openCommerce,passwordHash} from '../commerce.mjs';

const folder=mkdtempSync(resolve(tmpdir(),'mvn-full-visual-test-'));
const origin='http://127.0.0.1:35927',C=openCommerce(folder);
const password=randomBytes(22).toString('hex');
C.db.prepare('INSERT INTO users VALUES(?,?,?,?,?,?)').run('visual-builder-owner','visual-qa@example.com','Visual QA',await passwordHash(password),'admin',new Date().toISOString());
const child=spawn(process.execPath,['server.mjs'],{env:{...process.env,HOST:'127.0.0.1',PORT:'35927',DATA_DIR:folder,PUBLIC_ORIGIN:origin,NODE_ENV:'test',STAGING_MODE:'false',PAYMENTS_ENABLED:'false',SHIPROCKET_ENABLED:'false'},stdio:['ignore','pipe','pipe']});
let stderr='',browser;child.stderr.on('data',data=>stderr+=data.toString());
try{
 let started=false;for(let n=0;n<80;n++){try{if((await fetch(origin+'/healthz')).ok){started=true;break;}}catch{}await delay(200);}
 assert.ok(started,'Server failed: '+stderr);
 browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 const context=await browser.newContext({viewport:{width:1440,height:900}});
 const page=await context.newPage();const errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 assert.equal((await page.goto(origin+'/visual-builder.html',{waitUntil:'domcontentloaded'})).status(),200);
 await page.locator('#loginForm').waitFor({state:'visible'});
 await page.locator('#loginForm input[name="email"]').fill('visual-qa@example.com');
 await page.locator('#loginForm input[name="password"]').fill(password);
 await page.locator('#loginForm button').click();
 await page.locator('#workspace').waitFor({state:'visible',timeout:15000});
 const iframe=page.frameLocator('#preview');
 await iframe.locator('#mvnEditorialTitle').waitFor({state:'visible',timeout:15000});
 await iframe.locator('#mvnEditorialTitle').click({force:true});
 // Directly dragging the selected heading must move the object even without using a handle.
 const headingBox=await iframe.locator('#mvnEditorialTitle').boundingBox();
 assert.ok(headingBox&&headingBox.width>20,'editable headline exists');
 await page.mouse.move(headingBox.x+headingBox.width*.35,headingBox.y+headingBox.height*.5);
 await page.mouse.down();await page.mouse.move(headingBox.x+headingBox.width*.35+42,headingBox.y+headingBox.height*.5+18,{steps:9});await page.mouse.up();
 await page.waitForFunction(()=>document.querySelector('#preview')?.contentDocument?.querySelector('#mvnEditorialTitle')?.style.transform?.includes('translate('),null,{timeout:15000});

 await page.locator('#propertyControls').waitFor({state:'visible',timeout:15000});
 assert.match(await page.locator('#selectionName').innerText(),/H1|EM/);
 await page.locator('#text').fill('YOUR CUSTOM MVN HERO');
 await page.locator('#setText').click();
 await page.waitForFunction(()=>{
  const inside=document.querySelector('#preview')?.contentDocument;
  return inside?.querySelector('#mvnEditorialTitle')?.textContent==='YOUR CUSTOM MVN HERO';
 },null,{timeout:15000});
 await page.locator('#width').fill('510');
 await page.locator('#height').fill('160');
 await page.locator('#applyStyle').click();
 await page.waitForFunction(()=>document.querySelector('#preview')?.contentDocument?.querySelector('#mvnEditorialTitle')?.style.getPropertyValue('width')==='510px',null,{timeout:15000});
 // All four resize handles must exist and drag the actual selected object.
 const handle=iframe.locator('[data-handle="se"]');
 await handle.waitFor({state:'visible'});
 assert.equal(await iframe.locator('[data-handle]').count(),4,'all four corners can resize');
 const box=await handle.boundingBox();
 assert.ok(box,'resize corner visible');
 await page.mouse.move(box.x+12,box.y+12);await page.mouse.down();
 await page.mouse.move(box.x+54,box.y+32,{steps:6});await page.mouse.up();
 await page.waitForFunction(()=>document.querySelector('#preview')?.contentDocument?.querySelector('#mvnEditorialTitle')?.style.width&&Number.parseInt(document.querySelector('#preview').contentDocument.querySelector('#mvnEditorialTitle').style.width,10)>510,null,{timeout:15000});
 await page.locator('#addButton').click();
 await page.waitForFunction(()=>document.querySelector('#preview')?.contentDocument?.querySelector('[data-mvn-builder-created]'),null,{timeout:15000});
 // Cut and paste should duplicate a design block and hide its old position, not change commerce data.
 await iframe.locator('[data-mvn-builder-created]').first().click({force:true});
 await page.locator('#cut').click();
 await page.locator('#paste').click();
 await page.waitForFunction(()=>document.querySelector('#preview')?.contentDocument?.querySelectorAll('[data-mvn-builder-created]').length>=2,null,{timeout:15000});
 // Upload a replacement to the existing group banner rather than creating a new product.
 await iframe.locator('.mvn-owner-banner-img').evaluate(el=>el.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true})));
 await page.waitForFunction(()=>document.querySelector('#selectionName')?.textContent.includes('IMG'),null,{timeout:15000});
 const imageBytes=readFileSync('public/icons/app-192.png');
 await page.locator('#fileUpload').setInputFiles({name:'visual-banner.png',mimeType:'image/png',buffer:imageBytes});
 await page.waitForFunction(()=>document.querySelector('#status')?.textContent.includes('Photo uploaded'),null,{timeout:15000});
 await page.waitForFunction(()=>/assets\/homepage\/[a-f0-9]{64}\.png/.test(document.querySelector('#preview')?.contentDocument?.querySelector('.mvn-owner-banner-img')?.getAttribute('src')||''),null,{timeout:15000});
 // One-click edge-to-edge section control must remove the banner's constrained white margins.
 assert.equal(await page.locator('#replaceSelected').isVisible(),true,'selected image has a visible Replace Photo button');
 await page.locator('#fullBleed').click();
 await page.waitForFunction(()=>{
  const hero=document.querySelector('#preview')?.contentDocument?.querySelector('#mvnEditorial');
  return hero?.style.getPropertyValue('width')==='100vw';
 },null,{timeout:15000});
 assert.match(await iframe.locator('#mvnEditorial').getAttribute('style'),/width: 100vw/);
 // Unlock clipping/size restrictions on selected banner and test dimensions above old maximums.
 await page.locator('#unlockLayout').click();
 await page.waitForFunction(()=>document.querySelector('#preview')?.contentDocument?.querySelector('.mvn-owner-banner-img')?.style.getPropertyValue('max-height')==='none',null,{timeout:15000});
 await page.locator('#height').fill('2600');
 await page.locator('#x').fill('12000');
 await page.locator('#applyStyle').click();
 await page.waitForFunction(()=>{
  const image=document.querySelector('#preview')?.contentDocument?.querySelector('.mvn-owner-banner-img');
  return image?.style.getPropertyValue('height')==='2600px';
 },null,{timeout:15000});
 assert.equal(await page.locator('#height').inputValue(),'2600','height has no former 1600px cap');
 assert.equal(await page.locator('#x').inputValue(),'12000','position has no former 1800px cap');
 // The document may scroll beyond the initial frame; its height must update rather than clip.
 await page.waitForFunction(()=>Number.parseInt(document.querySelector('#preview')?.style.height||'0',10)>1600,null,{timeout:15000});
 // Mobile browsing uses scroll mode; move mode remains available for touch edits.
 await page.locator('#scrollMode').click();
 await page.waitForFunction(()=>document.querySelector('#preview')?.contentDocument?.documentElement.classList.contains('mvn-builder-move-mode')===false,null,{timeout:15000});
 await page.locator('#moveMode').click();
 await page.waitForFunction(()=>document.querySelector('#preview')?.contentDocument?.documentElement.classList.contains('mvn-builder-move-mode')===true,null,{timeout:15000});
 await page.locator('#save').click();
 await page.waitForFunction(()=>document.querySelector('#status')?.textContent.includes('Private draft saved'),null,{timeout:15000});
 assert.equal(C.setting('visualBuilderPublishedV1'),null,'editing draft cannot change customer store');
 const publicHome=await context.newPage();
 await publicHome.goto(origin+'/',{waitUntil:'domcontentloaded'});
 assert.equal(await publicHome.locator('#mvnEditorialTitle').count(),1);
 assert.notEqual(await publicHome.locator('#mvnEditorialTitle').innerText(),'YOUR CUSTOM MVN HERO','private draft not public');
 await page.locator('#page').selectOption('/about.html');
 await iframe.locator('body').waitFor({state:'visible'});
 await page.locator('#addText').click();
 await page.locator('#save').click();
 await page.waitForFunction(()=>document.querySelector('#status')?.textContent.includes('Private draft saved'),null,{timeout:15000});
 page.once('dialog',dialog=>dialog.accept());
 await page.locator('#publish').click();
 await page.waitForFunction(()=>document.querySelector('#status')?.textContent.includes('Selected page published'),null,{timeout:15000});
 const published=C.setting('visualBuilderPublishedV1');
 assert.ok(published.pages['/about.html']?.length>0);
 assert.equal(published.pages['/'],undefined,'home is not published when about is selected');
 await publicHome.reload();
 assert.notEqual(await publicHome.locator('#mvnEditorialTitle').innerText(),'YOUR CUSTOM MVN HERO','homepage remains original');
 await page.locator('[data-view="mobile"]').click();
 assert.ok(await page.locator('#preview').evaluate(el=>el.classList.contains('mobile')));
 assert.deepEqual(errors,[],'builder must not raise browser JavaScript errors');
 console.log('MVN_SITE_BUILDER_BROWSER_QA_PASS');
 await publicHome.close();await context.close();
}finally{
 if(browser)await browser.close();
 if(child.exitCode===null){const gone=new Promise(ok=>child.once('exit',ok));child.kill();await gone;}
 C.db.close();rmSync(folder,{recursive:true,force:true});
}
