import {api,esc} from './commerce-api.js';
const box=document.getElementById('reviewSetup');
const message=document.getElementById('reviewSetupMessage');
if(box){
 const form=document.getElementById('googleReviewSettings');
 const purchase=document.getElementById('reviewPurchaseForm');
 const template='Thank you for choosing Max Volume Nutrition. When you have had time to try your product, please share your honest experience: https://maxvolumenutriton.shop/reviews.html\nBoth positive and critical feedback are welcome. You can review our service on Google or your product on our website. Reviews are optional.';
 document.getElementById('reviewRequestDraft').value=template;
 async function load(){
  const data=await api('/api/admin/customer-reviews');
  form.elements.googleReviewUrl.value=data.googleReviewUrl;
  document.getElementById('googleReviewConnection').textContent=data.googleReviewUrl?'Google review link is saved. Check that it opens the correct Kelambakkam profile.':'Google review link needed: open your Kelambakkam Business Profile → Read reviews → Get more reviews → Copy link.';
  purchase.elements.productId.innerHTML=data.products.map(p=>'<option value="'+esc(p.id)+'">'+esc(p.name)+'</option>').join('');
  document.getElementById('reviewVerifiedPurchases').innerHTML=data.purchases.length?data.purchases.map(p=>'<article class="panel"><strong>'+esc(p.name)+'</strong><p>'+esc(p.email)+' · '+esc(p.productId)+' · Received '+esc(p.delivered)+'</p><p>Receipt: '+esc(p.receipt)+'</p><button type="button" data-revoke-review-purchase="'+esc(p.id)+'">Revoke verification</button></article>').join(''):'<p>No manually verified purchases yet. Website orders qualify automatically only after payment and delivery.</p>';
 }
 async function save(event,path,body,done){
  event.preventDefault();const button=event.target.querySelector('button[type=submit]');button.disabled=true;
  try{await api(path,body);if(done)done();await load();message.textContent='Saved.';}catch(error){message.textContent=error.message;}finally{button.disabled=false;}
 }
 form.addEventListener('submit',e=>void save(e,'/api/admin/customer-reviews',{googleReviewUrl:form.elements.googleReviewUrl.value.trim(),confirmBusiness:form.elements.confirmBusiness.checked}));
 purchase.addEventListener('submit',e=>void save(e,'/api/admin/review-purchase',{...Object.fromEntries(new FormData(purchase)),confirmDelivered:purchase.elements.confirmDelivered.checked},()=>purchase.reset()));
 document.getElementById('copyReviewRequest').addEventListener('click',async()=>{
  try{await navigator.clipboard.writeText(template);message.textContent='Review request copied. Send it manually only in an appropriate customer conversation.';}catch{document.getElementById('reviewRequestDraft').select();message.textContent='Select and copy the draft above.';}
 });
 box.addEventListener('click',async e=>{
  const button=e.target.closest('button[data-revoke-review-purchase]');if(!button)return;
  if(!confirm('Revoke this purchase verification? The customer review will remain, with its purchase label recalculated.'))return;
  button.disabled=true;try{await api('/api/admin/review-purchase-revoke',{id:button.dataset.revokeReviewPurchase});await load();message.textContent='Verification revoked.';}catch(error){message.textContent=error.message;button.disabled=false;}
 });
 // Admin authentication is handled by the existing page. Retry on a later sign-in.
 const refresh=()=>load().catch(error=>{message.textContent=error.message;});
 document.addEventListener('mvn:admin-ready',refresh);
 refresh();
}
