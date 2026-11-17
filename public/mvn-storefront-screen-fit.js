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
  const desktop=innerWidth>1024;
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
   flex:'0 1 auto','flex-basis':'auto','min-height':'0',
   width:'auto',height:'auto','max-width':'900px',
   'max-height':'none',margin:'0',padding:'0',opacity:'1','font-size':'14px'
  });
  for(const el of document.querySelectorAll('.mvn-globtech-launch h2,.mvn-globtech-launch p,.mvn-globtech-launch strong')){
   set(el,'transform','none');set(el,'position','relative');
   set(el,'inset','auto');set(el,'height','auto');set(el,'opacity','1');
   if(el.tagName==='H2')set(el,'font-size','clamp(26px,3.8vw,48px)');
   else set(el,'font-size','14px');
  }
  // Owner-approved customer homepage layout: normalize persisted visual-builder
  // geometry without altering saved drafts or the visual editor itself.
  // Runs after published overrides; transactional controls remain untouched.
  rules('.mvn-preview-best',{
    display:'block',height:'auto','min-height':'0','max-height':'none',
    overflow:'visible',transform:'none',width:'100%',margin:'0',
    padding:desktop?'34px clamp(20px,4vw,56px) 48px':'24px 14px 34px',
    background:'#f6f6f4',color:'#17191b'
  });
  rules('body > section.hero',{display:'none'});
  rules('body > section.benefits',{display:'none'});
  rules('.mvn-theme-main-nav',{display:'none'});
  rules('.mvn-preview-nav',{display:'none'});
  rules('nav.nav',{display:'none'});
  rules('#mvnSpotlight',{display:'none'});
  rules('.storehead',{
    display:'flex','flex-direction':'row','flex-wrap':'nowrap',
    'align-items':'center','justify-content':'space-between',
    'grid-template-columns':'none','grid-template-rows':'none',
    height:desktop?'74px':'65px','min-height':desktop?'74px':'65px',
    padding:desktop?'8px 30px':'7px 10px',gap:'6px',
    background:'#171b1f','border-bottom':'3px solid #f15b09',
    'box-shadow':'none',position:'relative',overflow:'visible'
  });
  rules('.storehead .brand-identity',{
    display:'flex','flex-grow':'1','flex-shrink':'1','flex-basis':'auto',
    width:'auto',height:desktop?'55px':'46px',
    'max-width':desktop?'300px':'calc(100% - 165px)',
    'grid-column':'auto','grid-row':'auto',
    transform:'none',margin:'0',padding:'0',
    position:'relative','align-self':'center'
  });
  rules('.storehead .original-brand-logo',{
    width:'100%',height:'100%','max-width':'100%','max-height':'100%',
    transform:'none',margin:'0','object-fit':'contain',
    'object-position':'left center',display:'block'
  });
  rules('.storehead .head-actions',{
    display:'flex','flex-direction':'row','flex-wrap':'nowrap',
    width:'auto','max-width':'none',height:'auto',
    position:'relative','grid-column':'auto','grid-row':'auto',
    transform:'none',margin:'0',padding:'0',gap:desktop?'8px':'3px',
    'justify-self':'auto','align-self':'center','justify-content':'flex-end',
    'align-items':'center','flex-grow':'0','flex-shrink':'0'
  });
  for(const el of document.querySelectorAll('.storehead .head-actions > .wa,.storehead .mvn-header-email,.storehead .header-descriptor,.storehead .mvn-header-wordmark,.announce'))set(el,'display','none');
  for(const el of document.querySelectorAll('.storehead .head-actions .account-link span,.storehead .head-actions #bag > span'))set(el,'display','none');
  for(const el of document.querySelectorAll('.storehead .head-actions .account-link,.storehead .head-actions #bag,.storehead .head-actions summary')){
    for(const [k,v] of Object.entries({
      display:'flex','align-items':'center','justify-content':'center',
      height:desktop?'42px':'38px','min-height':desktop?'42px':'38px',
      'min-width':desktop?'42px':'35px',width:'auto',
      padding:'5px',margin:'0',background:'#24292e',
      color:'#fff',border:'1px solid #41494f','border-radius':'6px',
      'box-shadow':'none'
    }))set(el,k,v);
  }
  rules('#mvnEditorial',{
    display:'block',width:'100%',height:'auto','min-height':'0',
    'max-height':'none',margin:'0',padding:'0',
    position:'relative',transform:'none',overflow:'visible',
    background:'#111315'
  });
  rules('#mvnEditorial .mvn-editorial-layout',{
    display:'flex','flex-direction':'column',
    width:'100%','max-width':'none',height:'auto','min-height':'0',
    gap:'0',margin:'0',padding:'0',transform:'none'
  });
  rules('#mvnEditorial .mvn-owner-banner-feature',{
    display:'block',width:'100%',height:'auto','min-height':'0',
    'max-width':'none','max-height':'none',
    position:'relative',overflow:'hidden',transform:'none',margin:'0'
  });
  rules('#mvnEditorial .mvn-owner-banner-link',{
    display:'block',position:'relative',inset:'auto',
    height:'auto',width:'100%',transform:'none',margin:'0'
  });
  rules('#mvnEditorial .mvn-owner-banner-link picture',{
    display:'block',height:'auto',width:'100%',transform:'none'
  });
  rules('#mvnEditorial .mvn-owner-banner-img',{
    display:'block',height:'auto',width:'100%','max-height':'none',
    'object-fit':'contain','object-position':'center',
    transform:'none',opacity:'1',visibility:'visible'
  });
  rules('.mvn-editorial-promos',{display:'none'});
  rules('.mvn-editorial-benefits',{display:'none'});
  rules('.mvn-theme-shop-goals',{
    display:'block',width:'100%',height:'auto','min-height':'0',
    'max-height':'none',padding:desktop?'38px 32px':'26px 12px',
    transform:'none',overflow:'visible',
    background:'#f5f5f3',color:'#171b1f'
  });
  rules('.mvn-theme-shop-goals .mvn-editorial-categories-heading',{
    display:'block',width:'100%','max-width':'1440px',
    height:'auto',margin:'0 auto 16px',padding:'0',
    position:'relative',inset:'auto',transform:'none',
    'text-align':'left'
  });
  rules('.mvn-theme-shop-goals .mvn-editorial-categories-heading h2',{
    display:'block',position:'relative',transform:'none',
    'font-size':desktop?'44px':'32px',
    'line-height':'1.1',color:'#171b1f',opacity:'1'
  });
  rules('.mvn-theme-shop-goals .mvn-editorial-category-grid',{
    display:'grid',width:'100%','max-width':'1440px',
    height:'auto','min-height':'0','max-height':'none',
    margin:'0 auto',padding:'0',transform:'none',
    'grid-template-columns':desktop?'repeat(4,minmax(0,1fr))':'repeat(2,minmax(0,1fr))',
    'grid-template-rows':'auto',gap:desktop?'16px':'10px'
  });
  for(const el of document.querySelectorAll('.mvn-theme-shop-goals .mvn-editorial-category-grid > a')){
    for(const [k,v] of Object.entries({
      display:'flex','flex-direction':'column','align-items':'center',
      'justify-content':'flex-end',position:'relative',inset:'auto',
      width:'100%',height:'auto','min-height':desktop?'252px':'212px',
      'max-width':'none','max-height':'none',
      transform:'none',margin:'0',padding:'12px 9px',
      background:'#fff',color:'#171b1f',
      border:'1px solid #e0e4e6','border-radius':'6px',
      overflow:'visible',opacity:'1',visibility:'visible',
      'text-align':'center'
    }))set(el,k,v);
    const art=el.querySelector('.mvn-theme-goal-art');
    if(art)for(const [k,v] of Object.entries({
      display:'flex',position:'relative',inset:'auto',
      width:'100%',height:desktop?'175px':'130px',
      'min-height':desktop?'175px':'130px',
      transform:'none',margin:'0 0 8px',padding:'0',
      overflow:'visible',opacity:'1',visibility:'visible',
      'align-items':'center','justify-content':'center'
    }))set(art,k,v);
    const img=art?.querySelector('img');
    if(img)for(const [k,v] of Object.entries({
      display:'block',position:'static',inset:'auto',
      width:'100%',height:desktop?'170px':'125px',
      'max-width':desktop?'180px':'140px','max-height':desktop?'170px':'125px',
      transform:'none',margin:'0 auto',padding:'0',
      opacity:'1',visibility:'visible',filter:'none','object-fit':'contain'
    }))set(img,k,v);
    for(const elLabel of el.querySelectorAll('strong,small')){
      for(const [k,v] of Object.entries({
        display:'block',position:'relative',inset:'auto',
        transform:'none',width:'auto',height:'auto',
        color:elLabel.tagName==='STRONG'?'#171b1f':'#566066',
        'font-size':elLabel.tagName==='STRONG'?'14px':'12px',
        'line-height':'1.35',margin:'4px 0',
        opacity:'1',visibility:'visible'
      }))set(elLabel,k,v);
    }
  }
  // Restore the actual retail shopping grid above the footer. It must never
  // disappear because a previous owner drag/resize saved display or geometry.
  rules('#shop',{
    display:'none',position:'relative',visibility:'hidden',opacity:'0',
    width:'100%','max-width':'1440px',height:'auto','min-height':'0',
    'max-height':'none',overflow:'visible',transform:'none',
    margin:'0 auto',padding:desktop?'42px 36px 56px':'28px 12px 38px',
    background:'#fff',color:'#171b1f'
  });
  rules('#shop .collection-results',{
    display:'block',visibility:'visible',opacity:'1',
    height:'auto','max-height':'none',overflow:'visible',transform:'none'
  });
  rules('#shop #grid',{
    display:'grid',visibility:'visible',opacity:'1',
    width:'100%',height:'auto','max-height':'none',
    'grid-template-columns':desktop?'repeat(4,minmax(0,1fr))':'repeat(2,minmax(0,1fr))',
    gap:desktop?'18px':'10px',transform:'none',overflow:'visible'
  });
  rules('.mvn-globtech-launch',{
    display:'flex',width:'100%',height:'auto','min-height':'0',
    margin:'0',padding:desktop?'38px 42px':'28px 18px',
    transform:'none',position:'relative',inset:'auto',
    'align-items':'flex-start','flex-direction':'column',
    background:'#182026',color:'#fff'
  });
  rules('.mvn-home-contact',{
    display:'block',width:'100%',height:'auto','min-height':'0',
    padding:desktop?'30px 42px':'28px 16px',
    margin:'0',background:'#171b1f',color:'#fff',
    transform:'none',overflow:'visible'
  });


  // Single finishing pass after older theme and published owner overrides.
  // Avoid split charcoal/grey header, oversized collection tiles and mixed
  // footer backgrounds. The structural edit records remain untouched.
  const DARK='#101113',PANEL='#151719',LIGHT='#f6f6f4',TEXT='#17191b';
  rules('.storehead',{
    background:DARK,'background-color':DARK,'background-image':'none',
    'border-top':'0','border-bottom':'1px solid #292c2f',
    'box-shadow':'none',margin:'0',transform:'none',
    'border-radius':'0'
  });
  for(const selector of ['.storehead .brand-identity','.storehead .head-actions','.storehead .head-actions details',
   '.storehead .head-actions .mvn-header-search-toggle',
   '.storehead .head-actions .mvn-header-more',
   '.storehead .mvn-theme-categories']){
    rules(selector,{background:'transparent','background-color':'transparent',
      'background-image':'none','box-shadow':'none','border-color':'transparent'});
  }
  for(const el of document.querySelectorAll('.storehead .head-actions summary,.storehead .head-actions .account-link,.storehead .head-actions #bag')){
    for(const [k,v] of Object.entries({
      background:DARK,'background-color':DARK,'background-image':'none',
      color:'#fff',border:'1px solid #30343a',
      'border-radius':'4px','box-shadow':'none',transform:'none'
    }))set(el,k,v);
  }
  rules('.mvn-theme-shop-goals',{
    background:LIGHT,'background-color':LIGHT,'background-image':'none',
    color:TEXT,padding:desktop?'32px clamp(20px,4vw,56px) 44px':'24px 14px 30px',
    margin:'0','border-top':'0','border-bottom':'0'
  });
  rules('.mvn-theme-shop-goals .mvn-editorial-categories-heading',{
    width:'100%','max-width':'1440px',height:'auto',
    margin:desktop?'0 auto 20px':'0 auto 16px',
    'text-align':'left',padding:'0'
  });
  rules('.mvn-theme-shop-goals .mvn-editorial-categories-heading h2',{
    'font-size':desktop?'clamp(29px,3vw,42px)':'clamp(25px,7vw,32px)',
    'line-height':'1.12','letter-spacing':'-.025em',
    margin:'0',color:TEXT,height:'auto',transform:'none'
  });
  rules('.mvn-theme-shop-goals .mvn-editorial-category-grid',{
    width:'100%','max-width':'1440px',
    'grid-template-columns':desktop?'repeat(4,minmax(0,1fr))':'repeat(2,minmax(0,1fr))',
    gap:desktop?'clamp(12px,1.5vw,20px)':'10px',
    margin:'0 auto',padding:'0',height:'auto','align-items':'stretch'
  });
  for(const card of document.querySelectorAll('.mvn-theme-shop-goals .mvn-editorial-category-grid>a')){
    for(const [k,v] of Object.entries({
      display:'flex','flex-direction':'column','justify-content':'flex-end',
      'align-items':'center','min-height':desktop?'242px':'184px',
      height:'auto',padding:desktop?'14px 12px 16px':'10px 7px 12px',
      margin:'0',transform:'none',position:'relative',inset:'auto',
      background:'#fff','background-color':'#fff',
      border:'1px solid #dedfdf','border-radius':'8px',
      'box-shadow':'none',overflow:'hidden','text-align':'center',gap:'4px'
    }))set(card,k,v);
    const art=card.querySelector('.mvn-theme-goal-art');
    if(art){for(const [k,v] of Object.entries({
      display:'flex','align-items':'center','justify-content':'center',
      width:'100%',height:desktop?'160px':'112px','min-height':'0',
      'max-height':'none',margin:'0 0 7px',padding:'0',
      transform:'none',position:'relative',overflow:'visible'
    }))set(art,k,v);}
    const img=art?.querySelector('img');
    if(img){for(const [k,v] of Object.entries({
      display:'block',width:'100%',height:desktop?'154px':'105px',
      'max-height':desktop?'154px':'105px','max-width':'100%',
      'object-fit':'contain',position:'static',transform:'none',
      margin:'0 auto',padding:'0',visibility:'visible',opacity:'1'
    }))set(img,k,v);}
    for(const lbl of card.querySelectorAll('strong,small')){
      set(lbl,'position','static');set(lbl,'transform','none');
      set(lbl,'height','auto');set(lbl,'max-width','100%');
      set(lbl,'line-height','1.25');set(lbl,'text-align','center');
      set(lbl,'white-space','normal');set(lbl,'color',lbl.tagName==='STRONG'?TEXT:'#58616a');
      set(lbl,'font-size',lbl.tagName==='STRONG'?(desktop?'clamp(14px,1.3vw,19px)':'13px'):'12px');
    }
  }
  // Best Sellers is the single product collection on the homepage.
  // Restore its four clear cards instead of a repeated full catalogue.
  rules('.mvn-preview-best',{
    display:'block',width:'100%',height:'auto','max-width':'none',
    padding:desktop?'34px clamp(20px,4vw,56px) 48px':'24px 14px 34px',
    background:LIGHT,'background-color':LIGHT,'background-image':'none',
    margin:'0',transform:'none',overflow:'visible'
  });
  rules('.mvn-preview-best .mvn-preview-best-grid',{
    display:'grid',width:'100%','max-width':'1440px',
    margin:'0 auto',height:'auto',gap:desktop?'clamp(12px,1.5vw,20px)':'10px',
    'grid-template-columns':desktop?'repeat(4,minmax(0,1fr))':'repeat(2,minmax(0,1fr))'
  });
  for(const product of document.querySelectorAll('.mvn-preview-best-grid > a')){
    for(const [k,v] of Object.entries({
      display:'flex','flex-direction':'column','justify-content':'flex-start',
      width:'100%',height:'auto','min-height':'0','max-width':'none',
      margin:'0',padding:desktop?'14px':'10px',
      transform:'none',position:'relative',inset:'auto',
      border:'1px solid #dedfdf','border-radius':'8px',
      background:'#fff',color:TEXT,gap:'8px','box-shadow':'none'
    }))set(product,k,v);
    const img=product.querySelector('img');
    if(img)for(const [key,value] of Object.entries({
      width:'100%',height:desktop?'clamp(150px,18vw,260px)':'clamp(115px,32vw,165px)',
      'max-width':'100%','max-height':'none','object-fit':'contain',
      position:'static',transform:'none',margin:'0',padding:'0',background:'#fff'
    }))set(img,key,value);
  }
  // A single light collection surface: eliminate arbitrary grey gutters.
  rules('#shop',{
    background:LIGHT,'background-color':LIGHT,'background-image':'none',
    color:TEXT,width:'100%','max-width':'none',
    padding:desktop?'38px clamp(20px,4vw,56px) 54px':'28px 14px 36px',
    margin:'0',transform:'none'
  });
  rules('#shop .collection-results',{
    background:'transparent','background-color':'transparent',
    width:'100%',margin:'0 auto','max-width':'1440px',
    height:'auto',padding:'0'
  });
  rules('#shop #grid',{
    width:'100%','max-width':'1440px','margin-left':'auto','margin-right':'auto',
    gap:desktop?'clamp(12px,1.5vw,20px)':'10px',
    'align-items':'stretch'
  });
  for(const el of document.querySelectorAll('#shop #grid > *')){
    set(el,'min-width','0');set(el,'max-width','none');
    set(el,'box-sizing','border-box');set(el,'transform','none');
  }
  // Keep the bottom one continuous charcoal field, not alternating greys.
  rules('.mvn-globtech-launch',{
    background:DARK,'background-color':DARK,'background-image':'none',
    color:'#f6f6f6',margin:'0',padding:desktop?'34px clamp(20px,4vw,56px)':'26px 16px',
    'min-height':'0','max-height':'none','justify-content':'center',
    'border-top':'1px solid #292c2f','border-bottom':'0'
  });
  rules('.mvn-home-contact',{
    background:DARK,'background-color':DARK,'background-image':'none',
    color:'#f6f6f6',margin:'0',
    'border-top':'1px solid #292c2f','border-bottom':'0','box-shadow':'none'
  });
  rules('body.retail-home',{
    'background-color':DARK,
    'background-image':'none'
  });
  for(const el of document.querySelectorAll('.mvn-home-contact-inner,.mvn-home-contact-inner > *')){
    set(el,'background-color','transparent');set(el,'background-image','none');
    set(el,'box-shadow','none');
  }

  // Do not modify prices, product records, checkout, accounts or cart state.
 }
 addEventListener('load',repair);
 addEventListener('pageshow',repair);
 addEventListener('resize',repair,{passive:true});
})();
