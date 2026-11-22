import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {randomUUID} from 'node:crypto';
import {openCommerce} from '../commerce.mjs';
import {initializeLeadInbox,saveLead,listLeads,updateLead,saveTradeOrder,listTradeOrders,trackLeadOrder} from '../lead-inbox.mjs';

async function withDatabase(fn){
 const dir=mkdtempSync(join(tmpdir(),'mvn-lead-'));let C;
 try{C=openCommerce(dir);initializeLeadInbox(C);return await fn(C);}
 finally{C?.db.close();rmSync(dir,{recursive:true,force:true});}
}
test('wholesale enquiry is stored once, private, and follows a manual state workflow',()=>withDatabase(C=>{
 const request={requestKey:randomUUID(),kind:'wholesale',name:'Gym Owner',phone:'9876543210',region:'Puducherry',city:'Karaikal',business:'Example Fitness',businessType:'Gym / fitness studio',gstin:'',requirements:'Potency Whey 5 lb, 4 packs',acknowledgeStorage:true};
 const first=saveLead(C,request);
 assert.match(first.id,/^MVN-LEAD-/);
 assert.equal(first.recorded,true);
 assert.equal(saveLead(C,request).id,first.id);
 assert.equal(listLeads(C).total,1);
 assert.equal(listLeads(C).new,1);
 assert.equal(listLeads(C).rows[0].detail.marketingOptIn,false);
 assert.throws(()=>saveLead(C,{...request,requirements:'changed but same key'}),{status:409});
 assert.throws(()=>saveLead(C,{...request,requestKey:randomUUID(),acknowledgeStorage:false}),{status:400});
 assert.throws(()=>saveLead(C,{...request,requestKey:randomUUID(),phone:'wrong'}),{status:400});
 assert.throws(()=>saveLead(C,{...request,requestKey:randomUUID(),region:'Other'}),{status:400});
 updateLead(C,{id:'owner'}, {id:first.id,status:'quoted',ownerNote:'Follow up on trade terms',followUpAt:'2026-11-07T10:00:00+05:30'});
 const refreshed=listLeads(C);
 assert.equal(refreshed.new,0);
 assert.equal(refreshed.rows[0].status,'quoted');
 assert.equal(refreshed.rows[0].ownerNote,'Follow up on trade terms');
 assert.equal(refreshed.rows[0].followUpAt,'2026-11-07T04:30:00.000Z');
 assert.throws(()=>updateLead(C,{id:'owner'},{id:first.id,status:'published',ownerNote:'',followUpAt:null}),{status:400});
}));
test('retail order enquiry snapshots verified product variants without capturing payment',()=>withDatabase(C=>{
 const product=C.catalogue(null)[0],variant=product.variants.find(v=>Number.isSafeInteger(v.pricePaise));
 assert.ok(variant,'expected a seeded retail variant');
 const saved=saveLead(C,{requestKey:randomUUID(),kind:'retail',name:'Retail Customer',phone:'9876543210',address:'Market Road',city:'Kelambakkam',state:'Tamil Nadu',pincode:'603103',paymentPreference:'Confirm payment on WhatsApp',items:[{variantId:variant.id,quantity:2}],acknowledgeStorage:true});
 assert.equal(saved.recorded,true);
 const row=listLeads(C).rows[0];
 assert.equal(row.detail.lines[0].variantId,variant.id);
 assert.equal(row.detail.totalBeforeOffersPaise,2*variant.pricePaise);
 assert.equal(row.detail.marketingOptIn,false);
 assert.equal(row.status,'new');
 assert.throws(()=>saveLead(C,{requestKey:randomUUID(),kind:'retail',name:'Retail Customer',phone:'9876543210',address:'Market Road',city:'Kelambakkam',state:'Tamil Nadu',pincode:'603103',items:[{variantId:'not-a-real-product',quantity:1}],acknowledgeStorage:true}),{status:409});
}));
test('only approved dealers can save and view their own trade orders, and private tracking reflects owner updates',()=>withDatabase(C=>{
 const dealer={id:'buyer',name:'Trade Buyer'},other={id:'other',name:'Other Buyer'};
 for(const user of [dealer,other]){
  C.db.prepare('INSERT INTO users VALUES(?,?,?,?,?,?)').run(user.id,user.id+'@example.com',user.name,'unused','customer',new Date().toISOString());
  C.db.prepare("INSERT INTO dealers VALUES(?,?,?,?,'pending',NULL,?)").run(user.id,'gym',user.name,'',new Date().toISOString());
  C.db.prepare('INSERT INTO dealer_profiles(user_id,phone,city,address,pincode,notes,updated) VALUES(?,?,?,?,?,?,?)')
   .run(user.id,'919876543210','Chennai','Example address','603103','',new Date().toISOString());
 }
 assert.throws(()=>listTradeOrders(C,dealer),{status:403});
 C.db.prepare("UPDATE dealers SET status='approved'").run();
 const variant=C.catalogue(dealer).flatMap(p=>p.variants).find(v=>Number.isSafeInteger(v.pricePaise)&&v.stock!==0);
 assert.ok(variant);
 const request={requestKey:randomUUID(),items:[{variantId:variant.id,quantity:1,pricePaise:1}]};
 const saved=saveTradeOrder(C,dealer,request);
 const link={id:saved.id,token:saved.trackingToken};
 assert.equal(saved.detail.totalBeforeOffersPaise,variant.pricePaise);
 assert.equal(saveTradeOrder(C,dealer,request).id,saved.id);
 assert.throws(()=>saveTradeOrder(C,other,request),{status:409});
 assert.equal(listTradeOrders(C,other).length,0);
 assert.throws(()=>trackLeadOrder(C,{...link,token:'0'.repeat(64)}),{status:404});
 assert.deepEqual(trackLeadOrder(C,link),{id:saved.id,status:'received',created:saved.created});
 updateLead(C,{id:'owner'},{id:saved.id,status:'converted',orderStatus:'dispatched',ownerNote:'Private'});
 assert.equal(trackLeadOrder(C,link).status,'dispatched');
 assert.equal(listTradeOrders(C,dealer)[0].status,'dispatched');
 assert.equal(listTradeOrders(C,dealer)[0].ownerNote,undefined);
}));

