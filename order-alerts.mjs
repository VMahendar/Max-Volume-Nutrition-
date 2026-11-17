// Owner operational alerts only. No customer marketing or contact-list delivery.
export function initializeOrderAlerts(C){
 C.db.exec(`CREATE TABLE IF NOT EXISTS order_alerts(
  id TEXT PRIMARY KEY,lead_id TEXT NOT NULL,channel TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',created TEXT NOT NULL,updated TEXT NOT NULL,
  UNIQUE(lead_id,channel));`);
}
export function orderAlertReadiness(env=process.env){
 const active=env.STAGING_MODE!=='true'&&env.ORDER_ALERTS_ENABLED==='true';
 const requirements={email:['RESEND_API_KEY','ORDER_ALERT_FROM','ORDER_ALERT_EMAIL'],whatsapp:['WHATSAPP_ACCESS_TOKEN','WHATSAPP_PHONE_NUMBER_ID','WHATSAPP_GRAPH_VERSION','ORDER_ALERT_WHATSAPP_TO','ORDER_ALERT_WHATSAPP_TEMPLATE','WHATSAPP_TEMPLATE_LANGUAGE']};
 return {enabled:active,channels:Object.fromEntries(Object.entries(requirements).map(([channel,keys])=>[channel,{ready:active&&keys.every(k=>Boolean(env[k])),missing:keys.filter(k=>!env[k])}]))};
}
export function enqueueOrderAlert(C,lead,env=process.env){
 if(env.STAGING_MODE==='true')return;
 const now=new Date().toISOString();
 for(const channel of ['email','whatsapp'])C.db.prepare('INSERT OR IGNORE INTO order_alerts(id,lead_id,channel,created,updated) VALUES(?,?,?,?,?)').run(lead.id+':'+channel,lead.id,channel,now,now);
}
export async function dispatchOrderAlerts(C,env=process.env,fetcher=fetch){
 const readiness=orderAlertReadiness(env);if(!readiness.enabled)return;
 const rows=C.db.prepare("SELECT * FROM order_alerts WHERE status='pending' ORDER BY created LIMIT 10").all();
 for(const row of rows){
  if(!readiness.channels[row.channel]?.ready)continue;
  if(C.db.prepare("UPDATE order_alerts SET status='sending',updated=? WHERE id=? AND status='pending'").run(new Date().toISOString(),row.id).changes!==1)continue;
  let status='unknown';
  try{
   let url,headers,body;
   const text='New Max Volume Nutrition enquiry: '+row.lead_id+'. Review it in your owner dashboard: https://maxvolumenutriton.shop/admin.html#dealers';
   if(row.channel==='email'){
    url='https://api.resend.com/emails';headers={Authorization:'Bearer '+env.RESEND_API_KEY,'Idempotency-Key':row.id};
    body={from:env.ORDER_ALERT_FROM,to:[env.ORDER_ALERT_EMAIL],subject:'MVN new enquiry '+row.lead_id,text};
   }else{
    if(!/^v\d+\.\d+$/.test(env.WHATSAPP_GRAPH_VERSION)||!/^\d+$/.test(env.WHATSAPP_PHONE_NUMBER_ID)||!/^\d{10,15}$/.test(env.ORDER_ALERT_WHATSAPP_TO))throw Error('Invalid provider settings');
    url='https://graph.facebook.com/'+env.WHATSAPP_GRAPH_VERSION+'/'+env.WHATSAPP_PHONE_NUMBER_ID+'/messages';headers={Authorization:'Bearer '+env.WHATSAPP_ACCESS_TOKEN};
    body={messaging_product:'whatsapp',to:env.ORDER_ALERT_WHATSAPP_TO,type:'template',template:{name:env.ORDER_ALERT_WHATSAPP_TEMPLATE,language:{code:env.WHATSAPP_TEMPLATE_LANGUAGE},components:[{type:'body',parameters:[{type:'text',text:row.lead_id}]}]}};
   }
   const response=await fetcher(url,{method:'POST',headers:{...headers,'Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(15000)});
   const result=await response.json();status=response.ok&&(row.channel==='email'?typeof result.id==='string':Array.isArray(result.messages)&&Boolean(result.messages[0]?.id))?'accepted':'failed';
  }catch{status='unknown';}
  C.db.prepare('UPDATE order_alerts SET status=?,updated=? WHERE id=?').run(status,new Date().toISOString(),row.id);
 }
}
export function startOrderAlertScheduler(C,env=process.env){
 // An interrupted request has an uncertain outcome; never blindly resend it.
 C.db.prepare("UPDATE order_alerts SET status='unknown' WHERE status='sending'").run();
 let running=false;
 const tick=async()=>{if(running)return;running=true;try{await dispatchOrderAlerts(C,env);}catch{console.error('Owner alert queue needs review.');}finally{running=false;}};
 const timer=setInterval(()=>void tick(),60000);timer.unref();return ()=>clearInterval(timer);
}
