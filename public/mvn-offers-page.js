/* Dedicated offer view: read-only preview of the same published promotion feed used by MVN's cart. */
(()=>{'use strict';
 const host=document.querySelector('#mvnOffersList'),status=document.querySelector('#mvnOffersStatus');
 if(!host||!status)return;
 const formatDate=value=>{const n=Date.parse(value);return Number.isFinite(n)?new Intl.DateTimeFormat('en-IN',{timeZone:'Asia/Kolkata',day:'numeric',month:'short',year:'numeric',hour:'numeric',minute:'2-digit'}).format(new Date(n))+' IST':'See offer terms';};
 const el=(tag,txt)=>{const n=document.createElement(tag);n.textContent=String(txt??'');return n;};
 const show=async()=>{
  try{
   const res=await fetch('/api/promotions?surface=web',{cache:'no-store'});
   if(!res.ok)throw Error('Offers could not be loaded');
   const data=await res.json();
   const now=Date.now(),campaigns=(Array.isArray(data.campaigns)?data.campaigns:[]).filter(c=>c&&Date.parse(c.endsAt)>now);
   host.replaceChildren();
   if(!campaigns.length){status.textContent='There are no currently published retail offers. Shop the catalogue or check this page for official updates.';return;}
   status.textContent=campaigns.length+' published retail offer'+(campaigns.length===1?'':'s')+' available. Product eligibility and savings are verified at checkout.';
   for(const offer of campaigns){
    const card=document.createElement('article');
    card.append(el('small',offer.occasion||'MVN OFFER'),el('h2',offer.title||'Published promotion'),el('p',offer.description||'See verified terms'));
    if(offer.code)card.append(el('p','Offer code: '+offer.code));
    card.append(el('small','Valid until '+formatDate(offer.endsAt)));
    if(offer.terms){const details=document.createElement('details');details.append(el('summary','Offer terms'),el('p',offer.terms));card.append(details);}
    const cta=el('a','SHOP & APPLY IN CART ↗');cta.href='index.html#shop';cta.className='mvn-info-link';card.append(cta);
    host.append(card);
   }
  }catch{status.textContent='Current offers could not be confirmed. No unverified offer codes are displayed. Please check again or contact our team.';}
 };
 void show();
})();