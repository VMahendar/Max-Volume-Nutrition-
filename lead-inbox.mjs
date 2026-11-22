import {randomUUID,randomBytes,timingSafeEqual} from 'node:crypto';
import {clean,fail,hash,integer} from './commerce.mjs';

const statuses=new Set(['new','contacted','quoted','converted','closed']);
const orderStatuses = ['received','confirmed','dispatched','delivered','cancelled'];
const canTrack = (kind, detail) => kind === 'retail' || detail.source === 'website-trade-order';
const required=(v,max)=>clean(v,max);
const optional=(v,max)=>v===undefined||v===null||v===''?'':clean(v,max);

export function initializeLeadInbox(C){
 C.db.exec(`CREATE TABLE IF NOT EXISTS lead_inbox(
   id TEXT PRIMARY KEY,
   request_key TEXT UNIQUE NOT NULL,
   fingerprint TEXT NOT NULL,
   kind TEXT NOT NULL CHECK(kind IN ('retail','wholesale')),
   name TEXT NOT NULL,
   phone TEXT NOT NULL,
   business TEXT NOT NULL DEFAULT '',
   region TEXT NOT NULL DEFAULT '',
   city TEXT NOT NULL DEFAULT '',
   detail TEXT NOT NULL,
   status TEXT NOT NULL DEFAULT 'new' CHECK(status IN ('new','contacted','quoted','converted','closed')),
   follow_up_at TEXT,
   owner_note TEXT NOT NULL DEFAULT '',
   created TEXT NOT NULL,
   updated TEXT NOT NULL
 );
 CREATE INDEX IF NOT EXISTS lead_inbox_status_due ON lead_inbox(status,follow_up_at,created);
 CREATE INDEX IF NOT EXISTS lead_inbox_phone ON lead_inbox(phone);`);
 if(!C.db.prepare('PRAGMA table_info(lead_inbox)').all().some(column=>column.name==='user_id'))C.db.exec('ALTER TABLE lead_inbox ADD COLUMN user_id TEXT');
 if(!C.db.prepare('PRAGMA table_info(lead_inbox)').all().some(column=>column.name==='order_status'))C.db.exec("ALTER TABLE lead_inbox ADD COLUMN order_status TEXT NOT NULL DEFAULT 'received'");
 if(!C.db.prepare('PRAGMA table_info(lead_inbox)').all().some(column=>column.name==='tracking_token'))C.tx(()=>{
  C.db.exec('ALTER TABLE lead_inbox ADD COLUMN tracking_token TEXT');
  C.db.exec("UPDATE lead_inbox SET tracking_token=lower(hex(randomblob(32))) WHERE kind='retail'");
 });
 C.db.exec('CREATE INDEX IF NOT EXISTS lead_inbox_user ON lead_inbox(user_id)');
}

function validateOrderLines(items,catalog,trade=false){
  if(!Array.isArray(items)||items.length<1||items.length>20)fail(400,'Add at least one product to your cart.');
  const variants=new Map(catalog.flatMap(p=>p.variants.map(v=>[v.id,{product:p.name,pack:v.label,pricePaise:v.pricePaise,stock:v.stock}])));
  const seen=new Set();
  return items.map(item=>{
   const variantId=required(item?.variantId,80),quantity=integer(item?.quantity,1,100);
   if(seen.has(variantId))fail(400,'A product pack appears twice.');seen.add(variantId);
   const v=variants.get(variantId);
   if(!v||!Number.isSafeInteger(v.pricePaise)||v.pricePaise<=0)fail(409,'Product price must be confirmed.');
   if(trade && v.stock !== null && quantity > v.stock)fail(409,'Requested quantity exceeds available stock.');
   return {variantId,product:v.product,pack:v.pack,quantity,unitPricePaise:v.pricePaise};
  });
}

