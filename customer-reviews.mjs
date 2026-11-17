import {randomUUID} from 'node:crypto';
import {clean,email,fail} from './commerce.mjs';
import {PRODUCT_PAGE_IDS} from './product-seo.mjs';

export function initializeReviews(C){
 C.db.exec(`CREATE TABLE IF NOT EXISTS review_purchases(
 id TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id),product_id TEXT NOT NULL REFERENCES products(id),
 receipt TEXT NOT NULL,delivered TEXT NOT NULL,actor TEXT NOT NULL,created TEXT NOT NULL,revoked TEXT,
 UNIQUE(user_id,product_id,receipt));
 CREATE TABLE IF NOT EXISTS review_moderation(
 review_id TEXT PRIMARY KEY REFERENCES product_reviews(id) ON DELETE CASCADE,reason TEXT NOT NULL,actor TEXT NOT NULL,updated TEXT NOT NULL);`);
}

export function googleReviewLink(value){
 if(value==='')return '';
 let u;try{u=new URL(clean(value,500));}catch{fail(400,'Paste the Google review link from your Business Profile.');}
 if(u.protocol!=='https:'||u.username||u.password||u.port||u.hash)fail(400,'Use an HTTPS Google review link.');
 const short=u.hostname==='g.page'&&/^\/r\/[A-Za-z0-9_-]+\/review\/?$/.test(u.pathname)&&!u.search;
 const place=['search.google.com','www.google.com'].includes(u.hostname)&&u.pathname==='/local/writereview'&&/^ChI[A-Za-z0-9_-]+$/.test(u.searchParams.get('placeid')||'')&&[...u.searchParams.keys()].every(k=>k==='placeid');
 if(!short&&!place)fail(400,'Use the g.page/r/…/review link or Google local/writereview?placeid=… link from Get more reviews.');
 return u.href;
}
export const reviewSettings=C=>({googleReviewUrl:C.setting('customerReviewsV1')?.googleReviewUrl||''});
export function saveReviewSettings(C,actor,b){
 if(b.googleReviewUrl&&b.confirmBusiness!==true)fail(400,'Confirm this review link belongs to Max Volume Nutrition in Kelambakkam.');
 const settings={googleReviewUrl:googleReviewLink(b.googleReviewUrl)};
 C.tx(()=>{C.set('customerReviewsV1',settings);C.audit(actor,'reviews.google_link','customerReviewsV1');});return settings;
}

