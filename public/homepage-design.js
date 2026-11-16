'use strict';
(()=>{
const targets={header:'.storehead',hero:'#mvnEditorial',categories:'.mvn-editorial-categories',bestsellers:'.mvn-preview-best',brands:'.mvn-globtech-launch',footer:'.mvn-home-contact',logo:'.storehead .original-brand-logo',banner:'.mvn-owner-banner-img',whey:'.mvn-editorial-category-whey .goal-main',pre:'.mvn-editorial-category-pre .goal-main',creatine:'.mvn-editorial-category-creatine .goal-main',massPromo:'.mvn-editorial-promo-mass img',creatinePromo:'.mvn-editorial-promo-creatine img',bestWhey:'.mvn-preview-best-grid a:nth-child(1) img',bestMass:'.mvn-preview-best-grid a:nth-child(2) img',bestCreatine:'.mvn-preview-best-grid a:nth-child(3) img',bestPre:'.mvn-preview-best-grid a:nth-child(4) img'};
const editing=document.body.dataset.homepageEditor==='true';
const node=id=>document.querySelector(targets[id]);
const style=(selector,property,value)=>document.querySelectorAll(selector).forEach(el=>el.style.setProperty(property,value,'important'));
// Restore original markup/styles between previews so undo and reset are exact.
const originals=[...document.querySelectorAll('body,body *')].map(el=>({el,style:el.getAttribute('style'),hidden:el.hidden}));
const texts={heroTitle:'#mvnEditorialTitle',heroDescription:'.mvn-launch-hero-copy > p',heroButton:'.mvn-launch-primary',categoriesTitle:'#mvnEditorialCategoriesTitle',bestsellersTitle:'#mvnBestSellers',footerTitle:'.mvn-home-contact h2'};
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
 for(const [key,selector] of Object.entries(texts))if(Object.hasOwn(f,key)){const el=document.querySelector(selector);if(el){el.textContent=f[key];el.style.whiteSpace='pre-line';}}
 for(const id of Object.keys(originalImages))if(f[id+'Image']){const img=node(id);img.removeAttribute('srcset');img.parentElement.querySelectorAll('source').forEach(source=>source.removeAttribute('srcset'));img.src='/'+f[id+'Image'];}
 for(const id of ['hero','categories','bestsellers','brands'])if(Object.hasOwn(f,id+'Visible'))style(targets[id],'display',f[id+'Visible']?'block':'none');
 if(Object.hasOwn(f,'heroTextVisible'))style('.mvn-launch-hero-copy','display',f.heroTextVisible?'block':'none');
 if(Object.hasOwn(f,'navVisible'))style('.mvn-preview-nav','display',f.navVisible?'flex':'none');
 if(f.headerColor)style(targets.header,'background',f.headerColor);
 if(f.headerText){style('.storehead,.storehead a,.storehead button,.storehead summary','color',f.headerText);style('.storehead svg','color',f.headerText);}
 if(f.pageColor)style('body','background',f.pageColor);
 if(f.accentColor){style('.mvn-launch-primary','background',f.accentColor);style('#mvnEditorialTitle em','color',f.accentColor);}
 if(f.logoWidth){style('.storehead .brand-identity','width',`min(${f.logoWidth}px, 55vw)`);style('.storehead .brand-identity','flex','0 1 auto');style(targets.logo,'width','100%');style(targets.logo,'height','100%');style(targets.logo,'max-width','100%');style(targets.logo,'max-height','100%');style(targets.logo,'object-fit','contain');}
 if(f.logoAlign==='center'){style(targets.header,'justify-content','center');style('.storehead .brand-identity','margin-inline','auto');}
 if(f.logoAlign==='left'){style(targets.header,'justify-content','space-between');style('.storehead .brand-identity','margin-inline','0');}
 if(f.headerHeight){style(targets.header,'min-height',f.headerHeight+'px');style('.storehead .brand-identity','height',Math.max(32,f.headerHeight-20)+'px');}
 if(Object.hasOwn(f,'sectionGap'))for(const id of ['hero','categories','bestsellers','brands'])style(targets[id],'margin-bottom',f.sectionGap+'px');
 if(f.bannerHeight){style('.mvn-owner-banner-feature','height',f.bannerHeight+'px');style('.mvn-owner-banner-feature','min-height',f.bannerHeight+'px');}
 if(f.bannerFit)style(targets.banner,'object-fit',f.bannerFit);
 if(Object.hasOwn(f,'bannerPosition'))style(targets.banner,'object-position',f.bannerPosition+'% center');
 if(f.titleSize)style('#mvnEditorialTitle','font-size',`clamp(24px, ${f.titleSize/14}vw, ${f.titleSize}px)`);
 if(f.imageScale)for(const id of ['whey','pre','creatine','bestWhey','bestMass','bestCreatine','bestPre']){style(targets[id],'object-fit','contain');style(targets[id],'scale',String(f.imageScale/100));}
}
try{const published=JSON.parse(document.getElementById('mvnHomepageDesign')?.textContent||'null');if(published)apply(published);}catch(error){console.error('Homepage design could not be applied',error);}
if(!editing)return;
const outline=document.createElement('style');outline.textContent='[data-homepage-selected]{outline:3px solid #ff6844!important;outline-offset:-3px!important}';document.head.append(outline);
function select(id){document.querySelectorAll('[data-homepage-selected]').forEach(el=>el.removeAttribute('data-homepage-selected'));node(id)?.setAttribute('data-homepage-selected','');}
addEventListener('message',event=>{if(event.origin!==location.origin||event.source!==parent)return;if(event.data?.type==='mvn-design'){apply(event.data.design);select(event.data.selection);}if(event.data?.type==='mvn-select'){select(event.data.id);node(event.data.id)?.scrollIntoView({behavior:'smooth',block:'center'});}});
document.addEventListener('click',event=>{event.preventDefault();event.stopImmediatePropagation();let selected=Object.keys(originalImages).find(id=>node(id)?.contains(event.target));if(!selected)selected=['header','hero','categories','bestsellers','brands','footer'].find(id=>node(id)?.contains(event.target));if(selected){select(selected);parent.postMessage({type:'mvn-selected',id:selected},location.origin);}},true);
const baseline={};for(const [id,selector] of Object.entries(texts))baseline[id]=document.querySelector(selector)?.textContent?.trim()||'';
for(const id of Object.keys(originalImages))baseline[id+'Image']=node(id).getAttribute('src').replace(/^\//,'');
baseline.headerColor='#151617';baseline.headerText='#ffffff';baseline.pageColor='#ffffff';baseline.accentColor='#ff6449';baseline.logoWidth=Math.round(node('logo').getBoundingClientRect().width);baseline.headerHeight=Math.round(node('header').getBoundingClientRect().height);baseline.sectionGap=24;baseline.bannerHeight=Math.round(node('banner').getBoundingClientRect().height);baseline.bannerPosition=70;baseline.titleSize=80;baseline.imageScale=100;baseline.bannerFit='cover';baseline.logoAlign='left';
for(const id of ['hero','categories','bestsellers','brands'])baseline[id+'Visible']=getComputedStyle(node(id)).display!=='none';baseline.heroTextVisible=getComputedStyle(document.querySelector('.mvn-launch-hero-copy')).display!=='none';baseline.navVisible=getComputedStyle(document.querySelector('.mvn-preview-nav')).display!=='none';
parent.postMessage({type:'mvn-ready',baseline},location.origin);
})();
