import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdtempSync,rmSync,mkdirSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {randomBytes,randomUUID} from 'node:crypto';
import {setTimeout as delay} from 'node:timers/promises';
import {chromium} from 'playwright';
import {openCommerce,passwordHash} from '../commerce.mjs';

const folder=mkdtempSync(join(tmpdir(),'mvn-completion-browser-')),origin='http://127.0.0.1:35938';
const C=openCommerce(folder),password=randomBytes(24).toString('hex');
C.db.prepare('INSERT INTO users VALUES(?,?,?,?,?,?)').run('completion-owner','owner-qa@example.test','Test Owner',await passwordHash(password),'admin',new Date().toISOString());
const app=spawn(process.execPath,['server.mjs'],{env:{...process.env,HOST:'127.0.0.1',PORT:'35938',DATA_DIR:folder,PUBLIC_ORIGIN:origin,NODE_ENV:'test',STAGING_MODE:'false',PAYMENTS_ENABLED:'false',SHIPROCKET_ENABLED:'false',ORDER_ALERTS_ENABLED:'false'},stdio:['ignore','pipe','pipe']});
let stderr='',browser;app.stderr.on('data',d=>stderr+=d.toString());
const observations=[];mkdirSync('reports/visual-qa',{recursive:true});
try{
 let ready=false;for(let i=0;i<60;i++){try{if((await fetch(origin+'/healthz')).ok){ready=true;break;}}catch{}await delay(150);}assert.ok(ready,stderr);
 browser=await chromium.launch({headless:true,args:['--no-sandbox'],...(process.env.CHROMIUM_EXECUTABLE_PATH?{executablePath:process.env.CHROMIUM_EXECUTABLE_PATH}:{})});
 for(const width of [390,1440]){
  const page=await browser.newPage({viewport:{width,height:900}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(origin+'/',{waitUntil:'networkidle'});
  await page.locator('.mvn-campaign-carousel').waitFor();
  assert.equal(await page.locator('.mvn-campaign-slide').count(),5);
  if(width===390){await page.waitForFunction(()=>document.querySelectorAll('.mvn-campaign-slide')[1].hidden===false,{},{timeout:10000});}
  await page.locator('.mvn-campaign-pause').click();
  assert.equal(await page.locator('.mvn-best-product').count(),4);
  await page.locator('.mvn-best-product').first().scrollIntoViewIfNeeded();
  await page.screenshot({path:'reports/visual-qa/completion-best-'+width+'.png'});
  const boxes=await page.locator('.mvn-best-product').evaluateAll(nodes=>nodes.map(el=>{const b=el.getBoundingClientRect();return {left:b.left,top:b.top,right:b.right,bottom:b.bottom};}));
  for(let i=0;i<boxes.length;i++)for(let j=i+1;j<boxes.length;j++){const a=boxes[i],b=boxes[j];assert.ok(!(Math.min(a.right,b.right)>Math.max(a.left,b.left)+4&&Math.min(a.bottom,b.bottom)>Math.max(a.top,b.top)+4),'best sellers do not overlap');}
  for(const path of ['potency-whey.html','nitro-mass.html','sturdy-pre-workout.html','pro-creatine.html']){
   await page.goto(origin+'/'+path,{waitUntil:'networkidle'});
   await page.locator('[data-mvn-product-order]').waitFor({state:'visible'});
   await page.waitForFunction(()=>{const images=[...document.querySelectorAll('main .media img, main .nitro-pack-choose img')];return images.length>0&&images.every(img=>img.complete&&img.naturalWidth>0);});
   assert.ok(await page.locator('[data-order-field="price"]').innerText());
   const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth);assert.ok(overflow<=2,path+' overflow at '+width+': '+overflow);
   await page.screenshot({path:'reports/visual-qa/completion-'+path.replace('.html','')+'-'+width+'.png',fullPage:false});
  }
  await page.locator('[data-order-field="flavor"]').selectOption({label:'Cranberry'});
  await page.waitForFunction(()=>{const x=document.querySelector('main .media img');return x.complete&&x.naturalWidth>0&&/cranberry/i.test(x.alt);});
  const currentCatalog=await (await page.request.get(origin+'/api/retail/catalog')).json();
  const cranberry=currentCatalog.products.find(p=>p.id==='pro-creatine').variants.find(v=>v.id==='creatine-cranberry');
  assert.equal(await page.locator('main .media img').getAttribute('src'),cranberry.image,'selected flavour uses its own catalogue photo');
  await page.locator('[data-order-field="plus"]').click();
  await page.locator('[data-order-field="add"]').click();
  await page.waitForURL('**/shop.html?open=cart');
  await page.waitForFunction(()=>document.getElementById('count')?.textContent==='2');
  assert.match(await page.locator('#items').innerText(),/Cranberry/);
  await page.reload({waitUntil:'networkidle'});assert.equal(await page.locator('#count').innerText(),'2','cart persists on reload');
  await page.goto(origin+'/shop.html?brand=globtech',{waitUntil:'networkidle'});
  assert.match(await page.locator('#grid').innerText(),/Coming soon/i);
  assert.equal(await page.locator('#grid .card .add:visible').count(),0,'upcoming packs cannot enter cart');
  await page.locator('#grid .card .photo img').last().scrollIntoViewIfNeeded();
  await page.waitForFunction(()=>[...document.querySelectorAll('#grid .card .photo img')].every(x=>x.complete&&x.naturalWidth>0));
  const packPhotos=await page.locator('#grid .card .photo img').evaluateAll(images=>images.map(x=>({src:x.getAttribute('src'),ok:x.complete&&x.naturalWidth>0})));
  assert.ok(packPhotos.length>=4&&packPhotos.every(x=>x.ok),'Globe-Tech official photos load');
  assert.deepEqual(errors,[],'browser JS errors');observations.push({width,products:4,cart:'persisted',globtech:'coming soon'});await page.close();
 }
 // Authenticated workflows use only the isolated local database.
 const buyer=await browser.newPage();await buyer.goto(origin+'/account.html');
 for(const [name,value] of Object.entries({name:'Registered Buyer',email:'buyer-qa@example.test',password}))await buyer.locator('#register [name="'+name+'"]').fill(value);
 await buyer.locator('#register button[type="submit"]').click();await buyer.locator('#signedIn').waitFor({state:'visible'});
 assert.equal((await buyer.request.get(origin+'/api/admin/customers')).status(),403);
 const buyerId=(await (await buyer.request.get(origin+'/api/session')).json()).user.id;
 await buyer.request.post(origin+'/api/logout',{headers:{Origin:origin},data:{}});
 await buyer.request.post(origin+'/api/login',{headers:{Origin:origin},data:{email:'buyer-qa@example.test',password}});
 const lead=await buyer.request.post(origin+'/api/enquiries',{headers:{Origin:origin},data:{requestKey:randomUUID(),kind:'retail',name:'Registered Buyer',phone:'9876543210',address:'QA Road',city:'Chennai',state:'Tamil Nadu',pincode:'603103',items:[{variantId:'creatine-blueberry',quantity:1}],acknowledgeStorage:true}});
 assert.equal(lead.status(),201,await lead.text());
 await buyer.reload();await buyer.locator('#orders').getByText(/MVN-LEAD-/).waitFor();
 const dealer=await browser.newPage();await dealer.goto(origin+'/wholesale-account.html');
 for(const [name,value] of Object.entries({name:'Trade QA',email:'trade-qa@example.test',password,business:'QA Gym',phone:'9876543211',city:'Chennai',address:'Test Business Street',pincode:'603103',gstin:'33AAAAA0000A1Z5'}))await dealer.locator('#b2bRegister [name="'+name+'"]').fill(value);
 await dealer.locator('#b2bRegister [name="kind"]').selectOption('wholesale');await dealer.locator('#b2bRegister button[type="submit"]').click();await dealer.locator('#wholesaleStatus').getByText(/PENDING/).waitFor();
 assert.equal((await dealer.request.get(origin+'/api/dealer/catalog')).status(),403);
 const dealerId=(await (await dealer.request.get(origin+'/api/session')).json()).user.id;
 const owner=await browser.newPage({viewport:{width:1440,height:900}});await owner.goto(origin+'/admin.html#customers');
 await owner.locator('#ownerLoginForm [name="email"]').fill('owner-qa@example.test');await owner.locator('#ownerLoginForm [name="password"]').fill(password);await owner.locator('#ownerLoginForm button').click();
 await owner.locator('#customerDirectory').getByText('buyer-qa@example.test').waitFor();
 const directory=await (await owner.request.get(origin+'/api/admin/customers')).json();const found=directory.customers.find(x=>x.id===buyerId);assert.ok(found.lastLogin);assert.equal(found.enquiryCount,1);assert.equal(C.db.prepare('SELECT COUNT(*) n FROM marketing_preferences WHERE consented_at IS NOT NULL').get().n,0,'directory does not subscribe customers');
 await owner.locator('[data-customer="'+buyerId+'"]').click();await owner.locator('#customerOrderDetails').getByText(/MVN-LEAD-/).waitFor();
 await owner.screenshot({path:'reports/visual-qa/completion-admin-customers.png'});
 const approval=await owner.request.post(origin+'/api/admin/dealer',{headers:{Origin:origin},data:{userId:dealerId,status:'approved'}});assert.equal(approval.status(),200);
 assert.equal((await dealer.request.get(origin+'/api/dealer/catalog')).status(),200);
 assert.equal((await (await dealer.request.get(origin+'/api/retail/catalog')).json()).tier,'retail');
 await owner.goto(origin+'/admin.html#store-health');await owner.locator('#backupHealth').getByText(/Offsite configuration/).waitFor();await owner.screenshot({path:'reports/visual-qa/completion-admin-health.png'});
 await owner.goto(origin+'/admin.html#banner-slides');await owner.locator('#bannerSlideCards .banner-slide-card').first().waitFor();
 const anonymous=await browser.newContext();assert.equal((await anonymous.request.get(origin+'/api/admin/customers')).status(),401);assert.equal((await anonymous.request.get(origin+'/api/admin/store-health')).status(),401);await anonymous.close();
 writeFileSync('reports/visual-qa/store-completion.json',JSON.stringify({observations,accounts:'registration, login tracking, admin directory, enquiry isolation and history passed',wholesale:'pending blocked; admin approval unlocks private catalogue',providers:'disabled'},null,2));
 console.log('PASS: mobile/desktop product photos, best sellers, carousel, cart persistence, Coming Soon catalogue, customer directory/history, wholesale approval and owner editor.');
}finally{await browser?.close();if(app.exitCode===null){const ended=new Promise(ok=>app.once('exit',ok));app.kill();await ended;}C.db.close();rmSync(folder,{recursive:true,force:true});}
