import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {resolve} from 'node:path';

test('served HTML has fresh CSP nonces, intact dynamic scripts and compatible security headers',async()=>{
 const dir=mkdtempSync(resolve(tmpdir(),'mvn-csp-'));
 const port=39861;
 const child=spawn(process.execPath,['server.mjs'],{
  env:{...process.env,PORT:String(port),DATA_DIR:dir,NODE_ENV:'production',PUBLIC_ORIGIN:'https://maxvolumenutriton.shop',PAYMENTS_ENABLED:'false',SHIPROCKET_ENABLED:'false',STAGING_MODE:'false'},
  stdio:['ignore','pipe','pipe']
 });
 try{
  await new Promise((ok,no)=>{
   const timer=setTimeout(()=>no(Error('Server startup timeout')),10000);
   child.stdout.once('data',()=>{clearTimeout(timer);ok();});
   child.once('exit',()=>{clearTimeout(timer);no(Error('Server exited'));});
  });
  const nonces=new Set();
  for(const path of ['/','/','/shop.html','/potency-whey.html','/nitro-mass.html','/account.html','/reviews.html','/admin.html','/layout-editor.html']){
   const response=await fetch(`http://localhost:${port}${path}`);
   assert.equal(response.status,200,path);
   assert.equal(response.headers.get('cache-control'),'no-store');
   const policy=response.headers.get('content-security-policy');
   const nonce=policy.match(/'nonce-([^']+)'/)?.[1];
   assert.ok(nonce?.length>=32,'Cryptographically random response nonce');
   assert.ok(!nonces.has(nonce),'Never reuse nonces between HTML responses');
   nonces.add(nonce);
   assert.ok(policy.includes("'strict-dynamic'"));
   assert.ok(policy.includes("script-src-attr 'none'"));
   assert.ok(policy.includes("object-src 'none'"));
   assert.equal(response.headers.get('cross-origin-opener-policy'),'same-origin-allow-popups');
   assert.equal(response.headers.get('strict-transport-security'),'max-age=31536000; includeSubDomains');
   assert.equal(response.headers.get('content-security-policy-report-only'),"require-trusted-types-for 'script'");
   const html=await response.text();
   for(const [tag] of html.matchAll(/<script\b[^>]*>/gi))assert.ok(tag.includes(`nonce="${nonce}"`),`${path}: untrusted script tag ${tag}`);
   if(path==='/')assert.match(html,/id="mvnHomepageDesign"/,'Keep server-generated homepage configuration');
  }
 }finally{
  if(child.exitCode===null){const stopped=new Promise(r=>child.once('exit',r));child.kill();await stopped;}
  rmSync(dir,{recursive:true,force:true});
 }
});
