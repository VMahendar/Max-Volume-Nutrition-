// Original product photos, editable campaigns and accessible automatic rotation.
(() => {
 const hero=document.getElementById('mvnEditorial');
 const state=document.getElementById('mvnCarouselState')||document.getElementById('mvnCarouselDefaults');
 if(!hero||!state||document.body.dataset.homepageEditor==='true'||new URLSearchParams(location.search).get('visual_builder')==='1')return;
 let config;try{config=JSON.parse(state.textContent);}catch{return;}
 if(!config?.enabled||!Array.isArray(config.slides)||config.slides.length<3)return;
 const el=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n;};
 const root=el('div','mvn-campaign-carousel');root.setAttribute('role','region');root.setAttribute('aria-roledescription','carousel');root.setAttribute('aria-label','Featured supplement collections');root.tabIndex=0;
 const viewport=el('div','mvn-campaign-viewport'),slides=[],dots=[];
 config.slides.forEach((item,i)=>{
  // Preserve saved owner layouts while making the upcoming brand status explicit.
  if(item.images.some(photo=>photo.src.includes('globtech-'))){
   item={...item,eyebrow:item.eyebrow.replace(/\s*·\s*COMING SOON$/i,'')+' · COMING SOON',description:item.description.replace(/Ask our team for price and availability\./i,'Coming soon. Prices and order availability will be announced at launch.')};
  }
  const slide=el('div','mvn-campaign-slide');slide.setAttribute('role','group');slide.setAttribute('aria-roledescription','slide');slide.setAttribute('aria-label',`${i+1} of ${config.slides.length}: ${item.name}`);
  const copy=el('div','mvn-campaign-copy');copy.append(el('span','mvn-campaign-eyebrow',item.eyebrow));
  const title=el('h1','mvn-campaign-title');const words=item.title.trim().split(/\s+/);title.append(el('span','mvn-campaign-title-first',words.shift()||''));if(words.length)title.append(el('span','mvn-campaign-title-middle',words.join(' ')));title.append(el('em','',item.highlight));copy.append(title,el('p','mvn-campaign-description',item.description));
  const cta=el('a','mvn-campaign-cta',item.button+' →');cta.href=item.href;copy.append(cta);
  const stage=el('a','mvn-campaign-stage');stage.href=item.href;stage.setAttribute('aria-label','Explore '+item.name);
  const products=el('div','mvn-campaign-products');products.dataset.count=item.images.length;
  item.images.forEach((photo,index)=>{
   const pack=el('div','mvn-campaign-pack'+(photo.format==='official'?' mvn-campaign-official':''));
   const img=el('img');if(photo.width){img.width=photo.width;img.height=photo.height;}if(photo.srcset){img.srcset=photo.srcset.replaceAll('assets/','/assets/');img.sizes='(max-width:760px) 44vw, 28vw';}img.src='/'+photo.src;img.alt=photo.alt;img.loading=i===0?'eager':'lazy';img.decoding='async';if(i===0&&index===0)img.fetchPriority='high';
   pack.append(img);products.append(pack);
  });
  stage.append(products,el('span','mvn-campaign-photo-note',item.name.toUpperCase()));
  slide.append(copy,stage);slide.hidden=i!==0;slide.inert=i!==0;slides.push(slide);viewport.append(slide);
 });
 const controls=el('div','mvn-campaign-controls');
 const previous=el('button','mvn-campaign-arrow','←');previous.type='button';previous.setAttribute('aria-label','Previous banner');
 const next=el('button','mvn-campaign-arrow','→');next.type='button';next.setAttribute('aria-label','Next banner');
 const pages=el('div','mvn-campaign-dots');pages.setAttribute('role','group');pages.setAttribute('aria-label','Choose banner');
 config.slides.forEach((item,i)=>{
  // Preserve saved owner layouts while making the upcoming brand status explicit.
  if(item.images.some(photo=>photo.src.includes('globtech-'))){
   item={...item,eyebrow:item.eyebrow.replace(/\s*·\s*COMING SOON$/i,'')+' · COMING SOON',description:item.description.replace(/Ask our team for price and availability\./i,'Coming soon. Prices and order availability will be announced at launch.')};
  }const dot=el('button','mvn-campaign-dot');dot.type='button';dot.setAttribute('aria-label',`Show banner ${i+1}: ${item.name}`);dot.addEventListener('click',()=>show(i,true));dots.push(dot);pages.append(dot);});
 const counter=el('span','mvn-campaign-counter'),pause=el('button','mvn-campaign-pause');pause.type='button';
 const status=el('span','mvn-campaign-status');status.setAttribute('aria-live','polite');status.setAttribute('aria-atomic','true');
 controls.append(previous,pages,next,counter,pause,status);root.append(viewport,controls);const initial=hero.querySelector('[data-server-rendered]');if(initial)initial.replaceWith(root);else hero.append(root);hero.dataset.carouselReady='true';hero.removeAttribute('aria-labelledby');
 const motion=matchMedia('(prefers-reduced-motion: reduce)');
 let current=0,timer=null,paused=!config.autoplay||motion.matches,hover=false,focus=false,inView=true;
 const label=()=>{pause.textContent=paused?'▶ Play':'Ⅱ Pause';pause.setAttribute('aria-label',paused?'Play automatic banner slides':'Pause automatic banner slides');counter.textContent=String(current+1).padStart(2,'0')+' / '+String(slides.length).padStart(2,'0');dots.forEach((d,i)=>d.setAttribute('aria-current',String(i===current)));};
 function schedule(){clearTimeout(timer);timer=null;if(!paused&&!hover&&!focus&&inView&&!document.hidden)timer=setTimeout(()=>show(current+1,false),config.intervalMs);}
 function show(index,manual){
  current=(index+slides.length)%slides.length;
  slides.forEach((slide,i)=>{slide.hidden=i!==current;slide.inert=i!==current;});
  slides[current].querySelectorAll('img').forEach(img=>img.loading='eager');
  if(!motion.matches)slides[current].animate([{opacity:0,transform:'translateX(24px)'},{opacity:1,transform:'translateX(0)'}],{duration:480,easing:'cubic-bezier(.2,.7,.2,1)'});
  if(manual)status.textContent=`Banner ${current+1}: ${config.slides[current].name}`;
  label();schedule();
 }
 previous.onclick=()=>show(current-1,true);next.onclick=()=>show(current+1,true);
 pause.onclick=()=>{paused=!paused;if(!paused){focus=false;hover=false;}label();schedule();};
 root.addEventListener('mouseenter',()=>{hover=true;schedule();});root.addEventListener('mouseleave',()=>{hover=false;schedule();});
 root.addEventListener('focusin',()=>{focus=true;schedule();});root.addEventListener('focusout',()=>requestAnimationFrame(()=>{focus=root.contains(document.activeElement);schedule();}));
 root.addEventListener('keydown',event=>{if(!event.target.closest('select,input,textarea,button')&&(event.key==='ArrowLeft'||event.key==='ArrowRight')){event.preventDefault();show(current+(event.key==='ArrowRight'?1:-1),true);}});
 document.addEventListener('visibilitychange',schedule);
 motion.addEventListener('change',()=>{if(motion.matches){paused=true;label();schedule();}});
 if('IntersectionObserver' in window)new IntersectionObserver(([entry])=>{inView=entry.isIntersecting;schedule();},{threshold:.15}).observe(root);
 let touch=null;
 viewport.addEventListener('touchstart',event=>{const p=event.touches[0];touch={x:p.clientX,y:p.clientY};},{passive:true});
 viewport.addEventListener('touchend',event=>{if(!touch)return;const p=event.changedTouches[0],dx=p.clientX-touch.x,dy=p.clientY-touch.y;touch=null;if(Math.abs(dx)>55&&Math.abs(dx)>Math.abs(dy)*1.4)show(current+(dx<0?1:-1),true);},{passive:true});
 label();schedule();
})();
