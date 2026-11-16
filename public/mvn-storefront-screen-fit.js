'use strict';
// Correct the live storefront when old published visual-editor operations
// shrink or offset structural layout elements. Saved owner edits remain in
// SQLite and editable; this only normalizes the public display.
(()=>{
 const isPublicHome=()=>document.documentElement.dataset.mvnVisualBuilder!=='edit'
  &&document.body?.classList.contains('mvn-showcase-home');
 const set=(el,rule,value)=>el?.style.setProperty(rule,value,'important');
 const rules=(selector,styles)=>{
  const el=document.querySelector(selector);
  if(!el)return;
  for(const [key,value] of Object.entries(styles))set(el,key,value);
 };
 const screenShell={width:'100%','max-width':'none','min-width':'0','margin-left':'0','margin-right':'0','box-sizing':'border-box',transform:'none'};
 function repair(){
  if(!isPublicHome())return;
  const desktop=innerWidth>760;
  // Keep the storefront structural sections in document flow regardless of
  // past drag offsets, fixed widths and 1px heights. Preserve content and images.
  for(const selector of ['.storehead','#mvnEditorial','.mvn-theme-shop-goals','.mvn-preview-best','.mvn-globtech-launch','.mvn-home-contact']){
   rules(selector,screenShell);
  }
  // The actual production bug was a persisted 1091px hero, translated -84px,
  // with a 1002px image. Expanding its parent section alone did not fix it.
  rules('#mvnEditorial',{height:'auto','min-height':'0','padding-left':'0','padding-right':'0',overflow:'visible'});
  rules('#mvnEditorial .mvn-editorial-layout',{
   width:'100%','max-width':'none','min-width':'0',transform:'none',
   'grid-template-columns':'minmax(0,1fr)',gap:'0','padding-left':'0','padding-right':'0',
   'margin-left':'0','margin-right':'0'
  });
  rules('#mvnEditorial .mvn-owner-banner-feature',{
   width:'100%',height:'auto','max-width':'none','max-height':'none',
   'min-width':'0','min-height':desktop?'clamp(28rem,47vw,43rem)':'0',
   transform:'none',margin:'0',padding:'0','box-sizing':'border-box',position:'relative'
  });
  rules('#mvnEditorial .mvn-owner-banner-link',{
   position:desktop?'absolute':'relative',inset:desktop?'0':'auto',
   width:'100%',height:desktop?'100%':'auto','max-width':'none','max-height':'none',
   transform:'none',margin:'0',padding:'0','box-sizing':'border-box'
  });
  rules('#mvnEditorial .mvn-owner-banner-link picture',{display:'block',width:'100%',height:'100%',transform:'none'});
  rules('#mvnEditorial .mvn-owner-banner-img',{
   display:'block',width:'100%',height:'100%','max-width':'none','max-height':'none',
   transform:'none','object-fit':'cover','object-position':'center'
  });
  // The live database also contained fixed 325px/389px sections and a
  // Globe-Tech element at height 1px translated 593px off its actual row.
  for(const selector of ['.mvn-theme-shop-goals','.mvn-preview-best','.mvn-globtech-launch']){
   rules(selector,{height:'auto','max-height':'none',transform:'none'});
  }
  rules('.mvn-theme-shop-goals',{padding:'clamp(20px,3vw,48px) clamp(16px,3vw,56px)'});
  rules('.mvn-theme-shop-goals .mvn-editorial-categories-heading',{width:'100%',height:'auto',transform:'none',position:'relative',inset:'auto'});
  rules('.mvn-theme-shop-goals .mvn-editorial-category-grid',{
   width:'100%',height:'auto','max-width':'none','max-height':'none',transform:'none',
   'grid-template-columns':desktop?'repeat(4,minmax(0,1fr))':'repeat(2,minmax(0,1fr))',
   'grid-template-rows':'auto',gap:desktop?'clamp(10px,1.8vw,25px)':'10px'
  });
  for(const el of document.querySelectorAll('.mvn-theme-shop-goals .mvn-editorial-category-grid > a')){
   for(const [key,value] of Object.entries({position:'relative',left:'auto',right:'auto',top:'auto',bottom:'auto',transform:'none',width:'100%',height:'auto','min-height':'132px','max-width':'none','max-height':'none',margin:'0'}))set(el,key,value);
   for(const label of el.querySelectorAll('strong,small')){set(label,'transform','none');set(label,'position','relative');set(label,'inset','auto');set(label,'height','auto');}
  }
  rules('.mvn-preview-best',{padding:desktop?'clamp(20px,3vw,50px)':'16px'});
  rules('.mvn-preview-best .mvn-preview-best-grid',{width:'100%',height:'auto',transform:'none','grid-template-columns':desktop?'repeat(4,minmax(0,1fr))':'repeat(2,minmax(0,1fr))'});
  for(const el of document.querySelectorAll('.mvn-preview-best .mvn-preview-best-grid > a')){
   set(el,'transform','none');set(el,'height','auto');set(el,'width','100%');
  }
  rules('.mvn-globtech-launch',{
   height:'auto','min-height':desktop?'clamp(330px,33vw,570px)':'0',
   'max-height':'none',transform:'none',position:'relative',
   display:'flex','flex-direction':desktop?'row':'column',
   'align-items':desktop?'center':'flex-start','justify-content':'space-between'
  });
  // Do not modify prices, product records, checkout, accounts or cart state.
 }
 addEventListener('load',repair);
 addEventListener('pageshow',repair);
 addEventListener('resize',repair,{passive:true});
})();