function validateLead(C,b){
 if(!b||typeof b!=='object'||Array.isArray(b))fail(400,'Complete the enquiry form.');
 if(b.acknowledgeStorage!==true)fail(400,'Confirm that we may save your enquiry to respond to it.');
 const requestKey=required(b.requestKey,80);
 if(!/^[a-f0-9-]{36}$/i.test(requestKey))fail(400,'Invalid enquiry reference.');
 const kind=String(b.kind||'');
 if(kind!=='retail'&&kind!=='wholesale')fail(400,'Choose a retail or wholesale enquiry.');
 const name=required(b.name,100),digits=String(b.phone||'').replace(/[\s()+.-]/g,'');
 const local=digits.startsWith('91')&&digits.length===12?digits.slice(2):digits;
 if(!/^[6-9]\d{9}$/.test(local))fail(400,'Provide a valid Indian mobile number.');
 const phone='91'+local;
 let business='',region='',city='',detail;
 if(kind==='wholesale'){
  business=required(b.business,200);region=required(b.region,30);
  if(!['Tamil Nadu','Puducherry'].includes(region))fail(400,'Select Tamil Nadu or Puducherry.');
  city=required(b.city,100);
  const businessType=required(b.businessType,60),requirements=required(b.requirements,1000);
  if(!['Supplement retail shop','Gym / fitness studio','Reseller / distributor','Other'].includes(businessType))fail(400,'Choose a business type.');
  const gstin=optional(b.gstin,15).toUpperCase();
  if(gstin&&!/^\d{2}[A-Z0-9]{13}$/.test(gstin))fail(400,'Invalid GSTIN format.');
  detail={businessType,gstin,requirements,marketingOptIn:false,source:'website-wholesale-enquiry'};
 }else{
  region=required(b.state,80);city=required(b.city,100);
  const address=required(b.address,350),pincode=required(b.pincode,6);
  if(!/^[1-9]\d{5}$/.test(pincode))fail(400,'Enter a six-digit delivery PIN code.');
  const lines=validateOrderLines(b.items,C.catalogue(null));
  const paymentPreference=optional(b.paymentPreference,100);
  detail={lines,address,pincode,paymentPreference,offerCode:optional(b.offerCode,30),totalBeforeOffersPaise:lines.reduce((t,v)=>t+v.quantity*v.unitPricePaise,0),marketingOptIn:false,source:'website-whatsapp-checkout'};
 }
 const lead={requestKey,kind,name,phone,business,region,city,detail};
 return {...lead,fingerprint:hash(JSON.stringify(lead))};
}

export function saveLead(C,b,accountId=null){
 return recordLead(C,validateLead(C,b),accountId);
}

function recordLead(C,lead,accountId){
 const now=new Date().toISOString();
 const token=canTrack(lead.kind,lead.detail)?randomBytes(32).toString('hex'):null;
 return C.tx(()=>{
  const prior=C.db.prepare('SELECT id,fingerprint,created,user_id,tracking_token FROM lead_inbox WHERE request_key=?').get(lead.requestKey);
  if(prior){
   if(prior.fingerprint!==lead.fingerprint || (lead.detail.source==='website-trade-order' && prior.user_id!==accountId))fail(409,'Enquiry changed. Please try again with a new reference.');
   return {id:prior.id,created:prior.created,recorded:true,trackingToken:prior.tracking_token||undefined,alreadyRecorded:true};
  }
  const id='MVN-LEAD-'+randomUUID().slice(0,12).toUpperCase();
  C.db.prepare('INSERT INTO lead_inbox(id,request_key,fingerprint,kind,name,phone,business,region,city,detail,created,updated,tracking_token) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)')
   .run(id,lead.requestKey,lead.fingerprint,lead.kind,lead.name,lead.phone,lead.business,lead.region,lead.city,JSON.stringify(lead.detail),now,now,token);
  if(accountId)C.db.prepare('UPDATE lead_inbox SET user_id=? WHERE id=?').run(accountId,id);
  C.audit('website','lead.created',id,{kind:lead.kind});
  return {id,created:now,recorded:true,trackingToken:token||undefined,alreadyRecorded:false};
 });
}

export function saveTradeOrder(C,user,b){
 const tier=C.pricingTier(user);
 if(tier==='retail')fail(403,'Dealer approval is required.');
 const requestKey=required(b?.requestKey,36);
 if(!/^[a-f0-9-]{36}$/i.test(requestKey))fail(400,'Invalid order reference.');
 const fingerprint=hash(JSON.stringify({accountId:user.id,items:b.items}));
 const prior=C.db.prepare('SELECT id,created,fingerprint,user_id,detail,tracking_token FROM lead_inbox WHERE request_key=?').get(requestKey);
 if(prior){
  if(prior.user_id!==user.id||prior.fingerprint!==fingerprint)fail(409,'Order request changed. Start a new request.');
  return {id:prior.id,created:prior.created,recorded:true,alreadyRecorded:true,trackingToken:prior.tracking_token,detail:JSON.parse(prior.detail)};
 }
 const lines=validateOrderLines(b.items,C.catalogue(user),true);
 const dealer=C.db.prepare('SELECT d.business,p.phone,p.city FROM dealers d LEFT JOIN dealer_profiles p ON p.user_id=d.user_id WHERE d.user_id=?').get(user.id);
 const local=String(dealer?.phone||'').slice(-10);
 if(!/^[6-9]\d{9}$/.test(local))fail(409,'Contact our team to add a business mobile number to your account.');
 const detail={source:'website-trade-order',tier,lines,totalBeforeOffersPaise:lines.reduce((total,line)=>total+line.quantity*line.unitPricePaise,0)};
 const lead={requestKey,kind:'wholesale',name:user.name,phone:'91'+local,business:dealer.business,region:'',city:dealer.city||'',detail};
 return {...recordLead(C,{...lead,fingerprint},user.id),detail};
}

