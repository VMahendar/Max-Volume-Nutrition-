import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {validateHomepageDesign} from '../homepage-design.mjs';

const base={version:2,order:['hero','categories','bestsellers','brands']};

test('owner can enlarge and independently position each approved homepage photo',()=>{
 const fields={
  bannerZoom:215,bannerX:-25,bannerY:30,bannerPosition:35,bannerPositionY:65,bannerFit:'contain',
  wheyZoom:190,wheyX:15,wheyY:-20,wheyFit:'cover',
  logoZoom:135,bestMassZoom:230,creatinePromoZoom:250,
  goalPhotosVisible:true,promoVisible:true,categoryCardHeight:290,
  categoryGap:18,bestImageHeight:260
 };
 assert.deepEqual(validateHomepageDesign({...base,fields},()=>true).fields,fields);
});

test('other homepage copy and appearance are editable without touching commerce records',()=>{
 const fields={
  heroTitle:'An official supplement offer',heroSecondaryButton:'Explore products',
  categoryWheyHeadline:'Protein',categoryWheyCaption:'Recover better',
  bestPreTitle:'Sturdy Pre-workout',brandTitle:'Globe-Tech Nutrition',
  brandDescription:'Coming soon',footerSubtitle:'Contact us',
  categoryCardColor:'#ffffff',footerColor:'#181818',footerText:'#ffffff',
  titleSize:95,descriptionSize:20,heroCopyWidth:70,heroAlign:'right'
 };
 assert.deepEqual(validateHomepageDesign({...base,fields},()=>true).fields,fields);
 const editor=readFileSync('public/layout-editor.js','utf8');
 const page=readFileSync('public/layout-editor.html','utf8');
 const application=readFileSync('public/homepage-design.js','utf8');
 assert.match(page,/id="currentPhoto"/,'photo preview is visible');
 assert.match(page,/id="photoList"/,'all editable photos are listed');
 assert.match(page,/Replace with a photo from your phone/,'upload is plainly labeled');
 assert.match(editor,/function imageTools/,'every photo has zoom and position controls');
 assert.match(editor,/field\(id\+'Zoom'/,'per-photo zoom is exposed');
 assert.match(application,/f\.goalPhotosVisible/,'category product photos can be shown');
 assert.match(application,/transform-origin/,'photo transformations apply to the real homepage');
});

test('invalid scaling, URL injections and unknown commerce fields are rejected',()=>{
 for(const fields of [
  {bannerZoom:251},{wheyZoom:49},{bannerX:101},{bestMassY:-101},{goalPhotosVisible:'yes'},
  {heroAlign:'bottom'},{bannerFit:'fill'},{footerColor:'transparent'},
  {wheyImage:'https://bad.example/whey.png'},{price:1},{paymentEnabled:true}
 ])assert.throws(()=>validateHomepageDesign({...base,fields},()=>false));
});
