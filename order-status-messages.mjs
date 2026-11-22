const labels = {confirmed:'Confirmed',dispatched:'Dispatched'};

export function orderMessageReady(env=process.env){
 return env.NODE_ENV==='production' && env.STAGING_MODE!=='true' &&
  env.ORDER_STATUS_WHATSAPP_ENABLED==='true' &&
  Boolean(env.WHATSAPP_ACCESS_TOKEN) &&
  /^\d+$/.test(env.WHATSAPP_PHONE_NUMBER_ID||'') &&
  /^v\d+\.\d+$/.test(env.WHATSAPP_GRAPH_VERSION||'') &&
  /^[a-z0-9_]+$/.test(env.ORDER_STATUS_WHATSAPP_TEMPLATE||'') &&
  /^en(?:_[A-Z]{2})?$/.test(env.ORDER_STATUS_WHATSAPP_LANGUAGE||'');
}

export function initializeOrderMessages(C){
 C.db.exec(`CREATE TABLE IF NOT EXISTS order_status_messages(
  lead_id TEXT NOT NULL, milestone TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', created TEXT NOT NULL,
  PRIMARY KEY(lead_id,milestone)
 )`);
}

export function queueOrderMessage(C,id,milestone,env=process.env){
 if(!Object.hasOwn(labels,milestone)||!orderMessageReady(env))return;
 C.db.prepare("INSERT OR IGNORE INTO order_status_messages(lead_id,milestone,created) SELECT id,?,? FROM lead_inbox WHERE id=? AND tracking_token IS NOT NULL AND json_extract(detail,'$.orderWhatsappOptIn')=1")
  .run(milestone,new Date().toISOString(),id);
}

export async function dispatchOrderMessages(C,env=process.env,send=fetch){
 if(!orderMessageReady(env))return;
 const rows=C.db.prepare("SELECT q.lead_id,q.milestone,l.phone,l.tracking_token,l.order_status FROM order_status_messages q JOIN lead_inbox l ON l.id=q.lead_id WHERE q.status='pending' ORDER BY q.created LIMIT 10").all();
 const claim=C.db.prepare("UPDATE order_status_messages SET status=? WHERE lead_id=? AND milestone=? AND status='pending'");
 const finish=C.db.prepare("UPDATE order_status_messages SET status=? WHERE lead_id=? AND milestone=? AND status='sending'");
 for(const row of rows){
  const current=C.db.prepare('SELECT order_status FROM lead_inbox WHERE id=?').get(row.lead_id);
  if(current?.order_status!==row.milestone){
   claim.run('skipped',row.lead_id,row.milestone);
   continue;
  }
  if(claim.run('sending',row.lead_id,row.milestone).changes!==1)continue;
  let status='unknown';
  try{
   const response=await send('https://graph.facebook.com/'+env.WHATSAPP_GRAPH_VERSION+'/'+env.WHATSAPP_PHONE_NUMBER_ID+'/messages',{
    method:'POST',
    headers:{Authorization:'Bearer '+env.WHATSAPP_ACCESS_TOKEN,'Content-Type':'application/json'},
    signal:AbortSignal.timeout(15000),
    body:JSON.stringify({
     messaging_product:'whatsapp',to:row.phone,type:'template',
     template:{name:env.ORDER_STATUS_WHATSAPP_TEMPLATE,language:{code:env.ORDER_STATUS_WHATSAPP_LANGUAGE},components:[
      {type:'body',parameters:[row.lead_id,labels[row.milestone]].map(text=>({type:'text',text}))},
      {type:'button',sub_type:'url',index:'0',parameters:[{type:'text',text:row.lead_id+'.'+row.tracking_token}]}
     ]}
    })
   });
   const result=await response.json();
   if(response.ok&&typeof result.messages?.[0]?.id==='string')status='accepted';
   else if(response.status>=400&&response.status<500)status='failed';
  }catch{}
  finish.run(status,row.lead_id,row.milestone);
 }
}

export function startOrderMessageScheduler(C){
 C.db.prepare("UPDATE order_status_messages SET status='unknown' WHERE status='sending'").run();
 let running=false;
 const timer=setInterval(async()=>{
  if(running)return;
  running=true;
  try{await dispatchOrderMessages(C);}
  catch{console.error('Order status message queue needs review.');}
  finally{running=false;}
 },15000);
 timer.unref();
 return ()=>clearInterval(timer);
}
