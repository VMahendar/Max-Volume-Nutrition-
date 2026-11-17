import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {openCommerce} from '../commerce.mjs';
import {initializeReviews,verifiedPurchase,recordReviewPurchase,revokeReviewPurchase,moderateReview,reviewRows,googleReviewLink,saveReviewSettings,googleReviewPanel} from '../customer-reviews.mjs';
import {buildProductFragments} from '../product-seo.mjs';

function fixture(){
 const dir=mkdtempSync(join(tmpdir(),'mvn-reviews-')),C=openCommerce(dir);initializeReviews(C);initializeReviews(C);
 const now=new Date().toISOString();
 for(const id of ['alice','bob'])C.db.prepare('INSERT INTO users VALUES(?,?,?,?,?,?)').run(id,id+'@example.test',id+' PrivateSurname','unused','customer',now);
 return {C,close(){C.db.close();rmSync(dir,{recursive:true,force:true});}};
}
test('only a matched completed purchase qualifies; enquiries and other accounts do not',()=>{
 const f=fixture(),{C}=f;try{
  assert.equal(verifiedPurchase(C,'alice','potency-whey'),false);
  const payload=JSON.stringify({lines:[{variantId:'whey-coffee',quantity:1}]});
  C.db.prepare('INSERT INTO orders(id,token,status,payload,created,user_id) VALUES(?,?,?,?,?,?)').run('sale','private','pending',payload,new Date().toISOString(),'alice');
  assert.equal(verifiedPurchase(C,'alice','potency-whey'),false);
  C.db.prepare("UPDATE orders SET status='paid'").run();assert.equal(verifiedPurchase(C,'alice','potency-whey'),false);
  C.db.prepare("UPDATE orders SET fulfilment='delivered'").run();assert.equal(verifiedPurchase(C,'alice','potency-whey'),true);
  assert.equal(verifiedPurchase(C,'bob','potency-whey'),false);
  assert.equal(verifiedPurchase(C,'alice','nitro-mass'),false);
  C.db.prepare("UPDATE orders SET status='refunded'").run();assert.equal(verifiedPurchase(C,'alice','potency-whey'),false);
 }finally{f.close();}
});
test('offline verification requires registered account, receipt and actual delivery; revocation recalculates badge',()=>{
 const f=fixture(),{C}=f;try{
  const b={email:'alice@example.test',productId:'potency-whey',receipt:'PRIVATE-RECEIPT-19',delivered:'2026-01-01',confirmDelivered:true};
  for(const change of [{confirmDelivered:false},{receipt:''},{email:'unknown@example.test'},{delivered:'2099-01-01'},{delivered:'2026-02-30'}])assert.throws(()=>recordReviewPurchase(C,'owner',{...b,...change}),{status:400});
  recordReviewPurchase(C,'owner',b);recordReviewPurchase(C,'owner',b);
  assert.equal(C.db.prepare('SELECT COUNT(*) n FROM review_purchases').get().n,1);
  assert.equal(verifiedPurchase(C,'alice','potency-whey'),true);assert.equal(verifiedPurchase(C,'bob','potency-whey'),false);
  const now=new Date().toISOString();C.db.prepare('INSERT INTO product_reviews VALUES(?,?,?,?,?,?,?,?,?)').run('feedback','potency-whey','alice',1,'My experience','This product did not suit my preferences.','pending',now,now);
  assert.equal(reviewRows(C,'potency-whey').length,0);
  assert.throws(()=>moderateReview(C,'owner',{id:'feedback',status:'rejected',reason:'low_rating'}),{status:400});
  assert.throws(()=>moderateReview(C,'owner',{id:'feedback',status:'rejected'}),{status:400});
  moderateReview(C,'owner',{id:'feedback',status:'approved'});
  const rendered=buildProductFragments('/potency-whey.html',C.catalogue(null),reviewRows(C,'potency-whey'));
  assert.match(rendered.content,/Verified purchase/);assert.match(rendered.schema,/"ratingValue":1/);
  assert.ok(!rendered.content.includes('PrivateSurname'));assert.ok(!rendered.content.includes(b.receipt));assert.ok(!rendered.content.includes(b.email));
  const id=C.db.prepare('SELECT id FROM review_purchases').get().id;revokeReviewPurchase(C,'owner',id);
  assert.equal(verifiedPurchase(C,'alice','potency-whey'),false);
  assert.match(buildProductFragments('/potency-whey.html',C.catalogue(null),reviewRows(C,'potency-whey')).content,/Purchase not verified/);
  moderateReview(C,'owner',{id:'feedback',status:'rejected',reason:'personal_information'});assert.equal(reviewRows(C,'potency-whey').length,0);
  assert.equal(C.db.prepare('SELECT reason FROM review_moderation').get().reason,'personal_information');
 }finally{f.close();}
});
test('Google link stays absent until confirmed; only direct Google review URLs can be saved',()=>{
 const f=fixture(),{C}=f;try{
  assert.ok(!googleReviewPanel(C).includes('href='));
  const link='https://g.page/r/example-review-link/review';
  assert.equal(googleReviewLink(link),link);assert.equal(googleReviewLink(''),'');
  assert.equal(googleReviewLink('https://search.google.com/local/writereview?placeid=ChIJTest123'),'https://search.google.com/local/writereview?placeid=ChIJTest123');
  for(const value of ['https://google.com.evil.example/local/writereview?placeid=ChIJTest','https://g.page/r/test/review?redirect=https://evil.example','http://g.page/r/test/review','https://user:pass@g.page/r/test/review','https://maps.google.com/search?q=test','javascript:alert(1)'])assert.throws(()=>googleReviewLink(value),{status:400});
  assert.throws(()=>saveReviewSettings(C,'owner',{googleReviewUrl:link}),{status:400});
  saveReviewSettings(C,'owner',{googleReviewUrl:link,confirmBusiness:true});assert.match(googleReviewPanel(C),/Write a Google review/);
  saveReviewSettings(C,'owner',{googleReviewUrl:''});assert.ok(!googleReviewPanel(C).includes('href='));
 }finally{f.close();}
});
