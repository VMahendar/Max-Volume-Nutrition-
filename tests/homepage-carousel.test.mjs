import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync,mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {defaultCarousel,validateCarousel,carouselMedia,renderInitialCarousel,optimizeHomeAssets} from '../homepage-carousel.mjs';
import {readFileSync} from 'node:fs';
import {openCommerce,hash} from '../commerce.mjs';

test('five starter banners use existing original pack photos and safe store links',()=>{
 const config=validateCarousel(defaultCarousel,src=>existsSync('public/'+src));
 assert.equal(config.slides.length,5);
 assert.ok(config.slides.some(s=>s.id==='force-one'));
 assert.ok(config.slides.some(s=>s.id==='potency-whey'));
 assert.equal(config.intervalMs,6000);
});

test('first banner is discoverable without script, with escaped text and responsive originals',()=>{
 const html=readFileSync('public/index.html','utf8');
 const config=carouselMedia(defaultCarousel);
 const result=optimizeHomeAssets(renderInitialCarousel(html,config));
 assert.match(result,/data-server-rendered="true"/);
 assert.match(result,/data-carousel-ready="true"/);
 assert.match(result,/Your daily<\/span> <em>protein\.<\/em>/,'Potency headline contains real whitespace and no separately positioned words');
 assert.match(result,/mvn-orange-whey-20261117-compact.webp 360w/);
 assert.match(result,/width="580" height="580"/);
 assert.match(result,/mvn-home-critical-20261118.css\?v=4/);
 assert.ok(!result.includes('<link rel="preload" as="image"'),'unused montage is not preloaded');
 assert.match(result,/<img class="mvn-owner-banner-img"[^>]*loading="lazy"/);
 assert.equal(renderInitialCarousel(html,{...config,enabled:false}),html,'disabled carousel retains the owner montage');
 config.slides[0].title='<script>bad</script>';
 assert.ok(renderInitialCarousel(html,config).includes('&lt;script&gt;bad&lt;/script&gt;'));
 assert.ok(!renderInitialCarousel(html,config).includes('<script>bad</script>'));
});

test('carousel rejects unsafe links, untrusted media, duplicate IDs and invalid bounds',()=>{
 const valid=src=>existsSync('public/'+src);
 const edit=fn=>{const c=structuredClone(defaultCarousel);fn(c);return c;};
 for(const config of [
  edit(c=>c.slides.length=2),edit(c=>c.intervalMs=3000),edit(c=>c.intervalMs=12001),
  edit(c=>c.autoplay='yes'),edit(c=>c.slides[1].id=c.slides[0].id),
  edit(c=>c.slides[0].href='javascript:alert(1)'),edit(c=>c.slides[0].href='//evil.example'),
  edit(c=>c.slides[0].images[0].src='assets/../secrets.png'),
  edit(c=>c.slides[0].images[0].src='https://evil.example/image.png'),
  edit(c=>c.slides[0].images[0].src='assets/absent-photo.webp'),
  edit(c=>c.slides[0].images[0].format='html'),edit(c=>c.slides[0].title='')
 ])assert.throws(()=>validateCarousel(config,valid));
});

test('admin carousel draft stays private, publish persists, stale publishes fail, and bootstrap escapes text',async()=>{
 const dir=mkdtempSync(join(tmpdir(),'mvn-carousel-api-'));
 const c=openCommerce(dir),token='local-carousel-test-session';
 c.db.prepare('INSERT INTO users(id,email,name,password,role,created) VALUES(?,?,?,?,?,?)').run('carousel-admin','carousel@example.test','Local test owner','unused','admin',new Date().toISOString());
 c.db.prepare('INSERT INTO sessions VALUES(?,?,?)').run(hash(token),'carousel-admin',Date.now()+60000);c.db.close();
 const origin='http://127.0.0.1:35321';
 const child=spawn(process.execPath,['server.mjs'],{cwd:resolve('.'),env:{...process.env,NODE_ENV:'test',STAGING_MODE:'false',DATA_DIR:dir,PUBLIC_ORIGIN:origin,PORT:'35321',HOST:'127.0.0.1',PAYMENTS_ENABLED:'false',SHIPROCKET_ENABLED:'false'},stdio:['ignore','pipe','pipe']});
 let logs='';child.stderr.on('data',x=>logs+=x);child.stdout.on('data',x=>logs+=x);
 const headers={Cookie:'mvn_session='+token,Origin:origin,'Content-Type':'application/json'};
 const request=(path,body,auth=true)=>fetch(origin+path,{headers:auth?headers:{Origin:origin,'Content-Type':'application/json'},...(body?{method:'POST',body:JSON.stringify(body)}:{})});
 try{
  let ready=false;for(let i=0;i<100;i++){try{const r=await request('/api/session');if(r.ok){ready=true;break;}}catch{}await new Promise(r=>setTimeout(r,50));}
  assert.ok(ready,logs);
  const home=await (await request('/')).text();
  assert.match(home,/data-server-rendered="true"/,'HTTP HTML contains real initial banner');
  const editor=await (await request('/?homepage_editor=1')).text();
  assert.ok(!editor.includes('data-server-rendered="true"'),'editor retains its original editable montage');
  const css=await request('/mvn-home-critical-20261118.css?v=4');assert.equal(css.status,200);
  assert.ok((await css.text()).includes('color:#666666!important'),'bundled styles retain the verified caption contrast');
  assert.equal((await request('/api/admin/homepage-carousel',null,false)).status,401);
  assert.equal((await request('/?carousel_preview=1',null,false)).status,401);
  const draft=structuredClone(defaultCarousel);draft.slides[0].title='DRAFT </script><script>untrusted</script>';
  let r=await request('/api/admin/homepage-carousel',{action:'save',carousel:draft});assert.equal(r.status,200,await r.text());
  const before=(await (await request('/api/homepage-carousel',null,false)).json()).carousel;
  assert.notEqual(before.slides[0].title,draft.slides[0].title,'draft is never public');
  const preview=await (await request('/?carousel_preview=1')).text();
  assert.ok(preview.includes('DRAFT \\u003c/script>'),'bootstrap text escapes HTML delimiters');
  assert.ok(!preview.includes('<script>untrusted</script>'));
  r=await request('/api/admin/homepage-carousel',{action:'publish',baseRevision:null,carousel:draft});assert.equal(r.status,200);
  const published=(await r.json()).carousel;
  assert.ok(published.revision);
  assert.equal((await (await request('/api/homepage-carousel',null,false)).json()).carousel.slides[0].title,draft.slides[0].title);
  assert.equal((await request('/api/admin/homepage-carousel',{action:'publish',baseRevision:null,carousel:defaultCarousel})).status,409);
  r=await request('/api/admin/homepage-carousel',{action:'publish',baseRevision:published.revision,carousel:defaultCarousel});assert.equal(r.status,200);
  const stored=openCommerce(dir);try{assert.equal(stored.setting('homepageCarouselPublishedV1').slides.length,5);assert.equal(stored.db.prepare("SELECT COUNT(*) AS n FROM audit WHERE action='homepage-carousel.publish'").get().n,2);}finally{stored.db.close();}
 }finally{child.kill('SIGTERM');await once(child,'exit');rmSync(dir,{recursive:true,force:true});}
});