export function listTradeOrders(C,user){
 if(C.pricingTier(user)==='retail')fail(403,'Dealer approval is required.');
 return C.db.prepare("SELECT id,created,order_status AS status,detail FROM lead_inbox WHERE user_id=? AND json_extract(detail,'$.source')='website-trade-order' ORDER BY created DESC LIMIT 50").all(user.id)
  .map(({detail,...order})=>({...order,...JSON.parse(detail)}));
}

export function trackLeadOrder(C,b){
 const id=String(b?.id||''),token=String(b?.token||'');
 if(!/^MVN-LEAD-[A-F0-9-]{12}$/.test(id)||!(/^[a-f0-9]{64}$/).test(token))fail(404,'Order request not found. Check your private tracking link.');
 const row=C.db.prepare('SELECT id,tracking_token,order_status,created FROM lead_inbox WHERE id=?').get(id);
 if(!row?.tracking_token||!timingSafeEqual(Buffer.from(token),Buffer.from(row.tracking_token)))
  fail(404,'Order request not found. Check your private tracking link.');
 return {id:row.id,status:row.order_status,created:row.created};
}

export function listLeads(C){
 const total=C.db.prepare('SELECT COUNT(*) total FROM lead_inbox').get().total;
 const due=C.db.prepare("SELECT COUNT(*) count FROM lead_inbox WHERE status NOT IN ('converted','closed') AND follow_up_at IS NOT NULL AND follow_up_at<=?").get(new Date().toISOString()).count;
 const fresh=C.db.prepare("SELECT COUNT(*) count FROM lead_inbox WHERE status='new'").get().count;
 const rows=C.db.prepare('SELECT id,kind,name,phone,business,region,city,detail,status,follow_up_at AS followUpAt,owner_note AS ownerNote,tracking_token,order_status AS orderStatus,created,updated FROM lead_inbox ORDER BY created DESC LIMIT 500').all().map(({tracking_token,...r})=>{
  const detail=JSON.parse(r.detail);
  return {...r,detail,trackingToken:tracking_token||undefined};
 });
 return {rows,total,due,new:fresh,showing:rows.length};
}

export function updateLead(C,user,b){
 const id=required(b.id,50),status=required(b.status,30);
 if(!statuses.has(status))fail(400,'Invalid enquiry status.');
 const ownerNote=optional(b.ownerNote,1000);
 let followUpAt=null;
 if(b.followUpAt!==null&&b.followUpAt!==undefined&&b.followUpAt!==''){
  if(typeof b.followUpAt!=='string'||!/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(b.followUpAt)||!Number.isFinite(Date.parse(b.followUpAt)))fail(400,'Enter a valid follow-up date and time.');
  followUpAt=new Date(b.followUpAt).toISOString();
 }
 return C.tx(()=>{
  const row=C.db.prepare('SELECT kind,detail,order_status FROM lead_inbox WHERE id=?').get(id);
  if(!row)fail(404,'Enquiry not found.');
  const orderStatus=b.orderStatus??row.order_status;
  if(b.orderStatus!==undefined && (!orderStatuses.includes(orderStatus)||!canTrack(row.kind,JSON.parse(row.detail))))fail(400,'Invalid order status.');
  C.db.prepare('UPDATE lead_inbox SET status=?,follow_up_at=?,owner_note=?,order_status=?,updated=? WHERE id=?')
   .run(status,followUpAt,ownerNote,orderStatus,new Date().toISOString(),id);
  C.audit(user.id,'lead.review',id,{status,orderStatus});
  return {ok:true};
 });
}
