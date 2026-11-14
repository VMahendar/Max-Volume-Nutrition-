// Progressive enhancement only. The server renders visible approved reviews,
// current retail offers and Google Product data before JavaScript executes.
(()=>{
 const section=document.getElementById('mvnProductReviews');
 const form=document.getElementById('mvnReviewForm');
 const signIn=document.getElementById('mvnReviewSignIn');
 const status=document.getElementById('mvnReviewStatus');
 if(!section||!form||!signIn||!status)return;
 const productId=section.getAttribute('data-product-id');
 if(!/^[a-z0-9-]+$/.test(productId||''))return;
 fetch('/api/session',{credentials:'same-origin',cache:'no-store'})
  .then(response=>response.ok?response.json():null)
  .then(data=>{
   if(!data?.user)return;
   form.hidden=false;
   signIn.hidden=true;
   return fetch('/api/reviews?productId='+encodeURIComponent(productId),{credentials:'same-origin',cache:'no-store'})
    .then(response=>response.ok?response.json():null)
    .then(info=>{
     if(!info?.myReview)return;
     const review=info.myReview;
     form.elements.rating.value=String(review.rating);
     form.elements.title.value=review.title||'';
     form.elements.body.value=review.body||'';
     status.textContent=review.status==='pending'?'Your last review is awaiting approval. You can update it here.':
      review.status==='approved'?'Your review is published. Updating it will require approval again.':
      'Your previous review was not published. You can submit an updated review.';
    });
  }).catch(()=>{});
 form.addEventListener('submit',async(event)=>{
  event.preventDefault();
  if(!form.reportValidity())return;
  const submit=form.querySelector('button[type=submit]');
  submit.disabled=true;
  status.textContent='Submitting your review…';
  try{
   const response=await fetch('/api/reviews',{
    method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({productId,rating:Number(form.elements.rating.value),
     title:form.elements.title.value.trim(),body:form.elements.body.value.trim()})
   });
   const payload=await response.json();
   if(!response.ok)throw Error(payload.error||'Review could not be submitted.');
   status.textContent='Thank you. Your review has been saved and is awaiting approval.';
  }catch(error){status.textContent=error.message||'Please try again.';}
  finally{submit.disabled=false;}
 });
})();
