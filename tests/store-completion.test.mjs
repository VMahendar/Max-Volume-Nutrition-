import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {randomBytes} from 'node:crypto';
import {openCommerce} from '../commerce.mjs';
import {initializeLeadInbox} from '../lead-inbox.mjs';
import {listCustomers,customerDetails} from '../customer-directory.mjs';
import {encryptedSnapshot} from '../deploy/drive-backup.mjs';
import {backupStatus,verifyDownloadedBackup} from '../deploy/backup-status.mjs';
import {initializeOrderAlerts,enqueueOrderAlert,dispatchOrderAlerts} from '../order-alerts.mjs';

test('registered directory includes non-subscribers, paginates and never returns credential fields',()=>{
 const dir=mkdtempSync(join(tmpdir(),'mvn-directory-')),C=openCommerce(dir);initializeLeadInbox(C);
 try{
  for(let i=0;i<55;i++)C.db.prepare('INSERT INTO users VALUES(?,?,?,?,?,?)').run('person-'+i,'person'+i+'@example.test','Person '+i,'private-password-hash','customer',new Date().toISOString());
  const first=listCustomers(C,new URLSearchParams());assert.equal(first.total,55);assert.equal(first.customers.length,50);assert.equal(first.pages,2);
  assert.equal(listCustomers(C,new URLSearchParams({page:2})).customers.length,5);
  assert.equal(listCustomers(C,new URLSearchParams({search:'person54@'})).customers[0].id,'person-54');
  assert.equal(listCustomers(C,new URLSearchParams({search:'%'})).total,0,'search metacharacters are literal');
  assert.ok(!JSON.stringify(first).includes('private-password-hash'));
  assert.equal(customerDetails(C,'person-54').orders.length,0);
  assert.throws(()=>customerDetails(C,'missing'),{status:404});
 }finally{C.db.close();rmSync(dir,{recursive:true,force:true});}
});

test('downloaded backup restores and checks store tables without replacing live data',async()=>{
 const dir=mkdtempSync(join(tmpdir(),'mvn-recovery-')),C=openCommerce(dir),secret=randomBytes(32),env={MVN_BACKUP_ENCRYPTION_KEY_B64:secret.toString('base64')};
 try{
  const archive=await encryptedSnapshot(dir,secret),name='mvn-2026-11-17.sqlite.enc';
  C.db.prepare('INSERT INTO users VALUES(?,?,?,?,?,?)').run('after-snapshot','after@example.test','New live account','private','customer',new Date().toISOString());
  const result=verifyDownloadedBackup(dir,archive,name,env);
  assert.equal(result.integrity,'ok');assert.equal(result.counts.users,0);
  assert.equal(C.db.prepare('SELECT COUNT(*) n FROM users').get().n,1,'live account survives restore test');
  assert.equal(backupStatus(dir,env).lastRestore.name,name);
  const corrupt=Buffer.from(archive);corrupt[50]^=1;
  assert.throws(()=>verifyDownloadedBackup(dir,corrupt,name,env),{status:400});
  assert.throws(()=>verifyDownloadedBackup(dir,archive,'../orders.sqlite',env),{status:400});
 }finally{C.db.close();rmSync(dir,{recursive:true,force:true});}
});

test('owner alerts queue once, respect setup and never resend uncertain outcomes',async()=>{
 const dir=mkdtempSync(join(tmpdir(),'mvn-alert-')),C=openCommerce(dir);initializeOrderAlerts(C);
 const env={NODE_ENV:'production',ORDER_ALERTS_ENABLED:'true',RESEND_API_KEY:'fixture',ORDER_ALERT_FROM:'store@example.test',ORDER_ALERT_EMAIL:'owner@example.test'};
 try{
  const lead={id:'MVN-LEAD-FIXTURE'};enqueueOrderAlert(C,lead,{});enqueueOrderAlert(C,{...lead,alreadyRecorded:true},{});
  assert.equal(C.db.prepare('SELECT COUNT(*) n FROM order_alerts').get().n,2);
  let calls=0;const provider=async(url,options)=>{calls++;assert.equal(url,'https://api.resend.com/emails');assert.equal(options.headers['Idempotency-Key'],lead.id+':email');assert.deepEqual(JSON.parse(options.body).to,['owner@example.test']);return {ok:true,json:async()=>({id:'accepted-fixture'})};};
  await dispatchOrderAlerts(C,{...env,STAGING_MODE:'true'},provider);assert.equal(calls,0);
  await dispatchOrderAlerts(C,env,provider);await dispatchOrderAlerts(C,env,provider);assert.equal(calls,1);
  enqueueOrderAlert(C,{id:'MVN-LEAD-UNKNOWN'},{});
  await dispatchOrderAlerts(C,env,async()=>{throw Error('timeout');});
  await dispatchOrderAlerts(C,env,provider);assert.equal(calls,1,'unknown delivery is not retried');
  assert.equal(C.db.prepare("SELECT status FROM order_alerts WHERE id='MVN-LEAD-UNKNOWN:email'").get().status,'unknown');
 }finally{C.db.close();rmSync(dir,{recursive:true,force:true});}
});