export function verifiedPurchase(C,userId,productId){
 if(C.db.prepare('SELECT 1 FROM review_purchases WHERE user_id=? AND product_id=? AND revoked IS NULL LIMIT 1').get(userId,productId))return true;
 // A saved enquiry, a payment without delivery, and another customer's order do not qualify.
 return !!C.db.prepare(`SELECT 1 FROM orders o JOIN json_each(o.payload,'$.lines') line
 JOIN products p ON p.id=? JOIN json_each(p.data,'$.variants') variant
 WHERE o.user_id=? AND o.status='paid' AND o.fulfilment='delivered'
 AND json_extract(line.value,'$.variantId')=json_extract(variant.value,'$.id') LIMIT 1`).get(productId,userId);
}
export function recordReviewPurchase(C,actor,b){
 const person=C.db.prepare('SELECT id,role FROM users WHERE email=?').get(email(b.email));
 if(!person||person.role==='admin')fail(400,'Choose a registered customer account.');
 const productId=clean(b.productId,80),receipt=clean(b.receipt,120);
 if(!C.db.prepare('SELECT id FROM products WHERE id=?').get(productId))fail(404,'Product not found.');
 if(b.confirmDelivered!==true)fail(400,'Confirm that you checked the receipt and the customer received this product.');
 const delivered=clean(b.delivered,10);
 if(!/^\d{4}-\d{2}-\d{2}$/.test(delivered)||!Number.isFinite(Date.parse(delivered))||new Date(delivered).toISOString().slice(0,10)!==delivered||delivered>new Date().toISOString().slice(0,10))fail(400,'Enter a valid past delivery date.');
 C.tx(()=>{
  C.db.prepare(`INSERT INTO review_purchases(id,user_id,product_id,receipt,delivered,actor,created) VALUES(?,?,?,?,?,?,?)
   ON CONFLICT(user_id,product_id,receipt) DO UPDATE SET delivered=excluded.delivered,actor=excluded.actor,revoked=NULL`)
   .run(randomUUID(),person.id,productId,receipt,delivered,actor,new Date().toISOString());
  C.audit(actor,'reviews.purchase_verified',person.id,{productId,receipt,delivered});
 });return {ok:true};
}
export function revokeReviewPurchase(C,actor,id){
 const row=C.db.prepare('SELECT id FROM review_purchases WHERE id=? AND revoked IS NULL').get(clean(id,80));
 if(!row)fail(404,'Purchase verification not found.');
 C.tx(()=>{C.db.prepare('UPDATE review_purchases SET revoked=? WHERE id=?').run(new Date().toISOString(),row.id);C.audit(actor,'reviews.purchase_revoked',row.id);});return {ok:true};
}
export function reviewRows(C,productId){
 return C.db.prepare(`SELECT r.*,u.name FROM product_reviews r JOIN users u ON u.id=r.user_id
 WHERE r.product_id=? AND r.status='approved' ORDER BY r.created DESC,r.id`).all(productId)
 .map(r=>({...r,verifiedPurchase:verifiedPurchase(C,r.user_id,r.product_id)}));
}
export function moderateReview(C,actor,b){
 if(!['approved','rejected'].includes(b.status))fail(400,'Choose an approved review status.');
 const row=C.db.prepare('SELECT id FROM product_reviews WHERE id=?').get(String(b.id));if(!row)fail(404,'Review not found.');
 const reason=b.status==='approved'?'published':clean(b.reason,40);
 if(b.status==='rejected'&&!['spam','no_product_experience','abuse','personal_information','duplicate'].includes(reason))fail(400,'Choose a content policy reason. Negative feedback is not a rejection reason.');
 const now=new Date().toISOString();
 C.tx(()=>{C.db.prepare('UPDATE product_reviews SET status=?,updated=? WHERE id=?').run(b.status,now,row.id);
 C.db.prepare('INSERT INTO review_moderation VALUES(?,?,?,?) ON CONFLICT(review_id) DO UPDATE SET reason=excluded.reason,actor=excluded.actor,updated=excluded.updated').run(row.id,reason,actor,now);
 C.audit(actor,'review.'+b.status,row.id,{reason});});return {ok:true};
}
export function reviewAdminData(C){
 const purchases=C.db.prepare(`SELECT p.id,p.product_id AS productId,p.receipt,p.delivered,u.email,u.name FROM review_purchases p
 JOIN users u ON u.id=p.user_id WHERE p.revoked IS NULL ORDER BY p.created DESC LIMIT 100`).all();
 return {...reviewSettings(C),purchases,products:C.catalogue(null).map(p=>({id:p.id,name:p.name}))};
}
const esc=v=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function googleReviewPanel(C){
 const url=reviewSettings(C).googleReviewUrl;
 return '<section class="mvn-google-review"><h2>Review Max Volume Nutrition on Google</h2><p>Share your honest experience with our service. All feedback is welcome, whatever your rating. Google reviews and product reviews are separate.</p>'+
 (url?'<a class="mvn-review-link" href="'+esc(url)+'" target="_blank" rel="noopener noreferrer">Write a Google review ↗</a>':'<p>Our direct Google review link will be available here once confirmed.</p>')+'</section>';
}
export function reviewHub(C){
 return googleReviewPanel(C)+'<section><h2>Review a product you have used</h2><p>Choose your product, sign in, and share your own experience. Each account has one review per product and can update or delete it.</p><div class="mvn-review-products">'+Object.entries(PRODUCT_PAGE_IDS).filter(([,p])=>C.db.prepare('SELECT id FROM products WHERE id=?').get(p.id)).map(([path,p])=>'<a href="'+path+'#mvnProductReviews">'+esc(p.name)+'</a>').join('')+'</div></section>';
}
