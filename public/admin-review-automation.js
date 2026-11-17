import {api,esc} from './commerce-api.js';
const form=document.getElementById('reviewAutomationForm'),message=document.getElementById('reviewAutomationMessage');
if(form){
 async function load(){const data=await api('/api/admin/review-automation');message.textContent='';
  form.elements.enabled.checked=data.config.enabled;form.elements.dailyMax.value=data.config.dailyMax;form.elements.monthlyMax.value=data.config.monthlyMax;
  document.getElementById('reviewAutomationReadiness').innerHTML=Object.entries(data.readiness.channels).map(([channel,info])=>'<h4>'+esc(channel==='whatsapp'?'WhatsApp · +91 77088 30513':'SMS · MSG91 registered sender')+'</h4><p>'+(info.ready?'Ready':info.reasons.map(esc).join('<br>'))+'</p>').join('');
  document.getElementById('reviewAutomationCounts').textContent=data.consentCount+' customers with review consent. '+data.counts.map(c=>c.channel+' '+c.stage+' '+c.status+': '+c.count).join(' · ');
  document.getElementById('reviewTemplateText').textContent='Request template:\n'+data.templates.request+'\n\nReminder template:\n'+data.templates.reminder;
  document.getElementById('reviewAutomationHistory').innerHTML=data.recent.length?'<div class="table-scroll"><table><thead><tr><th>Channel</th><th>Stage</th><th>Status</th><th>Attempt / provider reference</th></tr></thead><tbody>'+data.recent.map(r=>'<tr><td>'+esc(r.channel)+'</td><td>'+esc(r.stage)+'</td><td>'+esc(r.status)+'</td><td>'+esc(r.attempted||r.created)+'<br>'+esc(r.provider_id||r.error||'Waiting')+'</td></tr>').join('')+'</tbody></table></div>':'<p>No review requests attempted.</p>';
 }
 async function perform(button,fn){button.disabled=true;try{await fn();await load();message.textContent='Saved.';}catch(error){message.textContent=error.message;}finally{button.disabled=false;}}
 form.onsubmit=e=>{e.preventDefault();void perform(e.submitter||form.querySelector('button[type=submit]'),()=>api('/api/admin/review-automation',{enabled:form.elements.enabled.checked,dailyMax:Number(form.elements.dailyMax.value),monthlyMax:Number(form.elements.monthlyMax.value)}));};
 document.getElementById('reviewVerifyWhatsapp').onclick=e=>void perform(e.currentTarget,()=>api('/api/admin/review-automation/verify',{}));
 document.getElementById('reviewQueuePreview').onclick=e=>void perform(e.currentTarget,async()=>{const result=await api('/api/admin/review-automation/preview',{});document.getElementById('reviewQueueResult').textContent=result.added+' new queue entries. Preview sent '+result.sent+' messages.';});
 const consent=document.getElementById('reviewConsentForm');
 consent.onsubmit=e=>{e.preventDefault();void perform(e.submitter||consent.querySelector('button[type=submit]'),async()=>{await api('/api/admin/review-consent',{...Object.fromEntries(new FormData(consent)),whatsapp:consent.elements.whatsapp.checked,sms:consent.elements.sms.checked,explicitConsent:consent.elements.explicitConsent.checked});consent.reset();});};
 const refresh=()=>load().catch(error=>message.textContent=error.message);document.addEventListener('mvn:admin-ready',refresh);refresh();
}
