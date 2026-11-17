'use strict';
// Correct the live storefront when old published visual-editor operations
// shrink or offset structural layout elements. Saved owner edits remain in
// SQLite and editable; this only normalizes the public display.
(()=>{
 const isPublicHome=()=>document.documentElement.dataset.mvnVisualBuilder!=='edit'
  &&new URLSearchParams(location.search).get('homepage_editor')!=='1'
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
  const desktop=innerWidth>760 && (screen.width>760 || !('ontouchstart' in window));
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
  const editedHomepage=document.getElementById('mvnHomepageDesign');
  let savedHomepage=null;try{savedHomepage=JSON.parse(editedHomepage?.textContent||'null');}catch{}
  const authorZoom=savedHomepage?.fields?.bannerZoom;
  rules('#mvnEditorial .mvn-owner-banner-img',{
   display:'block',width:'100%',height:'100%','max-width':'none','max-height':'none',
   ...(authorZoom?{}:{transform:'none'}),'object-fit':'cover','object-position':'center'
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
  // Production audit found a 161px-tall logo moved 51px, and the actions
  // translated -84px inside a broken 3-column header grid. Normalize the
  // structural chrome on both desktop and mobile, without changing its links.
  const header=document.querySelector('.storehead');
  if(header){
   for(const [k,v] of Object.entries({
    display:'grid','grid-template-columns':'minmax(0,1fr) auto',
    'grid-template-rows':desktop?'72px':'62px 42px',
    'align-items':'center',gap:'0 12px',height:'auto',
    'min-height':desktop?'78px':'104px',
    padding:desktop?'5px clamp(16px,3vw,42px)':'3px 12px 2px'
   }))set(header,k,v);
  }
  rules('.storehead .brand-identity',{
   width:desktop?'250px':'190px',height:desktop?'68px':'57px',
   'min-width':'0','max-width':'100%',margin:'0',padding:'0',
   transform:'none',position:'relative','grid-column':'1','grid-row':'1',
   'justify-self':'start','align-self':'center'
  });
  rules('.storehead .original-brand-logo',{
   width:'100%',height:'100%','max-width':'100%','max-height':'100%',
   transform:'none',margin:'0',padding:'0','object-fit':'contain',
   'object-position':'left center',display:'block'
  });
  rules('.storehead .head-actions',{
   display:'flex',width:'auto',height:'auto','max-width':'100%',
   transform:'none',position:'relative','grid-column':'2',
   'grid-row':'1','justify-self':'end','align-self':'center',
   'justify-content':'flex-end','align-items':'center',
   gap:desktop?'8px':'4px',margin:'0',padding:'0'
  });
  rules('.storehead .mvn-preview-nav',{
   display:desktop?'none':'flex',width:desktop?'auto':'100%',
   height:desktop?'auto':'42px',transform:'none',
   'grid-column':desktop?'auto':'1 / -1','grid-row':desktop?'auto':'2',
   'justify-self':'stretch','justify-content':'center',
   'align-self':'center',margin:'0',padding:'0'
  });

  // Production footer had display:none on its entire inner wrapper,
  // producing an empty strip. Restore readable store/support links.
  rules('.mvn-home-contact',{
   display:'block',height:'auto','min-height':'0','max-height':'none',
   transform:'none',overflow:'visible',margin:'0',
   padding:desktop?'30px clamp(18px,4vw,60px) 24px':'24px 18px',
   'box-sizing':'border-box'
  });
  rules('.mvn-home-contact .mvn-home-contact-inner',{
   display:'grid',width:'100%',height:'auto','max-width':'1440px',
   'min-width':'0',transform:'none',overflow:'visible',
   'grid-template-columns':desktop?'minmax(200px,1.4fr) repeat(3,minmax(135px,1fr))':'repeat(2,minmax(0,1fr))',
   gap:desktop?'20px 28px':'20px 14px',margin:'0 auto',padding:'0',
   'align-items':'start','box-sizing':'border-box'
  });
  for(const el of document.querySelectorAll('.mvn-home-contact-inner > *')){
   for(const [k,v] of Object.entries({
    display:'block',position:'relative',transform:'none',width:'auto',
    height:'auto','max-width':'none','max-height':'none',margin:'0',
    padding:'0',overflow:'visible','font-size':'14px',opacity:'1'
   }))set(el,k,v);
  }
  for(const el of document.querySelectorAll('.mvn-home-contact nav')){
   set(el,'display','flex');set(el,'flex-direction','column');
   set(el,'align-items','flex-start');set(el,'gap','8px');
   set(el,'justify-content','flex-start');set(el,'transform','none');
  }
  for(const el of document.querySelectorAll('.mvn-home-contact h2,.mvn-home-contact h3,.mvn-home-contact p,.mvn-home-contact a,.mvn-home-contact small')){
   set(el,'display',el.tagName==='A'?'inline-flex':'block');
   set(el,'transform','none');set(el,'position','relative');
   set(el,'inset','auto');set(el,'height','auto');set(el,'opacity','1');
   set(el,'font-size',el.tagName==='H2'?'clamp(18px,1.8vw,24px)':el.tagName==='H3'?'13px':el.tagName==='SMALL'?'12px':'14px');
  }
  // The Globe-Tech copy was translated 417px above the section, leaving
  // a giant blank panel despite the section itself being full width.
  rules('.mvn-globtech-launch',{
   'min-height':desktop?'clamp(250px,24vw,360px)':'200px',
   padding:desktop?'32px clamp(18px,4vw,60px)':'26px 18px',
   gap:desktop?'28px':'14px',margin:'0'
  });
  rules('.mvn-globtech-launch > div',{
   transform:'none',position:'relative',inset:'auto',
   width:'auto',height:'auto','max-width':'900px',
   'max-height':'none',margin:'0',padding:'0',opacity:'1','font-size':'14px'
  });
  for(const el of document.querySelectorAll('.mvn-globtech-launch h2,.mvn-globtech-launch p,.mvn-globtech-launch strong')){
   set(el,'transform','none');set(el,'position','relative');
   set(el,'inset','auto');set(el,'height','auto');set(el,'opacity','1');
   if(el.tagName==='H2')set(el,'font-size','clamp(26px,3.8vw,48px)');
   else set(el,'font-size','14px');
  }
  // Correct existing sections only. The approved hero/banner markup and its
  // authored image/crop settings are deliberately left untouched.
  rules('.storehead',{
    display:'flex','flex-direction':'row','flex-wrap':'nowrap','align-items':'center',
    'justify-content':'space-between',height:desktop?'76px':'64px',
    'min-height':desktop?'76px':'64px',
    padding:desktop?'8px 30px':'7px 12px',
    'grid-template-columns':'none','grid-template-rows':'none',
    background:'#171b1f',gap:'8px'
  });
  rules('.storehead .brand-identity',{
    width:'auto',height:desktop?'58px':'47px',
    'max-width':desktop?'300px':'calc(100% - 168px)',
    'min-width':'0','grid-column':'auto','grid-row':'auto',
    'flex-grow':'1','flex-shrink':'1','flex-basis':'auto',
    'align-self':'center',transform:'none'
  });
  rules('.storehead .head-actions',{
    'grid-column':'auto','grid-row':'auto','max-width':'none',
    'flex-grow':'0','flex-shrink':'0',
    'align-self':'center',position:'relative',transform:'none',
    display:'flex',gap:desktop?'8px':'4px'
  });
  rules('.storehead .mvn-preview-nav',{display:'none'});
  rules('.mvn-theme-main-nav',{display:'none'});
  rules('.storehead .head-actions > .wa',{display:'none'});
  rules('.storehead .mvn-header-email',{display:'none'});
  for(const selector of ['.storehead .head-actions .account-link span','.storehead #bag > span','.storehead .mvn-header-wordmark','.announce']){
    for(const e of document.querySelectorAll(selector))set(e,'display','none');
  }
  for(const e of document.querySelectorAll('.storehead .head-actions summary,.storehead .head-actions .account-link,.storehead #bag')){
    set(e,'min-height','38px');set(e,'min-width','35px');
    set(e,'padding','5px');set(e,'margin','0');
    set(e,'background','#24292e');set(e,'color','#fff');
  }
  rules('.mvn-theme-shop-goals',{
    display:'block',position:'relative',height:'auto','min-height':'0',
    'max-height':'none',transform:'none',overflow:'visible',
    padding:desktop?'44px 32px':'26px 12px',
    background:'#f5f5f3'
  });
  rules('.mvn-theme-shop-goals .mvn-editorial-categories-heading',{
    display:'block','text-align':'left',height:'auto',margin:'0 0 18px',
    transform:'none',position:'relative',inset:'auto'
  });
  for(const el of document.querySelectorAll('.mvn-theme-shop-goals .mvn-editorial-category-grid > a')){
    for(const [k,v] of Object.entries({
      display:'flex','flex-direction':'column','align-items':'center',
      'justify-content':'flex-end',height:'auto',
      'min-height':desktop?'254px':'218px',padding:'12px 9px',
      position:'relative',inset:'auto',transform:'none',
      background:'#fff',color:'#171b1f',opacity:'1',visibility:'visible',
      border:'1px solid #dfe3e7','border-radius':'6px',overflow:'visible'
    }))set(el,k,v);
    const art=el.querySelector('.mvn-theme-goal-art');
    if(art)for(const [k,v] of Object.entries({
      display:'flex',position:'relative',inset:'auto',
      'align-items':'center','justify-content':'center',
      width:'100%',height:desktop?'172px':'132px',
      'min-height':desktop?'172px':'132px',
      opacity:'1',visibility:'visible',transform:'none',
      margin:'0 0 8px',padding:'0',overflow:'visible'
    }))set(art,k,v);
    const photo=art?.querySelector('img.goal-main');
    if(photo)for(const [k,v] of Object.entries({
      display:'block',position:'static',inset:'auto',width:'100%',
      height:desktop?'165px':'125px','max-width':desktop?'175px':'145px',
      'max-height':desktop?'165px':'125px',
      'object-fit':'contain',opacity:'1',visibility:'visible',
      transform:'none',filter:'none',margin:'0 auto',padding:'0'
    }))set(photo,k,v);
    for(const label of el.querySelectorAll('strong,small')){
      set(label,'display','block');set(label,'position','relative');
      set(label,'inset','auto');set(label,'transform','none');
      set(label,'font-size',label.tagName==='STRONG'?'14px':'12px');
      set(label,'line-height','1.35');set(label,'opacity','1');
      set(label,'color',label.tagName==='STRONG'?'#171b1f':'#5b636c');
      set(label,'text-shadow','none');
    }
  }
  // Catalogue exists in the served HTML; reset layout and visibility without
  // modifying the #grid contents, any product information or cart hooks.
  rules('#shop',{
    display:'block',position:'relative',width:'100%','max-width':'1440px',
    height:'auto','min-height':'0','max-height':'none',
    overflow:'visible',opacity:'1',visibility:'visible',
    transform:'none',margin:'0 auto',
    padding:desktop?'42px 36px 60px':'28px 12px 40px',
    background:'#fff',color:'#171b1f'
  });
  rules('#shop .shopping-layout',{
    display:'grid',width:'100%',height:'auto','min-height':'0',
    'grid-template-columns':desktop?'220px minmax(0,1fr)':'minmax(0,1fr)',
    transform:'none',overflow:'visible',gap:'18px'
  });
  rules('#shop .collection-results',{
    display:'block',width:'100%',height:'auto','min-height':'0',
    'max-height':'none',opacity:'1',visibility:'visible',
    transform:'none',overflow:'visible'
  });
  rules('#shop #grid',{
    display:'grid',width:'100%',height:'auto','max-height':'none',
    'grid-template-columns':desktop?'repeat(3,minmax(0,1fr))':'repeat(2,minmax(0,1fr))',
    gap:desktop?'20px':'10px',transform:'none',
    opacity:'1',visibility:'visible',overflow:'visible'
  });
  rules('.mvn-home-contact .mvn-home-contact-inner',{
    display:'grid',width:'100%',height:'auto','min-height':'0',
    transform:'none',opacity:'1',visibility:'visible'
  });

  // Published historic editor operations may hide the Globe-Tech copy; keep
  // its factual coming-soon text visible and properly inside the section.
  rules('.mvn-globtech-launch > div',{
    display:'block',position:'relative',transform:'none',inset:'auto',
    width:'auto',height:'auto','min-height':'0','max-height':'none',
    'max-width':'900px',flex:'0 1 auto','flex-basis':'auto',
    opacity:'1',visibility:'visible',margin:'0',padding:'0'
  });
  for(const element of document.querySelectorAll('.mvn-globtech-launch h2,.mvn-globtech-launch p,.mvn-globtech-launch strong')){
    set(element,'display','block');set(element,'position','relative');
    set(element,'transform','none');set(element,'inset','auto');
    set(element,'height','auto');set(element,'opacity','1');
  }
  rules('.mvn-globtech-launch',{
    display:'flex',height:'auto','min-height':'0','max-height':'none',
    'align-items':desktop?'center':'flex-start','justify-content':'space-between',
    padding:desktop?'36px 48px':'26px 16px',
    'background-color':'#101113',color:'#fff'
  });
  // Homepage is editorial: only the four featured products are visible.
  // The full retail catalogue is preserved and accessible on /shop.html;
  // do not repeat that long product grid beneath the home banner.
  rules('#shop',{display:'none',height:'0','min-height':'0',padding:'0',margin:'0',overflow:'hidden'});
  rules('.mvn-preview-best',{display:'block',width:'100%',height:'auto','max-width':'none','max-height':'none',
    'min-height':'0',margin:'0',overflow:'visible',transform:'none',
    background:'#faf9f7',color:'#171819'});
  rules('.mvn-preview-best .mvn-preview-best-grid',{display:'grid',width:'100%',height:'auto',
    'grid-template-columns':desktop?'repeat(4,minmax(0,1fr))':'repeat(2,minmax(0,1fr))',
    gap:desktop?'clamp(10px,1.5vw,20px)':'10px'});
  rules('.mvn-home-collection-entry',{display:'flex',width:'100%',height:'auto',
    transform:'none',margin:'0',background:'#171819',color:'#fff'});
  // Old published visual edits hid the old Best Sellers cards. Restore the
  // newly approved four real product cards without changing their images.
  rules('.mvn-preview-best .mvn-preview-best-grid',{
    display:'grid',height:'auto','max-height':'none',opacity:'1',visibility:'visible',
    'grid-template-columns':desktop?'repeat(4,minmax(0,1fr))':'repeat(2,minmax(0,1fr))'
  });
  for(const card of document.querySelectorAll('.mvn-preview-best .mvn-preview-best-grid > a')){
    for(const [key,value] of Object.entries({
      display:'flex','flex-direction':'column','min-height':'0',
      width:'100%',height:'auto','max-height':'none',opacity:'1',visibility:'visible',
      margin:'0',transform:'none',position:'relative',inset:'auto'
    }))set(card,key,value);
    const img=card.querySelector('img');
    if(img)for(const [key,value] of Object.entries({
      display:'block',height:desktop?'clamp(155px,20vw,270px)':'clamp(120px,34vw,190px)',
      width:'100%','max-width':'100%','max-height':'none',
      'object-fit':'contain',transform:'none',visibility:'visible',opacity:'1'
    }))set(img,key,value);
  }
  rules('.storehead',{
    background:'#101113','background-color':'#101113','background-image':'none',
    'border-bottom':'1px solid #292c2f'
  });
  for(const control of document.querySelectorAll('.storehead .head-actions summary,.storehead .head-actions .account-link,.storehead #bag')){
    set(control,'background','#101113');set(control,'background-color','#101113');
    set(control,'border-color','#30343a');
  }
  // Do not modify prices, product records, checkout, accounts or cart state.
 }
 addEventListener('load',repair);
 addEventListener('pageshow',repair);
 addEventListener('resize',repair,{passive:true});
})();
