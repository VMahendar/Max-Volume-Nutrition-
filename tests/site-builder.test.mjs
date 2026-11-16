import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {resolve} from 'node:path';
import {spawn} from 'node:child_process';
import {randomBytes} from 'node:crypto';
import {openCommerce,passwordHash} from '../commerce.mjs';
import {canonicalBuilderPage,validateVisualBuilder} from '../site-builder.mjs';

const anchor='body > main:nth-of-type(1) > section:nth-of-type(2) > h2:nth-of-type(1)';
const id='v123456789abcd';
test('full site builder validates multiple pages and rejects unsafe operations',()=>{
 assert.equal(canonicalBuilderPage('/index.html'),'/');
 assert.equal(canonicalBuilderPage('/checkout.html'),null);
 const valid={version:1,pages:{'/':[{id,action:'move',target:anchor,device:'desktop',values:{x:45,y:-15}}],'/about.html':[{id:'v123456789abce',action:'insert',target:'body',device:'all',element:'text',position:'inside',text:'New editorial block'}]}};
 assert.deepEqual(validateVisualBuilder(valid),valid);
 for(const bad of [
  {action:'text',text:'<script>hello</script>'.repeat(90)},
  {action:'style',values:{position:'fixed'}},
  {action:'move',values:{x:100000}},
  {action:'insert',element:'iframe',position:'inside',text:'unsafe'},
  {action:'image',src:'https://other.site/image.jpg'},
  {action:'insert',element:'button',text:'Buy',href:'javascript:alert(1)',position:'after'},
  {action:'hide',target:'form:nth-of-type(1)'},
 ]) {
  const op={id,action:bad.action||'hide',device:'all',target:anchor,...bad};
  assert.throws(()=>validateVisualBuilder({version:1,pages:{'/':[op]}},()=>false));
 }
 assert.throws(()=>validateVisualBuilder({version:1,pages:{'/checkout.html':[]}}));
 const generated={version:1,pages:{'/':[{id,action:'insert',device:'all',target:'body',element:'image',position:'inside',text:'',src:'assets/homepage/test.webp'},{id:'v123456789abcf',action:'move',device:'all',target:'@'+id,values:{x:20,y:30}}]}};
 assert.equal(validateVisualBuilder(generated,src=>src==='assets/homepage/test.webp').pages['/'].length,2);
 const js=readFileSync('public/site-builder-runtime.js','utf8');
 const ui=readFileSync('public/visual-builder.html','utf8');
 assert.match(js,/pointerdown/);
 assert.match(js,/pointerup/);
 assert.match(ui,/id="fileUpload"/);
 assert.match(ui,/id="paste"/);
});

test('visual builder is admin-only, saves private drafts and publishes only selected page',async()=>{
 const dir=mkdtempSync(resolve(tmpdir(),'mvn-multisite-builder-'));
 const C=openCommerce(dir),password=randomBytes(24).toString('hex'),owner='visual-site-owner';
 C.db.prepare('INSERT INTO users VALUES(?,?,?,?,?,?)').run(owner,'owner-visual@example.com','MVN owner',await passwordHash(password),'admin',new Date().toISOString());
 const port=35919,origin='http://localhost:'+port;
 const server=spawn(process.execPath,['server.mjs'],{env:{...process.env,HOST:'127.0.0.1',PORT:String(port),DATA_DIR:dir,PUBLIC_ORIGIN:origin,NODE_ENV:'test',STAGING_MODE:'false',PAYMENTS_ENABLED:'false',SHIPROCKET_ENABLED:'false'},stdio:['ignore','pipe','pipe']});
 let stderr='';server.stderr.on('data',data=>stderr+=data);
 try{
  await new Promise((done,fail)=>{
   const timeout=setTimeout(()=>fail(Error('Server did not boot: '+stderr)),12000);
   server.stdout.once('data',()=>{clearTimeout(timeout);done();});
   server.once('exit',()=>{clearTimeout(timeout);fail(Error(stderr));});
  });
  const request=(path,body,cookie)=>fetch(origin+path,{redirect:'manual',method:body?'POST':'GET',headers:{...(body?{'Content-Type':'application/json',Origin:origin}:{}),...(cookie?{Cookie:cookie}:{})},...(body?{body:JSON.stringify(body)}:{})});
  assert.equal((await request('/visual-builder.html')).status,200);
  assert.equal((await request('/api/admin/visual-builder')).status,401);
  assert.equal((await request('/?visual_builder=1')).status,401);
  const login=await request('/api/login',{email:'owner-visual@example.com',password});
  assert.equal(login.status,200);const cookie=login.headers.get('set-cookie').split(';')[0];
  const prev=await request('/?visual_builder=1',null,cookie);
  assert.equal(prev.status,200);
  assert.equal(prev.headers.get('x-frame-options'),'SAMEORIGIN');
  assert.match(prev.headers.get('content-security-policy'),/frame-ancestors 'self'/);
  assert.match(await prev.text(),/site-builder-runtime.js/);
  const publicBefore=await (await request('/')).text();
  assert.doesNotMatch(publicBefore,/mvnVisualBuilderConfig/);
  const multi={version:1,pages:{'/':[{id,action:'text',device:'all',target:anchor,text:'A custom editorial heading'}],'/about.html':[{id:'v123456789abcf',action:'move',device:'all',target:'body > main:nth-of-type(1)',values:{x:10,y:0}}]}};
  let response=await request('/api/admin/visual-builder',{action:'save',page:'/',baseRevision:null,design:multi},cookie);
  assert.equal(response.status,200);
  assert.equal(C.setting('visualBuilderPublishedV1'),null);
  assert.doesNotMatch(await (await request('/')).text(),/mvnVisualBuilderConfig/);
  response=await request('/api/admin/visual-builder',{action:'publish',page:'/',baseRevision:null,design:multi},cookie);
  assert.equal(response.status,200);const revision=(await response.json()).revision;
  const published=C.setting('visualBuilderPublishedV1');
  assert.equal(published.pages['/'].length,1);
  assert.equal(published.pages['/about.html'],undefined,'other page was not implicitly published');
  const publicAfter=await (await request('/')).text();
  assert.match(publicAfter,/mvnVisualBuilderConfig/);
  assert.match(publicAfter,/site-builder-runtime.js/);
  const aboutPublic=await (await request('/about.html')).text();
  assert.doesNotMatch(aboutPublic,/mvnVisualBuilderConfig/);
  assert.equal((await request('/api/admin/visual-builder',{action:'publish',page:'/',baseRevision:null,design:multi},cookie)).status,409,'stale publish blocked');
  assert.equal((await request('/api/admin/visual-builder',{action:'publish',page:'/about.html',baseRevision:revision,design:multi},cookie)).status,200);
  assert.equal(C.setting('visualBuilderPublishedV1').pages['/about.html'].length,1);
  assert.equal((await request('/api/admin/visual-builder',{action:'publish',page:'/checkout.html',baseRevision:revision,design:multi},cookie)).status,400);
 }finally{
  if(server.exitCode===null){const closed=new Promise(done=>server.once('exit',done));server.kill();await closed;}
  C.db.close();rmSync(dir,{recursive:true,force:true});
 }
});
