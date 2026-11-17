(()=>{
 const token=new URLSearchParams(location.search).get('t'),status=document.getElementById('invitationStatus');
 async function request(body){const r=await fetch('/api/review-request'+(body?'':'?t='+encodeURIComponent(token||'')),{method:body?'POST':'GET',headers:body?{'Content-Type':'application/json'}:{},cache:'no-store',body:body?JSON.stringify({token,...body}):undefined});const data=await r.json();if(!r.ok)throw Error(data.error||'Unable to open this invitation.');return data;}
 request().then(data=>{
  status.textContent=(data.stopped?'Reminders for this invitation are stopped. ':'')+'Share your experience with '+data.product+'.';
  const product=document.getElementById('invitationProduct');product.href=data.productUrl;
  if(data.googleReviewUrl){const google=document.getElementById('invitationGoogle');google.href=data.googleReviewUrl;google.hidden=false;}
  document.getElementById('invitationActions').hidden=false;
 }).catch(error=>status.textContent=error.message);
 for(const [id,action] of [['invitationDone','done'],['invitationStop','stop']])document.getElementById(id).onclick=async e=>{
  e.currentTarget.disabled=true;try{await request({action});status.textContent=action==='stop'?'WhatsApp and SMS review requests have been stopped.':'Thank you. No more reminders will be sent for this invitation.';}catch(error){status.textContent=error.message;e.currentTarget.disabled=false;}
 };
})();
