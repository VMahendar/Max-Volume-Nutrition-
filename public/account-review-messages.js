import {api} from './commerce-api.js';
const form=document.getElementById('reviewMessagePreferences'),message=document.getElementById('reviewMessageStatus');
if(form){
 async function load(){try{const p=await api('/api/me/review-messages');message.textContent='';form.elements.whatsapp.checked=p.whatsapp;form.elements.sms.checked=p.sms;form.elements.explicitConsent.checked=false;document.getElementById('reviewMessagePhone').textContent=p.contactConfirmed?'Confirmed delivery contact: '+p.phone:'Our team must confirm your completed purchase and delivery contact before review messages can start.';}catch(error){message.textContent=error.message;}}
 form.onsubmit=async e=>{e.preventDefault();const button=e.submitter||form.querySelector('button[type=submit]');button.disabled=true;try{await api('/api/me/review-messages',{whatsapp:form.elements.whatsapp.checked,sms:form.elements.sms.checked,explicitConsent:form.elements.explicitConsent.checked});await load();message.textContent='Your review message preferences are saved.';}catch(error){message.textContent=error.message;}finally{button.disabled=false;}};
 document.addEventListener('mvn:account-ready',()=>void load());load();
}
