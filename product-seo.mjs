// Server-rendered retail product snippets and genuine customer reviews.
// Prices come from the same live SQLite retail catalogue used by the storefront.
// Never synthesize ratings, reviews, stock status or wholesale offers.
export const PRODUCT_PAGE_IDS=Object.freeze({
 '/potency-whey.html':{primaryVariantId:'whey-coffee',id:'potency-whey',name:'Unicorn Pro Series Potency Whey Protein',image:'/assets/potency-whey-coffee-5lb.webp'},
 '/nitro-mass.html':{primaryVariantId:'mass-5kg',id:'nitro-mass',name:'Unicorn Pro Series Nitro Mass Gainer',image:'/assets/Screenshot_2026_1103_003852.jpg'},
 '/pro-creatine.html':{primaryVariantId:'creatine-cranberry',id:'pro-creatine',name:'Unicorn Pro Series Pro Creatine'},
 '/sturdy-pre-workout.html':{id:'sturdy-pre',name:'Unicorn Pro Series Sturdy Pre-Workout',image:'/assets/sturdy-watermelon-front.webp'},
 '/musclevite-multivitamin.html':{id:'musclevite',name:'Unicorn Pro Series Musclevite Multivitamin',image:'/assets/musclevite-front.webp'}
});
const DOMAIN='https://maxvolumenutriton.shop';
const ESC={'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'};
const escapeHtml=value=>String(value??'').replace(/[&<>"']/g,c=>ESC[c]);
const safeJson=value=>JSON.stringify(value).replace(/[<>&\u2028\u2029]/g,c=>'\\u'+c.charCodeAt(0).toString(16).padStart(4,'0'));
const rupees=paise=>'₹'+(paise/100).toLocaleString('en-IN',{minimumFractionDigits:0,maximumFractionDigits:2});
const numberScore=value=>Math.round(value*10)/10;
const firstName=value=>String(value||'Customer').trim().split(/\s+/)[0].slice(0,80)||'Customer';

export function buildProductFragments(path,catalogue,approvedReviews=[]){
 const config=PRODUCT_PAGE_IDS[path];
 if(!config)return null;
 const product=(Array.isArray(catalogue)?catalogue:[]).find(p=>p.id===config.id);
 if(!product)return null;
 const variants=(product.variants||[]).filter(v=>Number.isSafeInteger(v.pricePaise)&&v.pricePaise>0);
 const primary=variants.find(v=>v.id===(config.primaryVariantId||''))||variants[0]||null;
 const url=DOMAIN+path;
 const reviewRows=(Array.isArray(approvedReviews)?approvedReviews:[])
  .filter(r=>Number.isInteger(r.rating)&&r.rating>=1&&r.rating<=5&&r.status==='approved');
 const average=reviewRows.length?numberScore(reviewRows.reduce((sum,r)=>sum+r.rating,0)/reviewRows.length):null;
 // Advertise one precise, publicly visible variant. Google explicitly cautions
 // against AggregateOffer for multiple sizes/flavours of a product.
 const offer=primary?{'@type':'Offer',url,priceCurrency:'INR',price:(primary.pricePaise/100).toFixed(2)}:null;
 const jsonLd={
  '@context':'https://schema.org',
  '@type':'Product',
  name:config.name,
  url,
  brand:{'@type':'Brand',name:product.brand||'Unicorn Pro Series'},
  description:product.description||config.name
 };
 if(config.image)jsonLd.image=DOMAIN+config.image;
 if(offer)jsonLd.offers=offer;
 if(reviewRows.length){
  jsonLd.aggregateRating={'@type':'AggregateRating',ratingValue:average,reviewCount:reviewRows.length,bestRating:5,worstRating:1};
  jsonLd.review=reviewRows.slice(0,10).map(r=>({
   '@type':'Review',
   author:{'@type':'Person',name:firstName(r.name)},
   reviewRating:{'@type':'Rating',ratingValue:r.rating,bestRating:5},
   name:r.title,
   reviewBody:r.body,
   datePublished:String(r.created||'').slice(0,10)
  }));
 }
 // A Product with no real public offer or review is not rich-result eligible.
 const schema=(offer||reviewRows.length)?'<script type="application/ld+json">'+safeJson(jsonLd)+'</script>':'';
 const pricing=variants.length?
  '<section class="mvn-live-retail" aria-label="Current retail prices"><h2>Current retail prices</h2>'+
  '<div class="mvn-retail-variants">'+variants.map(v=>
   '<div class="mvn-retail-variant"><span>'+escapeHtml(v.label)+'</span><strong>'+rupees(v.pricePaise)+'</strong></div>'
  ).join('')+'</div><p class="mvn-review-note">Retail customer prices only. Confirm current stock and delivery with our team; payment and automated shipping are not enabled.</p></section>':
  '<section class="mvn-live-retail"><h2>Current retail prices</h2><p>Please confirm the price and available variants with our team before placing an enquiry.</p></section>';
 const reviewCards=reviewRows.slice(0,20).map(r=>
  '<article class="mvn-review-card"><div class="mvn-review-card-top"><strong>'+escapeHtml(r.title)+'</strong><span aria-label="'+r.rating+' out of 5 stars">'+
   '★'.repeat(r.rating)+'☆'.repeat(5-r.rating)+'</span></div><p>'+escapeHtml(r.body)+'</p><small>By '+
   escapeHtml(firstName(r.name))+' · '+escapeHtml(String(r.created||'').slice(0,10))+'</small></article>'
 ).join('');
 const score=reviewRows.length?
  '<p class="mvn-rating-summary"><strong>'+average.toFixed(1)+' / 5</strong> <span aria-label="Average rating">'+
  '★'.repeat(Math.round(average))+'☆'.repeat(5-Math.round(average))+'</span> <small>From '+reviewRows.length+' published customer review'+
  (reviewRows.length===1?'':'s')+'</small></p>':
  '<p class="mvn-review-note">No published customer reviews yet. Ratings will appear after genuine reviews are approved.</p>';
 const reviews='<section class="mvn-reviews" id="mvnProductReviews" data-product-id="'+config.id+'" aria-labelledby="mvnReviewsTitle">'+
  '<h2 id="mvnReviewsTitle">Customer ratings &amp; reviews</h2>'+score+
  '<div class="mvn-review-list">'+(reviewCards||'<p class="mvn-review-note">Be the first to share your product experience.</p>')+'</div>'+
  '<div class="mvn-review-submit"><h3>Share your experience</h3><p class="mvn-review-note">Reviews are submitted by registered users and moderated before publication. Only authentic product experiences should be submitted.</p>'+
  '<p id="mvnReviewSignIn">To write a review, <a href="/account.html">sign in to your account</a>.</p>'+
  '<form id="mvnReviewForm" hidden><label for="mvnReviewRating">Your rating</label><select id="mvnReviewRating" name="rating" required>'+
  '<option value="">Choose a rating</option><option value="5">5 stars</option><option value="4">4 stars</option>'+
  '<option value="3">3 stars</option><option value="2">2 stars</option><option value="1">1 star</option></select>'+
  '<label for="mvnReviewTitle">Review title</label><input id="mvnReviewTitle" name="title" type="text" maxlength="120" required>'+
  '<label for="mvnReviewBody">Your review</label><textarea id="mvnReviewBody" name="body" minlength="20" maxlength="3000" rows="4" required></textarea>'+
  '<button type="submit">Submit review for approval</button></form><p id="mvnReviewStatus" role="status" aria-live="polite"></p></div></section>';
 return {schema,content:pricing+reviews,productId:config.id,offer,reviewCount:reviewRows.length};
}
