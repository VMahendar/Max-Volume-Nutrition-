// Browser smoke test for the approved Option 2 design reference.
// Deliberately checks the customer website, not the paused Android app.
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {spawn} from 'node:child_process';
import {mkdtempSync, mkdirSync, rmSync} from 'node:fs';
import {resolve} from 'node:path';
import {tmpdir} from 'node:os';
import {setTimeout as delay} from 'node:timers/promises';
import {unlockStorefront} from './unlocked-storefront.mjs';

const dir=mkdtempSync(resolve(tmpdir(),'mvn-option2-qa-'));
const origin='http://127.0.0.1:35319';
const folder='reports/visual-qa/option-two';
mkdirSync(folder,{recursive:true});
const server=spawn(process.execPath,['server.mjs'],{
 env:{...process.env,HOST:'127.0.0.1',PORT:'35319',DATA_DIR:dir,PUBLIC_ORIGIN:origin,
 NODE_ENV:'test',STAGING_MODE:'false',PAYMENTS_ENABLED:'false',SHIPROCKET_ENABLED:'false'},
 stdio:['ignore','pipe','pipe']
});
let err='';
server.stderr.on('data',v=>err+=v.toString());
let browser;
try {
 let ready=false;
 for(let i=0;i<60;i++){
  try{const response=await fetch(origin+'/healthz');if(response.ok){ready=true;break}}catch{}
  await delay(200);
 }
 assert.ok(ready,'test storefront failed to boot: '+err);
 browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 for(const size of [{name:'desktop',width:1440,columns:3},{name:'android',width:390,columns:2}]){
  const context=await browser.newContext({viewport:{width:size.width,height:900},isMobile:size.name==='android',hasTouch:size.name==='android'});
  await unlockStorefront(context);
  const page=await context.newPage();
  const errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  const response=await page.goto(origin+'/',{waitUntil:'domcontentloaded'});
  assert.equal(response.status(),200,size.name+' homepage status');
  await page.locator('#grid article.card .variant').first().waitFor({state:'visible',timeout:12000});
  const count=await page.locator('#grid article.card').count();
  assert.ok(count>=5,size.name+' all five current product families must be present, got '+count);
  // Reference-inspired storefront should present substantial original merchandise imagery
  // and usable, non-duplicated category cards BEFORE the existing cart catalogue.
  const showcase=page.locator('#mvnEditorial');
  assert.ok(await showcase.isVisible(),size.name+' landscape homepage banner must be visible');
  assert.match(await showcase.locator('h1').textContent(),/Max Volume Nutrition full sports supplement product collection/i);
  const groupImage=showcase.locator('.mvn-owner-banner-img');
  assert.equal(await groupImage.count(),1,size.name+' one group banner retains all original product positions');
  assert.equal(await groupImage.getAttribute('src'),'assets/mvn-banner-20261115-no-logo-no-pineapple.webp',size.name+' expected complete approved banner');
  await groupImage.waitFor({state:'visible'});
  await page.waitForFunction(()=>{const img=document.querySelector('.mvn-owner-banner-img');return img?.complete&&img.naturalWidth===1753&&img.naturalHeight===897;},null,{timeout:12000});
  const campaignGeometry=await page.evaluate(()=>{
    const q=x=>document.querySelector(x);
    const hero=q('.mvn-editorial-feature').getBoundingClientRect();
    const promos=q('.mvn-editorial-promos').getBoundingClientRect();
    const categories=q('.mvn-editorial-categories').getBoundingClientRect();
    const goalCards=[...document.querySelectorAll('.mvn-theme-goal-art')].map(x=>x.getBoundingClientRect().toJSON());
    const img=q('.mvn-owner-banner-img');
    return {hero:hero.toJSON(),promos:promos.toJSON(),categories:categories.toJSON(),goalCards,
      heroFit:getComputedStyle(img).objectFit,
      heroNaturalWidth:img.naturalWidth,heroNaturalHeight:img.naturalHeight,
      promoDisplay:getComputedStyle(q('.mvn-editorial-promos')).display,
      siteWidth:document.documentElement.scrollWidth,viewportWidth:innerWidth,
      shopY:q('#shop').getBoundingClientRect().top};
  });
  console.log('SUPPLEMENT_THEME_CAMPAIGN',size.name,JSON.stringify(campaignGeometry));
  assert.equal(campaignGeometry.heroFit,'contain',size.name+' group-product photo must be uncropped');
  assert.equal(campaignGeometry.heroNaturalWidth,1753,size.name+' original banner source is intact');
  assert.equal(campaignGeometry.heroNaturalHeight,897,size.name+' approved full landscape banner retained');
  assert.equal(campaignGeometry.promoDisplay,'grid',size.name+' two authentic promo cards are displayed');
  assert.equal(await showcase.locator('.mvn-editorial-promo').count(),2,size.name+' two product promos');
  assert.equal(await page.locator('.mvn-theme-goal-art').count(),3,size.name+' three image-led shop-by-goal cards');
  assert.equal(await page.locator('.mvn-advance-welcome').count(),0,size.name+' no duplicate text-heavy middle section');
  assert.ok(campaignGeometry.categories.top>=campaignGeometry.hero.top,size.name+' goals follow hero');
  assert.ok(campaignGeometry.categories.bottom<=campaignGeometry.shopY+24,size.name+' goals precede commerce');
  assert.ok(campaignGeometry.siteWidth<=size.width+10,size.name+' no horizontal page overflow');
  assert.ok(campaignGeometry.goalCards.every(x=>x.width>65&&x.height>100),size.name+' goal photo cards are visible');
  if(size.name==='desktop'){
    assert.ok(campaignGeometry.hero.width>size.width*.55,size.name+' left banner is larger than right promos');
    assert.ok(campaignGeometry.promos.x>=campaignGeometry.hero.right-5,size.name+' two promos stand to the right');
    assert.ok(campaignGeometry.promos.height>=campaignGeometry.hero.height*.85,size.name+' promos align to hero height');
    assert.ok(campaignGeometry.goalCards[0].width>=200,size.name+' desktop 3-column goal imagery');
  }else{
    assert.ok(campaignGeometry.hero.width>=size.width-40,size.name+' mobile full-width group photo');
    assert.ok(campaignGeometry.promos.y>=campaignGeometry.hero.bottom-2,size.name+' promo cards move below photo on mobile');
    assert.ok(campaignGeometry.goalCards[0].width>=80,size.name+' Android goal photos remain legible');
  }
  await page.locator('.mvn-editorial-categories').scrollIntoViewIfNeeded();
  assert.equal(await page.locator('.mvn-editorial-category[data-cat="pre"]').isVisible(),true,size.name+' performance goal can be selected');
  await page.screenshot({path:folder+'/'+size.name+'-campaign.png',animations:'disabled'});
  await page.locator('.mvn-editorial-category[data-cat="pre"]').click();
  assert.equal(await page.locator('#grid article.card').count(),1,size.name+' performance goal filters pre-workout');
  await page.locator('.cats [data-cat="all"]').click();
  const geometry=await page.evaluate(()=>{
   const get=x=>document.querySelector(x);
   const grid=get('#grid');
   const title=get('#shop .productbar');
   const hero=get('#mvnSpotlight');
   return {
    columns:getComputedStyle(grid).gridTemplateColumns.split(' ').filter(Boolean).length,
    titleBackground:getComputedStyle(title).backgroundImage,
    heroHidden:getComputedStyle(hero).display==='none',
    scroll:document.documentElement.scrollWidth,
    view:innerWidth,
    priceFilterVisible:get('#priceRange').getClientRects().length>0
   };
  });
  if(size.name==='android'){
   const measurements=await page.evaluate(()=>{
    const rect=selector=>{
     const element=document.querySelector(selector),r=element.getBoundingClientRect();
     return {x:r.x,y:r.y,width:r.width,height:r.height,bottom:r.bottom};
    };
    const logo=document.querySelector('header .original-brand-logo');
    return {
     logoSource:logo.getAttribute('src'),
     logoLoaded:logo.complete&&logo.naturalWidth>0,
     logo:rect('header .original-brand-logo'),
     categories:rect('#shop .cats'),
     filter:rect('#shop .collection-filters'),
     selector:rect('#shop #priceRange'),
     firstProduct:rect('#shop #grid article.card')
    };
   });
   console.log('OPTION2_MOBILE_SPACING',JSON.stringify(measurements));
   assert.equal(measurements.logoSource,'mvn-app-header-logo.webp','use the transparent, genuine MVN header artwork');
   assert.ok(measurements.logoLoaded,'header image loaded');
   assert.ok(measurements.logo.width>=140&&measurements.logo.height>=40,'brand remains readable on mobile');
   assert.ok(measurements.filter.height<=55,'price filter cannot create a large empty panel');
   assert.ok(measurements.selector.height<=45,'price selector is compact');
   assert.ok(measurements.firstProduct.y-measurements.filter.bottom<=24,
     'product cards directly follow filter controls');
   assert.ok(measurements.firstProduct.y-measurements.categories.bottom<=92,
     'no oversized blank area between categories and product cards');
  }

  const more=page.locator('.mvn-header-more');
  const menuPanel=page.locator('.mvn-more-panel');
  const email=page.locator('.mvn-header-email');
  assert.equal(await more.count(),1,size.name+' has a single accessible three-dot menu');
  assert.equal(await menuPanel.isVisible(),false,size.name+' menu closed by default');
  assert.equal(await email.getAttribute('href'),'mailto:maxvolumenutrition@gmail.com');
  assert.equal(await email.isVisible(),false,'contact email moves to theme utility strip');
  const topContact=page.locator('.announce a[href="contact.html"]');
  assert.equal(await topContact.isVisible(),true,size.name+' top bar provides Contact link rather than displaying personal contact details');
  assert.doesNotMatch(await page.locator('.announce').innerText(),/77088|@gmail/,'contact information appears only after opening Contact page');
  await more.locator('summary').click();
  assert.equal(await menuPanel.isVisible(),true,size.name+' three-dot menu opens');
  assert.equal(await menuPanel.locator('a[href="mailto:maxvolumenutrition@gmail.com"]').count(),0,'do not duplicate contact methods in menu');
  assert.equal(await menuPanel.locator('a[href="dealer.html"]').count(),1,'menu includes wholesale enquiries');
  assert.equal(await menuPanel.locator('a[href="support.html"]').count(),1,'menu includes support');
  assert.equal(await menuPanel.locator('a[href="https://wa.me/917708830513"]').count(),0,'WhatsApp contact belongs on support page');
  assert.equal(await menuPanel.locator('a[href="support.html"]').count(),1,'only one support destination');
  await page.keyboard.press('Escape');
  assert.equal(await menuPanel.isVisible(),false,size.name+' Escape closes menu');
  await more.locator('summary').click();
  await page.mouse.click(10,170); // visible page area left of the dropdown on both viewports
  assert.equal(await menuPanel.isVisible(),false,size.name+' outside click closes menu');
  const visual=await page.evaluate(()=>{
   const style=selector=>getComputedStyle(document.querySelector(selector));
   const image=document.querySelector('#grid article.card .photo img');
   return {
    headerBackground:style('.storehead').backgroundColor,
    headerBackgroundImage:style('.storehead').backgroundImage,
    logoLoaded:document.querySelector('.storehead .original-brand-logo').naturalWidth>0,
    accountColor:style('.storehead .account-link').color,
    cartColor:style('.storehead #bag').color,
    nameColor:style('#grid article.card .info h3').color,
    nameFontSize:parseFloat(style('#grid article.card .info h3').fontSize),
    nameFontWeight:Number(style('#grid article.card .info h3').fontWeight),
    sellingFontSize:parseFloat(style('#grid article.card .selling-price').fontSize),
    priceColor:style('#grid article.card .selling-price').color,
    photoBackground:style('#grid article.card .photo').backgroundImage,
    photoNaturalWidth:image.naturalWidth
   };
  });
  console.log('SUPPLEMENT_REFERENCE_VISUAL',size.name,JSON.stringify(visual));
  assert.ok(visual.headerBackgroundImage.includes('linear-gradient')||visual.headerBackground==='rgb(23, 25, 26)',size.name+' orange-and-black header');
  assert.equal(await page.locator('.mvn-theme-main-nav').isVisible(),true,size.name+' reference nav is visible');
  assert.ok(visual.logoLoaded,'original gold MVN header artwork loads');
  assert.equal(visual.accountColor,'rgb(255, 255, 255)','account icon is legible on dark/orange masthead');
  assert.equal(visual.cartColor,'rgb(255, 255, 255)','cart icon is legible on dark/orange masthead');
  assert.ok(visual.nameFontSize>=15,'product titles are legible and prominent');
  assert.ok(visual.nameFontWeight>=800,'product titles use strong weight');
  assert.ok(visual.sellingFontSize>=19,'retail selling price stands out');
  assert.ok(visual.photoNaturalWidth>0,'original product photography is used for the catalogue');
  assert.ok(visual.photoNaturalWidth>0,'real merchandise photography loads');
  assert.equal(geometry.columns,size.columns,size.name+' expected product columns');
  assert.ok(geometry.titleBackground.includes('linear-gradient')||geometry.titleBackground==='none',size.name+' product section does not require a synthetic navy gradient');
  assert.ok(geometry.heroHidden,size.name+' old hero must not interrupt product-first display');
  assert.ok(geometry.scroll<=geometry.view+10,size.name+' overflow '+JSON.stringify(geometry));
  assert.ok(geometry.priceFilterVisible,size.name+' retain price filtering');
  assert.equal(await page.locator('.card .photo img').first().evaluate(img=>img.complete&&img.naturalWidth>0),true,size.name+' real product image loads');
  await page.locator('#priceRange').selectOption('under1000');
  assert.ok(await page.locator('#grid article.card').count()>=1,size.name+' price filter works');
  await page.locator('#priceRange').selectOption('all');
  await page.locator('.cats [data-cat="mass"]').click();
  assert.equal(await page.locator('#grid article.card').count(),1,size.name+' category filter works');
  await page.locator('.cats [data-cat="all"]').click();
  await page.locator('#grid .add[data-id="whey"]').click();
  assert.equal(await page.locator('#count').innerText(),'1',size.name+' cart count updates');
  assert.equal(await page.locator('#drawer').getAttribute('aria-hidden'),'false',size.name+' cart drawer opens');
  await page.locator('#close').click();
  await page.screenshot({path:folder+'/'+size.name+'.png',animations:'disabled'});
  await page.locator('.mvn-quick-page[href="contact.html"]').click();
  await page.waitForURL('**/contact.html');
  assert.equal(await page.locator('main .mvn-info-contact-value').count(),2,size.name+' contact page shows phone and email only after being opened');
  assert.ok((await page.locator('main').innerText()).includes('+91 77088 30513'),size.name+' official phone appears on Contact page');
  assert.ok((await page.locator('main').innerText()).includes('maxvolumenutrition@gmail.com'),size.name+' official email appears on Contact page');
  await page.goBack({waitUntil:'domcontentloaded'});
  await page.locator('.mvn-quick-page[href="certificate.html"]').click();
  await page.waitForURL('**/certificate.html');
  assert.ok(await page.locator('.mvn-info-document img').isVisible(),size.name+' full original certificate appears only on certificate page');
  await page.waitForFunction(()=>{const i=document.querySelector('.mvn-info-document img');return i?.complete&&i.naturalWidth>200;});
  await page.goBack({waitUntil:'domcontentloaded'});
  for(const file of ['about.html','offers.html','brands.html']){
    await page.locator('.mvn-quick-page[href="'+file+'"]').click();
    await page.waitForURL('**/'+file);
    assert.equal(await page.locator('main.mvn-info-main').isVisible(),true,size.name+' '+file+' opens its own information page');
    await page.goBack({waitUntil:'domcontentloaded'});
  }
  assert.equal(await page.locator('#grid article.card').count()>=5,true,size.name+' after browsing info pages the working catalogue is restored');

  assert.deepEqual(errors,[],size.name+' unexpected browser Javascript errors');
  console.log('PASS Supplement Store reference '+size.name+' layout, photos, filters, cart and no JS errors');
  await context.close();
 }
} finally {
 await browser?.close();
 if(server.exitCode===null){const done=new Promise(resolve=>server.once('exit',resolve));server.kill();await done;}
 rmSync(dir,{recursive:true,force:true});
}