test('WhatsApp order updates are opt-in, skip stale milestones, and only submit each milestone once',async()=>{
 const {dispatchOrderMessages}=await import('../order-status-messages.mjs');
 await withDatabase(async C=>{
  const env={NODE_ENV:'production',ORDER_STATUS_WHATSAPP_ENABLED:'true',WHATSAPP_ACCESS_TOKEN:'test',WHATSAPP_PHONE_NUMBER_ID:'123',WHATSAPP_GRAPH_VERSION:'v99.0',ORDER_STATUS_WHATSAPP_TEMPLATE:'order_status',ORDER_STATUS_WHATSAPP_LANGUAGE:'en'};
  const variant=C.catalogue(null)[0].variants.find(v=>Number.isSafeInteger(v.pricePaise));
  const request={kind:'retail',name:'Test',phone:'9876543210',address:'Test Road',city:'Chennai',state:'Tamil Nadu',pincode:'600001',acknowledgeStorage:true,items:[{variantId:variant.id,quantity:1}]};
  const optedIn=saveLead(C,{...request,requestKey:randomUUID(),orderWhatsappOptIn:true});
  const noConsent=saveLead(C,{...request,requestKey:randomUUID()});
  const owner={id:'owner'};
  for(const order of [optedIn,noConsent])updateLead(C,owner,{id:order.id,status:'converted',orderStatus:'confirmed'},env);
  updateLead(C,owner,{id:optedIn.id,status:'converted',orderStatus:'dispatched'},env);
  const messages=[];
  const send=async (_url, options)=>{
   messages.push(JSON.parse(options.body));
   return new Response(JSON.stringify({messages:[{id:'mock-id'}]}));
  };
  await dispatchOrderMessages(C,env,send);
  await dispatchOrderMessages(C,env,send);
  assert.equal(messages.length,1);
  assert.equal(messages[0].template.components[0].parameters[1].text,'Dispatched');
  assert.equal(messages[0].template.components[1].parameters[0].text,optedIn.id+'.'+optedIn.trackingToken);
  assert.deepEqual(C.db.prepare('SELECT status FROM order_status_messages ORDER BY milestone').all().map(row=>row.status),['skipped','accepted']);
 });
});
