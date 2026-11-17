import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createHmac} from 'node:crypto';
import {openCommerce} from '../commerce.mjs';
import {initializeReviews,recordReviewPurchase,revokeReviewPurchase} from '../customer-reviews.mjs';
import {initializeReviewAutomation,REVIEW_TEMPLATES,reviewAutomationReadiness,saveReviewAutomation,verifyReviewWhatsapp,saveReviewConsent,captureReviewDelivery,enqueueReviewRequests,dispatchReviewRequests,reviewRequestDetails,stopReviewRequests,receiveReviewWhatsapp} from '../review-automation.mjs';
const DAY=86400000,NOW=Date.parse('2026-01-04T08:00:00Z');
const env={NODE_ENV:'production',STAGING_MODE:'false',REVIEW_AUTOMATION_ENABLED:'true',REVIEW_MESSAGE_SPEND_APPROVED:'true',WHATSAPP_ACCESS_TOKEN:'private-fixture',WHATSAPP_PHONE_NUMBER_ID:'12345',WHATSAPP_GRAPH_VERSION:'v27.0',WHATSAPP_BUSINESS_ACCOUNT_ID:'88888',WHATSAPP_TEMPLATE_LANGUAGE:'en',REVIEW_WHATSAPP_REQUEST_TEMPLATE:'mvn_review_request',REVIEW_WHATSAPP_REMINDER_TEMPLATE:'mvn_review_reminder',WHATSAPP_APP_SECRET:'private-webhook-fixture',REVIEW_WHATSAPP_VERIFY_TOKEN:'private-verify-fixture',MSG91_AUTH_KEY:'private-sms-fixture',REVIEW_SMS_TEMPLATE_ID:'fixture-template-id',REVIEW_SMS_SENDER_ID:'MAXVOL',REVIEW_SMS_DLT_ENTITY_ID:'123456789012',REVIEW_SMS_DLT_TEMPLATE_ID:'1234567890123',REVIEW_SMS_DLT_APPROVED:'true'};
function fixture(){const dir=mkdtempSync(join(tmpdir(),'mvn-review-auto-')),C=openCommerce(dir);initializeReviews(C);initializeReviewAutomation(C);initializeReviewAutomation(C);
 C.db.prepare('INSERT INTO users VALUES(?,?,?,?,?,?)').run('alice','alice@example.test','Alice PrivateSurname','unused','customer',new Date(NOW).toISOString());
 C.set('customerReviewsV1',{googleReviewUrl:'https://g.page/r/fixture/review'});
 C.set('reviewAutomationV1',{enabled:true,dailyMax:20,monthlyMax:200,startedAt:new Date(NOW-4*DAY).toISOString()});
 const proof=recordReviewPurchase(C,'owner',{email:'alice@example.test',productId:'potency-whey',receipt:'PRIVATE-INVOICE',delivered:'2026-01-01',confirmDelivered:true});
 captureReviewDelivery(C,'offline',proof.purchaseId,NOW-3*DAY);
 return {C,proof,close(){C.db.close();rmSync(dir,{recursive:true,force:true});}};
}
function consent(C,channels={whatsapp:true,sms:true}){return saveReviewConsent(C,'owner',{email:'alice@example.test',phone:'9876543210',...channels,explicitConsent:true,evidence:'Customer opted in during completed sale conversation.'},NOW-3*DAY);}
async function verified(C,now=NOW){return verifyReviewWhatsapp(C,env,async url=>({ok:true,json:async()=>url.includes('phone_numbers')?{data:[{id:'12345',display_phone_number:'+91 77088 30513'}]}:{data:[{name:url.includes('mvn_review_reminder')?'mvn_review_reminder':'mvn_review_request',language:'en',status:'APPROVED',components:[{type:'BODY',text:url.includes('mvn_review_reminder')?REVIEW_TEMPLATES.reminder:REVIEW_TEMPLATES.request}]}]}}),now);}
function provider(calls){return async(url,opts)=>{calls.push({url,body:JSON.parse(opts.body)});return {ok:true,json:async()=>url.includes('facebook')?{messages:[{id:'wamid.'+calls.length}]}:{type:'success',message:'sms-request-'+calls.length}};};}

