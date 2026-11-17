import {randomBytes,createHash} from 'node:crypto';
import {clean,email,integer,fail} from './commerce.mjs';
import {signatureMatches} from './lib.mjs';
import {PRODUCT_PAGE_IDS} from './product-seo.mjs';

const DAY=86400000,ORIGIN='https://maxvolumenutriton.shop';
export const REVIEW_SENDER='917708830513';
export const REVIEW_TEMPLATES={
 request:'Hi {{1}}, thank you for choosing Max Volume Nutrition. Please share your honest experience with {{2}}: {{3}}. All ratings are welcome. Reviews are optional. Stop review requests: {{4}}.',
 reminder:'Hi {{1}}, a reminder from Max Volume Nutrition about your {{2}} experience: {{3}}. Positive and critical feedback are welcome. Reviews are optional. Stop review requests: {{4}}.'
};
const token=()=>randomBytes(24).toString('base64url');
const digest=value=>createHash('sha256').update(value).digest('hex');
const nowIso=n=>new Date(n).toISOString();
const config=C=>C.setting('reviewAutomationV1')||{enabled:false,dailyMax:20,monthlyMax:200,startedAt:null};
const phone=value=>{const p=String(value||'').replace(/[\s()+.-]/g,'');const n=p.length===10?'91'+p:p;if(!/^91[6-9]\d{9}$/.test(n))fail(400,'Enter the customer\'s Indian mobile number.');return n;};
function periods(now){const parts=Object.fromEntries(new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Kolkata',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',hourCycle:'h23'}).formatToParts(now).map(x=>[x.type,x.value]));return {day:parts.year+'-'+parts.month+'-'+parts.day,month:parts.year+'-'+parts.month,hour:Number(parts.hour)};}
export function initializeReviewAutomation(C){
 C.db.exec(`CREATE TABLE IF NOT EXISTS review_request_consent(
 user_id TEXT PRIMARY KEY REFERENCES users(id),phone TEXT NOT NULL,whatsapp INTEGER NOT NULL,sms INTEGER NOT NULL,
 version TEXT NOT NULL,evidence TEXT NOT NULL,actor TEXT NOT NULL,updated TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS review_request_events(
 id TEXT PRIMARY KEY,source_kind TEXT NOT NULL,source_id TEXT NOT NULL,user_id TEXT NOT NULL REFERENCES users(id),
 product_id TEXT NOT NULL,delivered TEXT NOT NULL,created TEXT NOT NULL,token TEXT UNIQUE NOT NULL,stopped TEXT,
 UNIQUE(source_kind,source_id,product_id));
 CREATE TABLE IF NOT EXISTS review_request_outbox(
 id TEXT PRIMARY KEY,event_id TEXT NOT NULL REFERENCES review_request_events(id),channel TEXT NOT NULL,
 stage TEXT NOT NULL,consent_version TEXT NOT NULL,phone TEXT NOT NULL,due TEXT NOT NULL,status TEXT NOT NULL DEFAULT 'queued',
 created TEXT NOT NULL,attempted TEXT,accepted TEXT,provider_id TEXT,error TEXT,day_key TEXT,month_key TEXT,
 UNIQUE(event_id,channel,stage));
 CREATE INDEX IF NOT EXISTS review_request_due ON review_request_outbox(status,due);
 CREATE INDEX IF NOT EXISTS review_request_user ON review_request_events(user_id,created);`);
 if(C.setting('reviewAutomationV1')===null)C.set('reviewAutomationV1',config(C));
 // An interrupted provider call may have been billed/accepted. Never automatically retry it.
 C.db.prepare("UPDATE review_request_outbox SET status='unknown',error='Interrupted send; reconcile with provider' WHERE status='sending'").run();
}
function waFingerprint(env){return digest(['WHATSAPP_ACCESS_TOKEN','WHATSAPP_PHONE_NUMBER_ID','WHATSAPP_GRAPH_VERSION','WHATSAPP_BUSINESS_ACCOUNT_ID','REVIEW_WHATSAPP_REQUEST_TEMPLATE','REVIEW_WHATSAPP_REMINDER_TEMPLATE','WHATSAPP_TEMPLATE_LANGUAGE'].map(k=>env[k]||'').join('|'));}
export function reviewAutomationReadiness(C,env=process.env,now=Date.now()){
 const common=[];
 if(env.NODE_ENV!=='production'||env.STAGING_MODE!=='false')common.push('Live messaging is blocked in previews and tests.');
 if(env.REVIEW_AUTOMATION_ENABLED!=='true')common.push('Set REVIEW_AUTOMATION_ENABLED after provider setup.');
 if(env.REVIEW_MESSAGE_SPEND_APPROVED!=='true')common.push('Provider messaging charges and budget need owner approval.');
 if(!C.setting('customerReviewsV1')?.googleReviewUrl)common.push('Save the confirmed Kelambakkam Google review link.');
 const wa=[];for(const key of ['WHATSAPP_ACCESS_TOKEN','WHATSAPP_PHONE_NUMBER_ID','WHATSAPP_GRAPH_VERSION','WHATSAPP_BUSINESS_ACCOUNT_ID','REVIEW_WHATSAPP_REQUEST_TEMPLATE','REVIEW_WHATSAPP_REMINDER_TEMPLATE','WHATSAPP_TEMPLATE_LANGUAGE','WHATSAPP_APP_SECRET','REVIEW_WHATSAPP_VERIFY_TOKEN'])if(!env[key])wa.push('Missing '+key+'.');
 const proof=C.setting('reviewWhatsappVerificationV1');
 if(!proof||proof.fingerprint!==waFingerprint(env)||now-Date.parse(proof.checkedAt)>DAY)wa.push('Verify the existing WhatsApp sender and both approved review templates.');
 const sms=[];for(const key of ['MSG91_AUTH_KEY','REVIEW_SMS_TEMPLATE_ID','REVIEW_SMS_SENDER_ID','REVIEW_SMS_DLT_ENTITY_ID','REVIEW_SMS_DLT_TEMPLATE_ID'])if(!env[key])sms.push('Missing '+key+'.');
 if(env.REVIEW_SMS_SENDER_ID&&!/^[A-Z]{6}$/.test(env.REVIEW_SMS_SENDER_ID))sms.push('Configure the approved six-letter SMS sender ID.');
 if(env.REVIEW_SMS_DLT_ENTITY_ID&&!/^\d{10,30}$/.test(env.REVIEW_SMS_DLT_ENTITY_ID))sms.push('Configure the registered SMS DLT entity ID.');
 if(env.REVIEW_SMS_DLT_TEMPLATE_ID&&!/^\d{10,30}$/.test(env.REVIEW_SMS_DLT_TEMPLATE_ID))sms.push('Configure the approved SMS DLT template ID.');
 if(env.REVIEW_SMS_DLT_APPROVED!=='true')sms.push('Confirm the SMS sender, content template and links are approved with MSG91/DLT.');
 const channels={whatsapp:{ready:!common.length&&!wa.length,reasons:[...common,...wa]},sms:{ready:!common.length&&!sms.length,reasons:[...common,...sms]}};
 return {ready:channels.whatsapp.ready&&channels.sms.ready,sender:'+91 77088 30513',smsProvider:'MSG91',channels};
}
export function saveReviewAutomation(C,actor,b,env=process.env,now=Date.now()){
 if(typeof b.enabled!=='boolean')fail(400,'Choose whether review requests are enabled.');
 const current=config(C),next={...current,enabled:b.enabled,dailyMax:integer(b.dailyMax,1,100),monthlyMax:integer(b.monthlyMax,1,1000)};
 if(next.enabled&&!reviewAutomationReadiness(C,env,now).ready)fail(409,'Complete the provider, Google link and messaging budget checks before activation.');
 if(next.enabled&&!next.startedAt)next.startedAt=nowIso(now);
 C.tx(()=>{C.set('reviewAutomationV1',next);if(!next.enabled)C.db.prepare("UPDATE review_request_outbox SET status='cancelled',error='Automation paused by owner' WHERE status='queued'").run();C.audit(actor,'reviews.automation_settings','reviewAutomationV1',{enabled:next.enabled,dailyMax:next.dailyMax,monthlyMax:next.monthlyMax});});return next;
}
export async function verifyReviewWhatsapp(C,env=process.env,fetcher=fetch,now=Date.now()){
 if(!env.WHATSAPP_ACCESS_TOKEN||!/^\d+$/.test(env.WHATSAPP_PHONE_NUMBER_ID||'')||!/^\d+$/.test(env.WHATSAPP_BUSINESS_ACCOUNT_ID||'')||!/^v\d+\.\d+$/.test(env.WHATSAPP_GRAPH_VERSION||''))fail(409,'Connect Meta credentials, Phone Number ID, Business Account ID and Graph version first.');
 const base='https://graph.facebook.com/'+env.WHATSAPP_GRAPH_VERSION+'/',headers={Authorization:'Bearer '+env.WHATSAPP_ACCESS_TOKEN};
 async function read(path){const r=await fetcher(base+path,{headers,signal:AbortSignal.timeout(15000)});if(!r.ok)fail(409,'Meta connection check failed (HTTP '+r.status+'). Check permissions and sender connection.');return r.json();}
 const numbers=await read(env.WHATSAPP_BUSINESS_ACCOUNT_ID+'/phone_numbers?fields=id,display_phone_number&limit=100');
 const match=numbers.data?.find(p=>p.id===env.WHATSAPP_PHONE_NUMBER_ID&&String(p.display_phone_number).replace(/\D/g,'')===REVIEW_SENDER);
 if(!match)fail(409,'The connected Meta account must contain the existing +91 77088 30513 sender.');
 for(const [stage,key] of [['request','REVIEW_WHATSAPP_REQUEST_TEMPLATE'],['reminder','REVIEW_WHATSAPP_REMINDER_TEMPLATE']]){
  if(!/^[a-z0-9_]{1,100}$/.test(env[key]||''))fail(409,'Configure both dedicated review template names.');
  const list=await read(env.WHATSAPP_BUSINESS_ACCOUNT_ID+'/message_templates?name='+encodeURIComponent(env[key])+'&limit=100');
  const t=list.data?.find(t=>t.name===env[key]&&t.language===env.WHATSAPP_TEMPLATE_LANGUAGE&&t.status==='APPROVED');
  if(!t||t.components?.length!==1||t.components[0].type!=='BODY'||t.components[0].text!==REVIEW_TEMPLATES[stage])fail(409,'Meta must approve the exact '+stage+' review template shown in the setup guide.');
 }
 C.set('reviewWhatsappVerificationV1',{fingerprint:waFingerprint(env),checkedAt:nowIso(now)});
 return {ok:true,sender:'+91 77088 30513',checkedAt:nowIso(now)};
}
export function saveReviewConsent(C,actor,b,now=Date.now()){
 const person=C.db.prepare('SELECT id FROM users WHERE email=? AND role<>?').get(email(b.email),'admin');if(!person)fail(400,'Choose a registered customer.');
 const p=phone(b.phone);if(typeof b.whatsapp!=='boolean'||typeof b.sms!=='boolean')fail(400,'Choose consent separately for WhatsApp and SMS.');
 if(b.whatsapp||b.sms){
  if(b.explicitConsent!==true)fail(400,'Confirm the customer explicitly agreed to the selected review channels.');
  clean(b.evidence,500);
  const completed=C.db.prepare('SELECT 1 FROM review_purchases WHERE user_id=? AND revoked IS NULL LIMIT 1').get(person.id)||C.db.prepare("SELECT 1 FROM orders WHERE user_id=? AND status='paid' AND fulfilment='delivered' LIMIT 1").get(person.id);
  if(!completed)fail(409,'Confirm a completed purchase before recording review-request consent.');
 }
 C.tx(()=>{C.db.prepare('INSERT INTO review_request_consent VALUES(?,?,?,?,?,?,?,?) ON CONFLICT(user_id) DO UPDATE SET phone=excluded.phone,whatsapp=excluded.whatsapp,sms=excluded.sms,version=excluded.version,evidence=excluded.evidence,actor=excluded.actor,updated=excluded.updated').run(person.id,p,+b.whatsapp,+b.sms,token(),b.whatsapp||b.sms?b.evidence.trim():'Consent withdrawn',actor,nowIso(now));
 C.db.prepare("UPDATE review_request_outbox SET status='cancelled',error='Review consent changed' WHERE status='queued' AND event_id IN (SELECT id FROM review_request_events WHERE user_id=?)").run(person.id);C.audit(actor,'reviews.consent',person.id,{whatsapp:b.whatsapp,sms:b.sms});});return {ok:true};
}
export function captureReviewDelivery(C,kind,sourceId,now=Date.now()){
 let userId,productIds,delivered;
 if(kind==='offline'){
  const p=C.db.prepare('SELECT * FROM review_purchases WHERE id=? AND revoked IS NULL').get(sourceId);if(!p)return;
  userId=p.user_id;productIds=[p.product_id];delivered=Date.parse(p.delivered+'T12:00:00+05:30');
 }else if(kind==='order'){
  const o=C.db.prepare("SELECT * FROM orders WHERE id=? AND status='paid' AND fulfilment='delivered'").get(sourceId);if(!o?.user_id)return;
  userId=o.user_id;const variants=new Set(JSON.parse(o.payload).lines.map(l=>l.variantId));
  productIds=C.catalogue(null).filter(p=>p.variants.some(v=>variants.has(v.id))).map(p=>p.id);delivered=now;
 }else fail(400,'Invalid completed purchase source.');
 for(const productId of productIds)C.db.prepare('INSERT OR IGNORE INTO review_request_events(id,source_kind,source_id,user_id,product_id,delivered,created,token) VALUES(?,?,?,?,?,?,?,?)').run(digest(kind+'|'+sourceId+'|'+productId),kind,sourceId,userId,productId,nowIso(delivered),nowIso(now),token());
}
function sourceValid(C,e){return e.source_kind==='offline'?!!C.db.prepare('SELECT 1 FROM review_purchases WHERE id=? AND user_id=? AND product_id=? AND revoked IS NULL').get(e.source_id,e.user_id,e.product_id):!!C.db.prepare("SELECT 1 FROM orders WHERE id=? AND user_id=? AND status='paid' AND fulfilment='delivered'").get(e.source_id,e.user_id);}
function submitted(C,e){return !!C.db.prepare('SELECT 1 FROM product_reviews WHERE user_id=? AND product_id=?').get(e.user_id,e.product_id);}
export function enqueueReviewRequests(C,now=Date.now()){
 const cfg=config(C);if(!cfg.enabled||!cfg.startedAt)return {added:0};let added=0;
 for(const e of C.db.prepare('SELECT * FROM review_request_events WHERE stopped IS NULL AND created>=? AND delivered<=? AND delivered>=? ORDER BY created,id').all(cfg.startedAt,nowIso(now-3*DAY),nowIso(now-30*DAY))){
  const consent=C.db.prepare('SELECT * FROM review_request_consent WHERE user_id=?').get(e.user_id);
  if(!consent||!sourceValid(C,e)||submitted(C,e))continue;
  for(const channel of ['whatsapp','sms']){
   if(!consent[channel])continue;
   const initial=C.db.prepare("SELECT * FROM review_request_outbox WHERE event_id=? AND channel=? AND stage='request'").get(e.id,channel);
   const stage=initial?'reminder':'request';
   if(initial&&(!['accepted','sent','delivered','read'].includes(initial.status)||now-Date.parse(initial.accepted)<5*DAY))continue;
   // One request cycle per customer/product/30 days, even across separate receipts.
   const prior=C.db.prepare('SELECT 1 FROM review_request_outbox q JOIN review_request_events e ON e.id=q.event_id WHERE e.user_id=? AND e.product_id=? AND e.id<>? AND q.channel=? AND q.created>=? LIMIT 1').get(e.user_id,e.product_id,e.id,channel,nowIso(now-30*DAY));
   if(prior)continue;
   added+=C.db.prepare('INSERT OR IGNORE INTO review_request_outbox(id,event_id,channel,stage,consent_version,phone,due,created) VALUES(?,?,?,?,?,?,?,?)').run(digest(e.id+'|'+channel+'|'+stage),e.id,channel,stage,consent.version,consent.phone,nowIso(now),nowIso(now)).changes;
  }
 }return {added};
}
export async function dispatchReviewRequests(C,{env=process.env,fetcher=fetch,now=Date.now(),max=20}={}){
 const cfg=config(C),p=periods(now),readiness=reviewAutomationReadiness(C,env,now);let accepted=0;
 if(!cfg.enabled||p.hour<9||p.hour>=20)return {accepted};
 for(const q of C.db.prepare("SELECT * FROM review_request_outbox WHERE status='queued' AND due<=? ORDER BY due,id LIMIT ?").all(nowIso(now),max)){
  if(!config(C).enabled)break;
  const e=C.db.prepare('SELECT * FROM review_request_events WHERE id=?').get(q.event_id),c=C.db.prepare('SELECT * FROM review_request_consent WHERE user_id=?').get(e.user_id);
  if(!c||!c[q.channel]||c.version!==q.consent_version||c.phone!==q.phone||e.stopped||!sourceValid(C,e)||submitted(C,e)||now-Date.parse(e.delivered)>30*DAY){C.db.prepare("UPDATE review_request_outbox SET status='cancelled',error='Consent, purchase or review changed' WHERE id=?").run(q.id);continue;}
  if(q.stage==='reminder'){
   const first=C.db.prepare("SELECT status,accepted FROM review_request_outbox WHERE event_id=? AND channel=? AND stage='request'").get(e.id,q.channel);
   if(!first||!['accepted','sent','delivered','read'].includes(first.status)){C.db.prepare("UPDATE review_request_outbox SET status='cancelled',error='Initial request no longer eligible for a reminder' WHERE id=?").run(q.id);continue;}
   if(now-Date.parse(first.accepted)<5*DAY)continue;
  }
  if(!readiness.channels[q.channel].ready)continue;
  const previous=C.db.prepare("SELECT MAX(attempted) last FROM review_request_outbox WHERE phone=? AND channel=? AND attempted IS NOT NULL").get(q.phone,q.channel).last;
  if(previous&&now-Date.parse(previous)<DAY)continue;
  const claimed=C.tx(()=>{
   const day=C.db.prepare('SELECT COUNT(*) n FROM review_request_outbox WHERE day_key=?').get(p.day).n,month=C.db.prepare('SELECT COUNT(*) n FROM review_request_outbox WHERE month_key=?').get(p.month).n;
   if(day>=cfg.dailyMax||month>=cfg.monthlyMax)return false;
   return C.db.prepare("UPDATE review_request_outbox SET status='sending',attempted=?,day_key=?,month_key=? WHERE id=? AND status='queued'").run(nowIso(now),p.day,p.month,q.id).changes===1;
  });if(!claimed)continue;
  const link=ORIGIN+'/review-request.html?t='+e.token;
  const person=C.db.prepare('SELECT name FROM users WHERE id=?').get(e.user_id),product=C.catalogue(null).find(p=>p.id===e.product_id);
  const name=(person?.name||'Customer').trim().split(/\s+/)[0].slice(0,40),productName=(product?.name||'your product').slice(0,100);
  try{
   let url,headers,body;
   if(q.channel==='whatsapp'){
    url='https://graph.facebook.com/'+env.WHATSAPP_GRAPH_VERSION+'/'+env.WHATSAPP_PHONE_NUMBER_ID+'/messages';headers={Authorization:'Bearer '+env.WHATSAPP_ACCESS_TOKEN};
    body={messaging_product:'whatsapp',to:q.phone,type:'template',template:{name:q.stage==='request'?env.REVIEW_WHATSAPP_REQUEST_TEMPLATE:env.REVIEW_WHATSAPP_REMINDER_TEMPLATE,language:{code:env.WHATSAPP_TEMPLATE_LANGUAGE},components:[{type:'body',parameters:[name,productName,link,link].map(text=>({type:'text',text}))}]}};
   }else{
    url='https://control.msg91.com/api/v5/flow';headers={authkey:env.MSG91_AUTH_KEY};
    body={template_id:env.REVIEW_SMS_TEMPLATE_ID,short_url:'0',recipients:[{mobiles:q.phone,review_url:link,stop_url:link}]};
   }
   const r=await fetcher(url,{method:'POST',headers:{...headers,'Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(15000)}),data=await r.json();
   const id=q.channel==='whatsapp'?data.messages?.[0]?.id:data.type==='success'?data.message:null;
   if(!r.ok){C.db.prepare('UPDATE review_request_outbox SET status=?,error=? WHERE id=?').run(r.status>=500||r.status===429?'unknown':'failed','Provider HTTP '+r.status,q.id);continue;}
   if(typeof id!=='string'||!id||id.length>300){C.db.prepare("UPDATE review_request_outbox SET status='unknown',error='Provider acceptance unconfirmed' WHERE id=?").run(q.id);continue;}
   C.db.prepare("UPDATE review_request_outbox SET status='accepted',accepted=?,provider_id=?,error=NULL WHERE id=?").run(nowIso(now),id,q.id);accepted++;
  }catch{C.db.prepare("UPDATE review_request_outbox SET status='unknown',error='Outcome unknown; do not retry without provider reconciliation' WHERE id=?").run(q.id);}
 }return {accepted};
}
export function reviewRequestDetails(C,t){
 if(typeof t!=='string'||!/^[A-Za-z0-9_-]{32}$/.test(t))fail(404,'Review request not found.');
 const e=C.db.prepare('SELECT * FROM review_request_events WHERE token=?').get(t);if(!e)fail(404,'Review request not found.');
 const product=C.catalogue(null).find(p=>p.id===e.product_id),path=Object.entries(PRODUCT_PAGE_IDS).find(([,p])=>p.id===e.product_id)?.[0]||'/reviews.html';
 return {event:e,public:{product:product?.name||'Your product',productUrl:path+'#mvnProductReviews',googleReviewUrl:C.setting('customerReviewsV1')?.googleReviewUrl||'',stopped:!!e.stopped}};
}
export function stopReviewRequests(C,t,action,now=Date.now()){
 const {event:e}=reviewRequestDetails(C,t);const invitedPhone=C.db.prepare('SELECT phone FROM review_request_outbox WHERE event_id=? ORDER BY created,id LIMIT 1').get(e.id)?.phone||C.db.prepare('SELECT phone FROM review_request_consent WHERE user_id=?').get(e.user_id)?.phone;
 if(!['done','stop'].includes(action))fail(400,'Choose reviewed or stop requests.');
 C.tx(()=>{C.db.prepare('UPDATE review_request_events SET stopped=? WHERE id=?').run(nowIso(now),e.id);
 if(action==='stop'){
  C.db.prepare('UPDATE review_request_consent SET whatsapp=0,sms=0,version=?,updated=? WHERE phone=?').run(token(),nowIso(now),invitedPhone||'');
  C.db.prepare("UPDATE review_request_outbox SET status='cancelled',error='Customer opted out' WHERE status='queued' AND phone=?").run(invitedPhone||'');
 }
 C.db.prepare("UPDATE review_request_outbox SET status='cancelled',error='Customer completed or stopped request' WHERE event_id=? AND status='queued'").run(e.id);C.audit('customer','reviews.'+action,e.id);});return {ok:true};
}
export function receiveReviewWhatsapp(C,raw,signature,env=process.env){
 if(!signatureMatches(raw,String(signature||'').replace(/^sha256=/,''),env.WHATSAPP_APP_SECRET))fail(403,'Invalid Meta webhook signature.');
 const b=JSON.parse(raw);if(b.object!=='whatsapp_business_account')fail(400,'Invalid WhatsApp webhook.');
 for(const entry of b.entry||[])for(const change of entry.changes||[]){
  const v=change.value;if(v?.metadata?.phone_number_id!==env.WHATSAPP_PHONE_NUMBER_ID)continue;
  for(const s of v.statuses||[]){
   const q=C.db.prepare("SELECT * FROM review_request_outbox WHERE provider_id=? AND channel='whatsapp'").get(String(s.id));if(!q||s.recipient_id!==q.phone)continue;
   const rank={accepted:0,sent:1,delivered:2,read:3};
   if(s.status==='failed'&&!(rank[q.status]>=2))C.db.prepare("UPDATE review_request_outbox SET status='failed',error='Provider delivery failure' WHERE id=?").run(q.id);
   else if(rank[s.status]!==undefined&&rank[s.status]>=(rank[q.status]??-1))C.db.prepare('UPDATE review_request_outbox SET status=?,error=NULL WHERE id=?').run(s.status,q.id);
  }
  for(const m of v.messages||[]){
   if(!['STOP','UNSUBSCRIBE','CANCEL'].includes(String(m.text?.body||m.button?.text||'').trim().toUpperCase()))continue;
   const p=String(m.from||'');if(!/^91[6-9]\d{9}$/.test(p))continue;
   C.db.prepare('UPDATE review_request_consent SET whatsapp=0,updated=? WHERE phone=?').run(nowIso(Date.now()),p);
   C.db.prepare("UPDATE review_request_outbox SET status='cancelled',error='WhatsApp STOP received' WHERE status='queued' AND phone=? AND channel='whatsapp'").run(p);
  }
 }return {received:true};
}
export function reviewAutomationAdmin(C,env=process.env){return {config:config(C),readiness:reviewAutomationReadiness(C,env),templates:REVIEW_TEMPLATES,
 counts:C.db.prepare('SELECT channel,stage,status,COUNT(*) count FROM review_request_outbox GROUP BY channel,stage,status').all(),
 consentCount:C.db.prepare('SELECT COUNT(*) n FROM review_request_consent WHERE whatsapp=1 OR sms=1').get().n,
 recent:C.db.prepare('SELECT channel,stage,status,created,attempted,accepted,provider_id,error FROM review_request_outbox ORDER BY created DESC LIMIT 100').all()};}
export function startReviewRequestScheduler(C,env=process.env){
 let busy=false;const tick=async()=>{if(busy||!config(C).enabled)return;busy=true;try{
  const proof=C.setting('reviewWhatsappVerificationV1');if(env.REVIEW_AUTOMATION_ENABLED==='true'&&env.WHATSAPP_ACCESS_TOKEN&&(!proof||Date.now()-Date.parse(proof.checkedAt)>20*60*60000))try{await verifyReviewWhatsapp(C,env);}catch{C.set('reviewWhatsappVerificationV1',null);}
  enqueueReviewRequests(C);await dispatchReviewRequests(C,{env});
 }catch{console.error('Review request scheduler needs owner review.');}finally{busy=false}};
 const interval=setInterval(()=>void tick(),300000);interval.unref();return ()=>clearInterval(interval);
}
