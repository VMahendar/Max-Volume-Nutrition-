// Only whitelisted homepage presentation fields are persisted. No prices, orders or checkout settings.
export const homepageTargets={
 header:'.storehead',hero:'#mvnEditorial',categories:'.mvn-editorial-categories',bestsellers:'.mvn-preview-best',brands:'.mvn-globtech-launch',footer:'.mvn-home-contact',
 logo:'.storehead .original-brand-logo',banner:'.mvn-owner-banner-img',
 whey:'.mvn-editorial-category-whey .goal-main',pre:'.mvn-editorial-category-pre .goal-main',creatine:'.mvn-editorial-category-creatine .goal-main',
 massPromo:'.mvn-editorial-promo-mass img',creatinePromo:'.mvn-editorial-promo-creatine img',
 bestWhey:'.mvn-preview-best-grid a:nth-child(1) img',bestMass:'.mvn-preview-best-grid a:nth-child(2) img',bestCreatine:'.mvn-preview-best-grid a:nth-child(3) img',bestPre:'.mvn-preview-best-grid a:nth-child(4) img'
};
export const homepageOrder=['hero','categories','bestsellers','brands'];
export const editableHomepageImages=['logo','banner','whey','pre','creatine','massPromo','creatinePromo','bestWhey','bestMass','bestCreatine','bestPre'];
export function validateHomepageDesign(value,validImage){
 if(!value||value.version!==2||!Array.isArray(value.order)||value.order.length!==4||new Set(value.order).size!==4||value.order.some(id=>!homepageOrder.includes(id)))throw Error('Invalid homepage section order.');
 const fields=value.fields;
 if(!fields||typeof fields!=='object'||Array.isArray(fields))throw Error('Invalid homepage controls.');
 const text={
  heroTitle:120,heroDescription:350,heroButton:70,heroSecondaryButton:70,announcementText:90,
  categoriesTitle:90,bestsellersTitle:90,footerTitle:100,footerSubtitle:240,
  categoryWheyHeadline:85,categoryWheyCaption:65,categoryPreHeadline:85,categoryPreCaption:65,
  categoryCreatineHeadline:85,categoryCreatineCaption:65,categoryMassHeadline:85,categoryMassCaption:65,
  promoMassTag:65,promoMassHeadline:85,promoCreatineTag:65,promoCreatineHeadline:85,
  bestWheyTitle:85,bestMassTitle:85,bestCreatineTitle:85,bestPreTitle:85,
  bestWheyCaption:65,bestMassCaption:65,bestCreatineCaption:65,bestPreCaption:65,
  brandTag:85,brandTitle:90,brandHighlight:120,brandDescription:260,brandButton:70
 };
 const colors=['headerColor','headerText','pageColor','accentColor','footerColor','footerText','categoryCardColor'];
 const ranges={
  logoWidth:[70,480],headerHeight:[48,180],sectionGap:[0,100],bannerHeight:[180,1100],
  bannerPosition:[0,100],bannerPositionY:[0,100],bannerZoom:[50,250],bannerHeightMobile:[180,900],heroTextX:[-100,100],heroTextY:[-100,100],
  titleSize:[24,140],descriptionSize:[12,36],imageScale:[40,220],
  heroCopyWidth:[25,100],categoryCardHeight:[90,480],bestImageHeight:[80,480],
  categoryGap:[0,50]
 };
 for(const id of editableHomepageImages){
  ranges[id+'Zoom']=[50,250];
  ranges[id+'X']=[-100,100];
  ranges[id+'Y']=[-100,100];
 }
 const booleans=['heroVisible','categoriesVisible','bestsellersVisible','brandsVisible','heroTextVisible','navVisible','promoVisible','goalPhotosVisible','heroFullWidth'];
 const output={};
 for(const [key,item] of Object.entries(fields)){
  if(Object.hasOwn(text,key)){if(typeof item!=='string'||item.length>text[key])throw Error('Invalid '+key);output[key]=item;}
  else if(colors.includes(key)){if(typeof item!=='string'||!/^#[a-f\d]{6}$/i.test(item))throw Error('Invalid colour.');output[key]=item;}
  else if(Object.hasOwn(ranges,key)){const [min,max]=ranges[key];if(!Number.isInteger(item)||item<min||item>max)throw Error('Invalid dimension: '+key);output[key]=item;}
  else if(booleans.includes(key)){if(typeof item!=='boolean')throw Error('Invalid visibility.');output[key]=item;}
  else if(key==='bannerFit'||editableHomepageImages.some(id=>key===id+'Fit')){if(!['contain','cover'].includes(item))throw Error('Invalid image fit.');output[key]=item;}
  else if(key==='heroAlign'){if(!['left','center','right'].includes(item))throw Error('Invalid hero alignment.');output[key]=item;}
  else if(key==='logoAlign'){if(!['left','center'].includes(item))throw Error('Invalid logo alignment.');output[key]=item;}
  else if(editableHomepageImages.some(id=>key===id+'Image')){if(typeof item!=='string'||!validImage(item))throw Error('Invalid image.');output[key]=item;}
  else throw Error('Unknown homepage setting: '+key);
 }
 return {version:2,fields:output,order:[...value.order]};
}