test('provider checks pin the existing sender and approved templates; all live gates fail closed',async()=>{
 const f=fixture(),{C}=f;try{
  assert.equal(reviewAutomationReadiness(C,env,NOW).ready,false);await verified(C);assert.equal(reviewAutomationReadiness(C,env,NOW).ready,true);
  for(const patch of [{NODE_ENV:'test'},{STAGING_MODE:'true'},{REVIEW_AUTOMATION_ENABLED:'false'},{REVIEW_MESSAGE_SPEND_APPROVED:'false'},{WHATSAPP_ACCESS_TOKEN:'changed'},{MSG91_AUTH_KEY:''},{REVIEW_SMS_DLT_APPROVED:'false'}])assert.equal(reviewAutomationReadiness(C,{...env,...patch},NOW).ready,false);
  assert.equal(reviewAutomationReadiness(C,env,NOW+2*DAY).channels.whatsapp.ready,false,'verification expires');
  await assert.rejects(verifyReviewWhatsapp(C,env,async()=>({ok:true,json:async()=>({data:[{id:'12345',display_phone_number:'+91 99999 99999'}]})}),NOW),{status:409});
  C.set('customerReviewsV1',{});assert.equal(reviewAutomationReadiness(C,env,NOW).ready,false);
  assert.throws(()=>saveReviewAutomation(C,'owner',{enabled:true,dailyMax:20,monthlyMax:200},env,NOW),{status:409});
  assert.equal(saveReviewAutomation(C,'owner',{enabled:false,dailyMax:10,monthlyMax:50},env,NOW).enabled,false);
 }finally{f.close();}
});
test('only new completed deliveries plus separate channel consent queue once after three days',()=>{
 const f=fixture(),{C}=f;try{
  assert.equal(enqueueReviewRequests(C,NOW).added,0,'marketing/account registration is not review consent');
  consent(C,{whatsapp:false,sms:true});assert.equal(enqueueReviewRequests(C,NOW-DAY).added,0);
  assert.equal(enqueueReviewRequests(C,NOW).added,1);assert.equal(enqueueReviewRequests(C,NOW).added,0);
  captureReviewDelivery(C,'offline',f.proof.purchaseId,NOW);assert.equal(C.db.prepare('SELECT COUNT(*) n FROM review_request_events').get().n,1);
  assert.equal(C.db.prepare('SELECT channel FROM review_request_outbox').get().channel,'sms');
  assert.throws(()=>saveReviewConsent(C,'owner',{email:'alice@example.test',phone:'9876543210',whatsapp:true,sms:true,explicitConsent:false,evidence:'Missing permission'},NOW),{status:400});
 }finally{f.close();}
});
test('both providers accept the initial request once and permit only one reminder after five days',async()=>{
 const f=fixture(),{C}=f,calls=[];try{
  await verified(C);consent(C);assert.equal(enqueueReviewRequests(C,NOW).added,2);
  const mock=provider(calls);assert.equal((await dispatchReviewRequests(C,{env,fetcher:mock,now:NOW})).accepted,2);
  assert.equal((await dispatchReviewRequests(C,{env,fetcher:mock,now:NOW})).accepted,0);
  assert.equal(calls.length,2);const sms=calls.find(c=>c.url.includes('msg91')),wa=calls.find(c=>c.url.includes('facebook'));
  assert.equal(sms.body.short_url,'0');assert.equal(sms.body.recipients[0].mobiles,'919876543210');
  assert.ok(sms.body.recipients[0].review_url.startsWith('https://maxvolumenutriton.shop/review-request.html?t='));
  assert.equal(wa.body.type,'template');assert.equal(wa.body.template.components[0].parameters.length,4);
  assert.ok(!JSON.stringify(calls).includes('PRIVATE-INVOICE'));
  assert.equal(enqueueReviewRequests(C,NOW+4*DAY).added,0);
  await verified(C,NOW+5*DAY);assert.equal(enqueueReviewRequests(C,NOW+5*DAY).added,2);
  assert.equal((await dispatchReviewRequests(C,{env,fetcher:mock,now:NOW+5*DAY})).accepted,2);
  assert.equal(enqueueReviewRequests(C,NOW+10*DAY).added,0);assert.equal(calls.length,4);
 }finally{f.close();}
});
test('a pending one-star review, revoked purchase, opt-out or changed contact cancels delivery',async()=>{
 for(const reason of ['review','revoked','optout','changed']){
  const f=fixture(),{C}=f,calls=[];try{
   await verified(C);consent(C);enqueueReviewRequests(C,NOW);
   if(reason==='review')C.db.prepare('INSERT INTO product_reviews VALUES(?,?,?,?,?,?,?,?,?)').run('one-star','potency-whey','alice',1,'My experience','This product did not suit my needs.','pending',new Date(NOW).toISOString(),new Date(NOW).toISOString());
   if(reason==='revoked')revokeReviewPurchase(C,'owner',f.proof.purchaseId);
   if(reason==='optout')saveReviewConsent(C,'owner',{email:'alice@example.test',phone:'9876543210',whatsapp:false,sms:false},NOW);
   if(reason==='changed')saveReviewConsent(C,'owner',{email:'alice@example.test',phone:'9876543211',whatsapp:true,sms:true,explicitConsent:true,evidence:'Updated contact checked with customer'},NOW);
   assert.equal((await dispatchReviewRequests(C,{env,fetcher:provider(calls),now:NOW})).accepted,0,reason);assert.equal(calls.length,0);
  }finally{f.close();}
 }
});
test('quiet hours, previews, missing budget approval and daily/monthly caps block provider sends',async()=>{
 const f=fixture(),{C}=f,calls=[];try{
  await verified(C);consent(C);enqueueReviewRequests(C,NOW);
  for(const e of [{...env,NODE_ENV:'test'},{...env,STAGING_MODE:'true'},{...env,REVIEW_MESSAGE_SPEND_APPROVED:'false'}])await dispatchReviewRequests(C,{env:e,fetcher:provider(calls),now:NOW});
  await dispatchReviewRequests(C,{env,fetcher:provider(calls),now:Date.parse('2026-01-04T16:00:00Z')});assert.equal(calls.length,0);
  C.set('reviewAutomationV1',{...C.setting('reviewAutomationV1'),dailyMax:1,monthlyMax:1});
  assert.equal((await dispatchReviewRequests(C,{env,fetcher:provider(calls),now:NOW})).accepted,1);
  await dispatchReviewRequests(C,{env,fetcher:provider(calls),now:NOW+DAY});assert.equal(calls.length,1,'monthly cap still applies on next day');
 }finally{f.close();}
});
test('unknown provider outcomes and interrupted requests are never automatically retried',async()=>{
 const f=fixture(),{C}=f;try{
  await verified(C);consent(C);enqueueReviewRequests(C,NOW);let attempts=0;
  const broken=async()=>{attempts++;throw Error('Timeout after provider may have accepted');};
  await dispatchReviewRequests(C,{env,fetcher:broken,now:NOW});assert.equal(attempts,2);
  await dispatchReviewRequests(C,{env,fetcher:broken,now:NOW+DAY});assert.equal(attempts,2);
  assert.equal(C.db.prepare("SELECT COUNT(*) n FROM review_request_outbox WHERE status='unknown'").get().n,2);
  assert.equal(enqueueReviewRequests(C,NOW+6*DAY).added,0);
  C.db.prepare("UPDATE review_request_outbox SET status='sending'").run();initializeReviewAutomation(C);
  assert.equal(C.db.prepare("SELECT COUNT(*) n FROM review_request_outbox WHERE status='unknown'").get().n,2);
 }finally{f.close();}
});
test('invitation links expose no contact data; viewing does not stop reminders; explicit stop cancels both channels',()=>{
 const f=fixture(),{C}=f;try{
  consent(C);enqueueReviewRequests(C,NOW);const event=C.db.prepare('SELECT * FROM review_request_events').get();
  const data=reviewRequestDetails(C,event.token).public;
  for(const secret of ['alice@example.test','9876543210','PRIVATE-INVOICE','PrivateSurname','user_id'])assert.ok(!JSON.stringify(data).includes(secret));
  assert.equal(C.db.prepare('SELECT stopped FROM review_request_events').get().stopped,null);
  assert.throws(()=>stopReviewRequests(C,'forged','stop',NOW),{status:404});
  stopReviewRequests(C,event.token,'done',NOW);assert.equal(C.db.prepare("SELECT COUNT(*) n FROM review_request_outbox WHERE status='queued'").get().n,0);
  assert.equal(C.db.prepare('SELECT whatsapp FROM review_request_consent').get().whatsapp,1,'dismiss does not withdraw all future consent');
  stopReviewRequests(C,event.token,'stop',NOW);const p=C.db.prepare('SELECT whatsapp,sms FROM review_request_consent').get();assert.equal(p.whatsapp,0);assert.equal(p.sms,0);
 }finally{f.close();}
});
test('signed Meta receipts are matched to sender and recipient; read status never regresses and STOP suppresses requests',async()=>{
 const f=fixture(),{C}=f,calls=[];try{
  await verified(C);consent(C);enqueueReviewRequests(C,NOW);await dispatchReviewRequests(C,{env,fetcher:provider(calls),now:NOW});
  const q=C.db.prepare("SELECT * FROM review_request_outbox WHERE channel='whatsapp'").get();
  const payload=status=>JSON.stringify({object:'whatsapp_business_account',entry:[{changes:[{value:{metadata:{phone_number_id:'12345'},statuses:[{id:q.provider_id,recipient_id:q.phone,status}]}}]}]});
  assert.throws(()=>receiveReviewWhatsapp(C,payload('read'),'sha256=bad',env),{status:403});
  for(const status of ['read','sent']){const raw=payload(status),sig='sha256='+createHmac('sha256',env.WHATSAPP_APP_SECRET).update(raw).digest('hex');receiveReviewWhatsapp(C,raw,sig,env);}
  assert.equal(C.db.prepare('SELECT status FROM review_request_outbox WHERE id=?').get(q.id).status,'read');
  const raw=JSON.stringify({object:'whatsapp_business_account',entry:[{changes:[{value:{metadata:{phone_number_id:'12345'},messages:[{from:q.phone,text:{body:'STOP'}}]}}]}]});
  receiveReviewWhatsapp(C,raw,'sha256='+createHmac('sha256',env.WHATSAPP_APP_SECRET).update(raw).digest('hex'),env);
  assert.equal(C.db.prepare('SELECT whatsapp FROM review_request_consent').get().whatsapp,0);
 }finally{f.close();}
});

test('an old invitation cannot withdraw a subsequently changed delivery contact',()=>{
 const f=fixture(),{C}=f;try{
  consent(C);enqueueReviewRequests(C,NOW);const e=C.db.prepare('SELECT * FROM review_request_events').get();
  saveReviewConsent(C,'owner',{email:'alice@example.test',phone:'9876543211',whatsapp:true,sms:true,explicitConsent:true,evidence:'New delivery phone confirmed with customer'},NOW);
  stopReviewRequests(C,e.token,'stop',NOW);
  const current=C.db.prepare('SELECT * FROM review_request_consent').get();assert.equal(current.phone,'919876543211');assert.equal(current.whatsapp,1);assert.equal(current.sms,1);
 }finally{f.close();}
});
