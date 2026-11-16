'use strict';
(()=>{
const targets={header:'.storehead',hero:'#mvnEditorial',categories:'.mvn-editorial-categories',bestsellers:'.mvn-preview-best',brands:'.mvn-globtech-launch',footer:'.mvn-home-contact',logo:'.storehead .original-brand-logo',banner:'.mvn-owner-banner-img',whey:'.mvn-editorial-category-whey .goal-main',pre:'.mvn-editorial-category-pre .goal-main',creatine:'.mvn-editorial-category-creatine .goal-main',massPromo:'.mvn-editorial-promo-mass img',creatinePromo:'.mvn-editorial-promo-creatine img',bestWhey:'.mvn-preview-best-grid a:nth-child(1) img',bestMass:'.mvn-preview-best-grid a:nth-child(2) img',bestCreatine:'.mvn-preview-best-grid a:nth-child(3) img',bestPre:'.mvn-preview-best-grid a:nth-child(4) img'};
const editing=document.body.dataset.homepageEditor==='true';
const node=id=>document.querySelector(targets[id]);
const style=(selector,property,value)=>document.querySelectorAll(selector).forEach(el=>el.style.setProperty(property,value,'important'));
// Restore original markup/styles between previews so undo and reset are exact.
const originals=[...document.querySelectorAll('body,body *')].map(el=>({el,style:el.getAttribute('style'),hidden:el.hidden}));
const texts={
 heroTitle:'#mvnEditorialTitle',heroDescription:'.mvn-launch-hero-copy > p',heroButton:'.mvn-launch-primary',heroSecondaryButton:'.mvn-launch-secondary',
 categoriesTitle:'#mvnEditorialCategoriesTitle',bestsellersTitle:'#mvnBestSellers',
 announcementText:'.announce > span',
 footerTitle:'.mvn-home-contact h2',footerSubtitle:'.mvn-home-contact p',
 categoryWheyHeadline:'.mvn-editorial-category-whey > strong',categoryWheyCaption:'.mvn-editorial-category-whey > small',
 categoryPreHeadline:'.mvn-editorial-category-pre > strong',categoryPreCaption:'.mvn-editorial-category-pre > small',
 categoryCreatineHeadline:'.mvn-editorial-category-creatine > strong',categoryCreatineCaption:'.mvn-editorial-category-creatine > small',
 categoryMassHeadline:'.mvn-preview-goal-extra > strong',categoryMassCaption:'.mvn-preview-goal-extra > small',
 promoMassTag:'.mvn-editorial-promo-mass .mvn-editorial-promo-overline',promoMassHeadline:'.mvn-editorial-promo-mass > strong',
 promoCreatineTag:'.mvn-editorial-promo-creatine .mvn-editorial-promo-overline',promoCreatineHeadline:'.mvn-editorial-promo-creatine > strong',
 bestWheyTitle:'.mvn-preview-best-grid a:nth-child(1) strong',bestMassTitle:'.mvn-preview-best-grid a:nth-child(2) strong',
 bestCreatineTitle:'.mvn-preview-best-grid a:nth-child(3) strong',bestPreTitle:'.mvn-preview-best-grid a:nth-child(4) strong',
 bestWheyCaption:'.mvn-preview-best-grid a:nth-child(1) small',bestMassCaption:'.mvn-preview-best-grid a:nth-child(2) small',
 bestCreatineCaption:'.mvn-preview-best-grid a:nth-child(3) small',bestPreCaption:'.mvn-preview-best-grid a:nth-child(4) small',
 brandTag:'.mvn-globtech-launch .mvn-launch-kicker',brandTitle:'#mvnGlobTechTitle',
 brandHighlight:'.mvn-globtech-launch > div > strong',brandDescription:'.mvn-globtech-launch > div > p:not(.mvn-launch-kicker)',
 brandButton:'.mvn-globtech-launch > a'
};
const originalText=Object.fromEntries(Object.entries(texts).map(([id,selector])=>[id,document.querySelector(selector)?.innerHTML]));
const originalImages=Object.fromEntries(Object.entries(targets).filter(([,selector])=>document.querySelector(selector)?.tagName==='IMG').map(([id])=>{const image=node(id);return [id,{src:image.getAttribute('src'),srcset:image.getAttribute('srcset'),sources:[...image.parentElement.querySelectorAll('source')].map(source=>[source,source.getAttribute('srcset')])}]}));
const orderAnchor=document.createComment('homepage section order');node('hero')?.before(orderAnchor);
let current={version:2,fields:{},order:['hero','categories','bestsellers','brands']};
function apply(design){
 if(!design||design.version!==2)return;
 current=design;const f=design.fields||{};
 for(const {el,style:initial,hidden} of originals){if(initial===null)el.removeAttribute('style');else el.setAttribute('style',initial);el.hidden=hidden;}
 for(const [id,markup] of Object.entries(originalText)){const el=document.querySelector(texts[id]);if(el&&markup!==undefined)el.innerHTML=markup;}
 for(const [id,original] of Object.entries(originalImages)){const img=node(id);img.src=original.src;if(original.srcset)img.setAttribute('srcset',original.srcset);else img.removeAttribute('srcset');for(const [source,srcset] of original.sources)if(srcset)source.setAttribute('srcset',srcset);}
 // Move the existing sections, retaining their event listeners and links.
 let previous=orderAnchor;
 for(const id of design.order||[]){const el=node(id);if(el){previous.after(el);previous=el;}}
 for(const [key,selector] of Object.entries(texts))if(Object.hasOwn(f,key)){
  const el=document.querySelector(selector);
  if(!el)continue;
  if(key==='announcementText'){
   // Keep the decorative live-dot and only edit its label.
   const dot=el.querySelector('.live-dot');el.replaceChildren(...(dot?[dot]:[]),document.createTextNode(' '+f[key]));
  }else if(key==='heroButton'||key==='heroSecondaryButton'||key==='brandButton'){
   const suffix=el.querySelector('[aria-hidden="true"]');el.replaceChildren(document.createTextNode(f[key]+' '),...(suffix?[suffix]:[]));
  }else el.textContent=f[key];
  el.style.whiteSpace='pre-line';
 }
 for(const id of Object.keys(originalImages))if(f[id+'Image']){const img=node(id);img.removeAttribute('srcset');img.parentElement.querySelectorAll('source').forEach(source=>source.removeAttribute('srcset'));img.src='/'+f[id+'Image'];}
 for(const id of ['hero','categories','bestsellers','brands'])if(Object.hasOwn(f,id+'Visible'))style(targets[id],'display',f[id+'Visible']?'block':'none');
 if(Object.hasOwn(f,'heroTextVisible'))style('.mvn-launch-hero-copy','display',f.heroTextVisible?'block':'none');
 if(Object.hasOwn(f,'navVisible'))style('.mvn-preview-nav','display',f.navVisible?'flex':'none');
 if(Object.hasOwn(f,'promoVisible'))style('.mvn-editorial-promos','display',f.promoVisible?'grid':'none');
 if(Object.hasOwn(f,'goalPhotosVisible')){
  style('.mvn-theme-goal-art','display',f.goalPhotosVisible?'grid':'none');
  if(f.goalPhotosVisible&&!Object.hasOwn(f,'categoryCardHeight'))style('.mvn-editorial-category','min-height','240px');
 }
 if(f.categoryCardHeight)style('.mvn-editorial-category, .mvn-preview-goal-extra','min-height',f.categoryCardHeight+'px');
 if(Object.hasOwn(f,'categoryGap'))style('.mvn-editorial-category-grid','gap',f.categoryGap+'px');
 if(f.bestImageHeight)style('.mvn-preview-best-grid img','height',f.bestImageHeight+'px');
 if(f.footerColor)style('.mvn-home-contact','background-color',f.footerColor);
 if(f.footerText)style('.mvn-home-contact, .mvn-home-contact a, .mvn-home-contact p','color',f.footerText);
 if(f.categoryCardColor)style('.mvn-editorial-category, .mvn-preview-goal-extra','background-color',f.categoryCardColor);
 if(f.descriptionSize)style('.mvn-launch-hero-copy > p','font-size',f.descriptionSize+'px');
 if(f.heroCopyWidth)style('.mvn-launch-hero-copy','width',f.heroCopyWidth+'%');
 if(f.heroAlign){
  style('.mvn-launch-hero-copy','text-align',f.heroAlign);
  style('.mvn-launch-hero-actions','justify-content',f.heroAlign==='center'?'center':f.heroAlign==='right'?'flex-end':'flex-start');
 }
 if(f.headerColor)style(targets.header,'background',f.headerColor);
 if(f.headerText){style('.storehead,.storehead a,.storehead button,.storehead summary','color',f.headerText);style('.storehead svg','color',f.headerText);}
 if(f.pageColor)style('body','background',f.pageColor);
 if(f.accentColor){style('.mvn-launch-primary','background',f.accentColor);style('#mvnEditorialTitle em','color',f.accentColor);}
 if(f.logoWidth){style('.storehead .brand-identity','width',`min(${f.logoWidth}px, 55vw)`);style('.storehead .brand-identity','flex','0 1 auto');style(targets.logo,'width','100%');style(targets.logo,'height','100%');style(targets.logo,'max-width','100%');style(targets.logo,'max-height','100%');style(targets.logo,'object-fit','contain');}
 if(f.logoAlign==='center'){style(targets.header,'justify-content','center');style('.storehead .brand-identity','margin-inline','auto');}
 if(f.logoAlign==='left'){style(targets.header,'justify-content','space-between');style('.storehead .brand-identity','margin-inline','0');}
 if(f.headerHeight){style(targets.header,'min-height',f.headerHeight+'px');style('.storehead .brand-identity','height',Math.max(32,f.headerHeight-20)+'px');}
 if(Object.hasOwn(f,'sectionGap'))for(const id of ['hero','categories','bestsellers','brands'])style(targets[id],'margin-bottom',f.sectionGap+'px');
 if(f.heroFullWidth){
  style('#mvnEditorial','box-sizing','border-box');
  style('#mvnEditorial','width','100vw');
  style('#mvnEditorial','max-width','none');
  style('#mvnEditorial','margin-left','calc(50% - 50vw)');
  style('#mvnEditorial','margin-right','0');
  style('#mvnEditorial','padding-left','0');
  style('#mvnEditorial','padding-right','0');
  style('#mvnEditorial .mvn-editorial-layout','width','100%');
  style('#mvnEditorial .mvn-editorial-layout','max-width','none');
  style('#mvnEditorial .mvn-owner-banner-feature','width','100%');
  style('#mvnEditorial .mvn-owner-banner-link','width','100%');
  style('#mvnEditorial .mvn-owner-banner-link picture','width','100%');
 }
 if(Object.hasOwn(f,'heroTextX')||Object.hasOwn(f,'heroTextY'))style('.mvn-launch-hero-copy','transform','translate('+(f.heroTextX??0)+'%, '+(f.heroTextY??0)+'%)');
  if(f.bannerHeight){style('.mvn-owner-banner-feature','height',f.bannerHeight+'px');style('.mvn-owner-banner-feature','min-height',f.bannerHeight+'px');}
 if(f.bannerHeightMobile&&matchMedia('(max-width:760px)').matches){
  style('.mvn-owner-banner-feature','min-height','0');
  style('.mvn-owner-banner-link','height',f.bannerHeightMobile+'px');
  style('.mvn-owner-banner-link','aspect-ratio','auto');
  style('.mvn-owner-banner-link picture','height','100%');
 }
 if(f.bannerFit)style(targets.banner,'object-fit',f.bannerFit);
 if(Object.hasOwn(f,'bannerPosition')||Object.hasOwn(f,'bannerPositionY'))style(targets.banner,'object-position',(f.bannerPosition??50)+'% '+(f.bannerPositionY??50)+'%');
 if(f.titleSize)style('#mvnEditorialTitle','font-size',`clamp(24px, ${f.titleSize/14}vw, ${f.titleSize}px)`);
 if(f.imageScale)for(const id of ['whey','pre','creatine','bestWhey','bestMass','bestCreatine','bestPre']){style(targets[id],'object-fit','contain');style(targets[id],'scale',String(f.imageScale/100));}
 // Photo editing controls operate independently for every existing homepage image.
 // CSS transforms change presentation only; the original uploaded image is never rewritten.
 for(const id of Object.keys(originalImages)){
  const zoomKey=id+'Zoom',xKey=id+'X',yKey=id+'Y',fitKey=id+'Fit';
  if(Object.hasOwn(f,fitKey))style(targets[id],'object-fit',f[fitKey]);
  if(Object.hasOwn(f,zoomKey)||Object.hasOwn(f,xKey)||Object.hasOwn(f,yKey)){
   const zoom=f[zoomKey]??100,x=f[xKey]??0,y=f[yKey]??0;
   style(targets[id],'transform',`translate(${x}%, ${y}%) scale(${zoom/100})`);
   style(targets[id],'transform-origin','center center');
  }
 }
}
try{const published=JSON.parse(document.getElementById('mvnHomepageDesign')?.textContent||'null');if(published)apply(published);}catch(error){console.error('Homepage design could not be applied',error);}
if(!editing)return;
const outline=document.createElement('style');
outline.textContent='[data-homepage-selected]{outline:3px solid #ff6844!important;outline-offset:-3px!important}body[data-homepage-editor="true"] .mvn-owner-banner-img,body[data-homepage-editor="true"] .original-brand-logo,body[data-homepage-editor="true"] .mvn-editorial-category img,body[data-homepage-editor="true"] .mvn-editorial-promo img,body[data-homepage-editor="true"] .mvn-preview-best-grid img{cursor:grab!important;touch-action:none!important;user-select:none!important}body[data-homepage-editor="true"] .mvn-launch-hero-copy h1{cursor:move!important;touch-action:none!important}#mvn-drag-handle{position:absolute;display:none;z-index:2147483640;width:32px;height:32px;border-radius:8px;background:#ed6545;border:3px solid white;box-shadow:0 4px 18px #0008;cursor:nwse-resize;touch-action:none;align-items:center;justify-content:center;font:900 22px system-ui;color:#fff}#mvn-drag-handle::after{content:"↘"}#mvn-drag-guide{position:fixed;bottom:12px;left:12px;z-index:2147483639;background:#121a20e6;border:1px solid #ff8b64;color:#fff;padding:7px 10px;border-radius:6px;font:700 12px system-ui;pointer-events:none;max-width:250px}';
document.head.append(outline);
const dragHandle=document.createElement('div');
dragHandle.id='mvn-drag-handle';dragHandle.setAttribute('role','button');dragHandle.setAttribute('aria-label','Drag to resize selected photo');
dragHandle.title='Drag this corner to resize photo';document.body.append(dragHandle);
const dragGuide=document.createElement('div');dragGuide.id='mvn-drag-guide';dragGuide.textContent='Drag photos to move · Drag orange corner to resize · Click text to edit';document.body.append(dragGuide);
let selected='header', gesture=null;
const availableImages=Object.keys(originalImages);
function placeHandle(){
 const target=availableImages.includes(selected)?node(selected):null;
 if(!target||!target.getClientRects().length||getComputedStyle(target).display==='none'){dragHandle.style.display='none';return;}
 const rect=target.getBoundingClientRect();
 dragHandle.style.display='flex';
 dragHandle.style.left=(rect.right+scrollX-17)+'px';
 dragHandle.style.top=(rect.bottom+scrollY-17)+'px';
}
addEventListener('scroll',placeHandle,{passive:true});addEventListener('resize',placeHandle,{passive:true});
document.addEventListener('dragstart',event=>{if(availableImages.some(id=>node(id)===event.target))event.preventDefault()},true);
const clamp=(n,min,max)=>Math.round(Math.max(min,Math.min(max,n)));
function startGesture(event){
 if(event.button!==0&&event.pointerType==='mouse')return;
 const resize=event.target===dragHandle;
 const imageId=resize?selected:availableImages.find(id=>node(id)===event.target);
 const textDrag=!imageId&&(event.target.closest?.('.mvn-launch-hero-copy h1')||event.target.closest?.('.mvn-launch-hero-copy > p'));
 if(!imageId&&!textDrag)return;
 const id=textDrag?'heroText':imageId;
 const target=textDrag?document.querySelector('.mvn-launch-hero-copy'):node(id);
 if(!target)return;
 event.preventDefault();event.stopPropagation();
 const rect=target.getBoundingClientRect();const f=current.fields||{};
 selected=id==='heroText'?'hero':id;select(selected);
 parent.postMessage({type:'mvn-selected',id:selected},location.origin);
 gesture={pointerId:event.pointerId,id,resize,x:event.clientX,y:event.clientY,
  width:Math.max(1,rect.width),height:Math.max(1,rect.height),
  initialX:f[id+'X']??0,initialY:f[id+'Y']??0,initialZoom:f[id+'Zoom']??100,
  changed:false,target};
 dragGuide.textContent=resize?'Drag orange corner to resize · Release to keep changes':'Move the selected element · Release to keep changes';
}
document.addEventListener('pointerdown',startGesture,true);
function moveGesture(event){
 if(!gesture||event.pointerId!==gesture.pointerId)return;
 event.preventDefault();
 const g=gesture,dx=event.clientX-g.x,dy=event.clientY-g.y;
 if(Math.abs(dx)+Math.abs(dy)<2&&!g.changed)return;
 g.changed=true;
 let patch;
 if(g.resize){
  const zoom=clamp(g.initialZoom+(dx/g.width+dy/g.height)*90,50,250);
  patch={[g.id+'Zoom']:zoom};
  g.target.style.setProperty('transform','translate('+g.initialX+'%, '+g.initialY+'%) scale('+(zoom/100)+')','important');
 }else{
  const x=clamp(g.initialX+dx/g.width*100,-100,100),y=clamp(g.initialY+dy/g.height*100,-100,100);
  patch={[g.id+'X']:x,[g.id+'Y']:y};
  g.target.style.setProperty('transform','translate('+x+'%, '+y+'%)'+(g.id==='heroText'?'':' scale('+(g.initialZoom/100)+')'),'important');
 }
 g.patch=patch;placeHandle();
}
document.addEventListener('pointermove',moveGesture,{capture:true,passive:false});
function finishGesture(event){
 if(!gesture||event.pointerId!==gesture.pointerId)return;
 const g=gesture;gesture=null;dragGuide.textContent='Drag photos to move · Drag orange corner to resize · Click text to edit';
 if(g.changed&&g.patch)parent.postMessage({type:'mvn-drag-commit',id:g.id,patch:g.patch},location.origin);
 placeHandle();
}
document.addEventListener('pointerup',finishGesture,true);document.addEventListener('pointercancel',finishGesture,true);
function select(id){selected=id;document.querySelectorAll('[data-homepage-selected]').forEach(el=>el.removeAttribute('data-homepage-selected'));node(id)?.setAttribute('data-homepage-selected','');requestAnimationFrame(placeHandle);}
addEventListener('message',event=>{if(event.origin!==location.origin||event.source!==parent)return;if(event.data?.type==='mvn-design'){apply(event.data.design);select(event.data.selection);}if(event.data?.type==='mvn-select'){select(event.data.id);node(event.data.id)?.scrollIntoView({behavior:'smooth',block:'center'});}});
document.addEventListener('click',event=>{event.preventDefault();event.stopImmediatePropagation();let selected=Object.keys(originalImages).find(id=>node(id)?.contains(event.target));if(!selected)selected=['header','hero','categories','bestsellers','brands','footer'].find(id=>node(id)?.contains(event.target));if(selected){select(selected);parent.postMessage({type:'mvn-selected',id:selected},location.origin);}},true);
const baseline={};for(const [id,selector] of Object.entries(texts))baseline[id]=document.querySelector(selector)?.textContent?.trim()||'';
for(const id of Object.keys(originalImages))baseline[id+'Image']=node(id).getAttribute('src').replace(/^\//,'');
for(const id of Object.keys(originalImages)){
 baseline[id+'Zoom']=100;baseline[id+'X']=0;baseline[id+'Y']=0;baseline[id+'Fit']=id==='banner'?'cover':'contain';
}
baseline.bannerPositionY=50;baseline.bannerZoom=100;baseline.heroFullWidth=true;baseline.heroTextX=0;baseline.heroTextY=0;baseline.bannerHeightMobile=320;
baseline.descriptionSize=Math.round(parseFloat(getComputedStyle(document.querySelector('.mvn-launch-hero-copy > p')).fontSize))||16;
baseline.heroCopyWidth=92;baseline.heroAlign='left';
baseline.categoryCardHeight=130;baseline.categoryGap=12;baseline.bestImageHeight=180;
baseline.footerColor='#151617';baseline.footerText='#ffffff';baseline.categoryCardColor='#ffffff';
baseline.promoVisible=getComputedStyle(document.querySelector('.mvn-editorial-promos')).display!=='none';
baseline.goalPhotosVisible=getComputedStyle(document.querySelector('.mvn-theme-goal-art')).display!=='none';
baseline.headerColor='#151617';baseline.headerText='#ffffff';baseline.pageColor='#ffffff';baseline.accentColor='#ff6449';baseline.logoWidth=Math.round(node('logo').getBoundingClientRect().width);baseline.headerHeight=Math.round(node('header').getBoundingClientRect().height);baseline.sectionGap=24;baseline.bannerHeight=Math.round(node('banner').getBoundingClientRect().height);baseline.bannerPosition=70;baseline.titleSize=80;baseline.imageScale=100;baseline.bannerFit='cover';baseline.logoAlign='left';
for(const id of ['hero','categories','bestsellers','brands'])baseline[id+'Visible']=getComputedStyle(node(id)).display!=='none';baseline.heroTextVisible=getComputedStyle(document.querySelector('.mvn-launch-hero-copy')).display!=='none';baseline.navVisible=getComputedStyle(document.querySelector('.mvn-preview-nav')).display!=='none';
parent.postMessage({type:'mvn-ready',baseline},location.origin);
})();
