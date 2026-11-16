import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {resolve} from 'node:path';
import {spawn} from 'node:child_process';
import {randomBytes} from 'node:crypto';
import {openCommerce,passwordHash} from '../commerce.mjs';
import {validateHomepageDesign} from '../homepage-design.mjs';

test('homepage settings reject unknown fields, unsafe values and incomplete order',()=>{
 const base={version:2,fields:{heroTitle:'A heading',bannerImage:'assets/pack.webp'},order:['hero','categories','bestsellers','brands']};
 assert.deepEqual(validateHomepageDesign(base,()=>true),base);
 for(const fields of [{headerColor:'red;display:none'},{headerHeight:900},{script:'alert(1)'},{bannerImage:'javascript:alert(1)'},{heroVisible:'yes'}])assert.throws(()=>validateHomepageDesign({...base,fields},src=>src==='assets/pack.webp'));
 assert.throws(()=>validateHomepageDesign({...base,order:['hero','hero','categories','brands']},()=>true));
});

test('owner editor authenticates, saves private drafts, publishes safely and persists images',async()=>{
 const dir=mkdtempSync(resolve(tmpdir(),'mvn-editor-test-'));
 const commerce=openCommerce(dir),password=randomBytes(20).toString('hex'),adminId='editor-test-owner';
 commerce.db.prepare('INSERT INTO users VALUES(?,?,?,?,?,?)').run(adminId,'editor@example.com','Editor owner',await passwordHash(password),'admin',new Date().toISOString());
 const port=34918,origin='http://localhost:'+port;
 const child=spawn(process.execPath,['server.mjs'],{env:{...process.env,PORT:String(port),DATA_DIR:dir,PUBLIC_ORIGIN:origin,NODE_ENV:'test',STAGING_MODE:'false'},stdio:['ignore','pipe','pipe']});
 let stderr='';child.stderr.on('data',chunk=>stderr+=chunk);
 try{
  await new Promise((ok,no)=>{const timer=setTimeout(()=>no(Error(stderr||'Server startup timed out')),10000);child.stdout.once('data',()=>{clearTimeout(timer);ok();});child.once('exit',()=>{clearTimeout(timer);no(Error(stderr));});});
  const request=(path,body,cookie)=>fetch(origin+path,{redirect:'manual',...(body?{method:'POST',headers:{Origin:origin,'Content-Type':'application/json',...(cookie?{Cookie:cookie}:{})},body:JSON.stringify(body)}:{headers:cookie?{Cookie:cookie}:{}})});
  const page=await request('/layout-editor.html');assert.equal(page.status,200);assert.doesNotMatch(page.headers.get('location')||'',/account/);assert.match(await page.text(),/id="loginForm"/);
  assert.equal((await request('/api/admin/homepage-design')).status,401);
  assert.equal((await request('/?homepage_editor=1')).status,401);
  const login=await request('/api/login',{email:'editor@example.com',password});assert.equal(login.status,200);const cookie=login.headers.get('set-cookie').split(';')[0];
  const preview=await request('/?homepage_editor=1',null,cookie);assert.equal(preview.status,200);assert.equal(preview.headers.get('x-frame-options'),'SAMEORIGIN');assert.match(preview.headers.get('content-security-policy'),/frame-ancestors 'self'/);
  const html=await preview.text();assert.match(html,/data-homepage-editor="true"/);assert.match(html,/homepage-design.js/);
  const regular=await request('/');assert.equal(regular.headers.get('x-frame-options'),'DENY');
  const empty=(await (await request('/api/admin/homepage-design',null,cookie)).json()).empty;
  const design={...empty,fields:{heroTitle:'Test </script> heading',headerHeight:78,bannerPosition:50}};
  let result=await request('/api/admin/homepage-design',{action:'save',design},cookie);assert.equal(result.status,200);
  assert.equal((await (await request('/api/admin/homepage-design',null,cookie)).json()).published,null);
  assert.match(await (await request('/')).text(),/id="mvnHomepageDesign">null<\/script>/,'saving a draft leaves public homepage unchanged');
  result=await request('/api/admin/homepage-design',{action:'publish',design,baseRevision:null},cookie);assert.equal(result.status,200);const revision=(await result.json()).design.revision;
  const publishedHtml=await (await request('/')).text();assert.match(publishedHtml,/Test \\u003c\/script>/,'embedded content is safely escaped');
  assert.equal((await request('/api/admin/homepage-design',{action:'publish',design,baseRevision:null},cookie)).status,409,'stale publish rejected');
  assert.equal((await request('/api/admin/homepage-design',{action:'publish',design,baseRevision:revision},cookie)).status,200);
  const content=readFileSync('public/icons/app-192.png');
  result=await request('/api/admin/homepage-images',{content:content.toString('base64')},cookie);assert.equal(result.status,201);const image=(await result.json()).path;
  const served=await request('/'+image);assert.equal(served.headers.get('content-type'),'image/png');assert.deepEqual(Buffer.from(await served.arrayBuffer()),content);
  assert.equal((await request('/api/admin/homepage-images',{content:Buffer.from('<svg>not an image</svg>').toString('base64')},cookie)).status,400);
  assert.equal((await request('/api/admin/homepage-design',{action:'save',design:{...empty,fields:{bannerImage:image}}},cookie)).status,200);
  assert.equal((await request('/api/admin/homepage-design',{action:'save',design:{...empty,fields:{bannerImage:'../secret.png'}}},cookie)).status,400);
 }finally{if(child.exitCode===null){const stopped=new Promise(ok=>child.once('exit',ok));child.kill();await stopped;}commerce.db.close();rmSync(dir,{recursive:true,force:true});}
});
