'use strict';
(()=>{
const editing=document.documentElement.dataset.mvnVisualBuilder==='edit';
// Retired template offsets must not shrink or displace the replacement homepage.
const retiredOperations=new Set((document.body.dataset.mvnRetiredOperations||'').split(','));
let doc;try{doc=JSON.parse(document.getElementById('mvnVisualBuilderConfig')?.textContent||'{"version":1,"pages":{}}');}catch{doc={version:1,pages:{}}}
const path=location.pathname==='/index.html'?'/':location.pathname;
const prohibited='form,input,select,textarea,[contenteditable],#cart,#checkout,#payment,#account,[data-price],.price,.product-price,.checkout,.cart-item,[data-cart],script,style,iframe,video,audio,canvas,svg,dialog,[data-mvn-builder-ui]';
const nodes='section,article,figure,img,h1,h2,h3,h4,h5,h6,p,a,button,strong,small,div';
const baseline=new WeakMap(),touched=new Set(),sources=new WeakMap();
let layer,outline,active=null,selected='',gesture=null,mode='move';
// Editable containers may include other elements. Restrict actual account/checkout controls,
// not their surrounding layout: previously this silently locked most of the storefront.
const isProtected=e=>!e||(!!e.closest(prohibited)&&!e.closest('[data-mvn-builder-created]'));
const containsCommerce=e=>!!e.querySelector?.('form,input,select,textarea,#cart,#checkout,#payment,#account,[data-price],.price,.product-price,.checkout,.cart-item,[data-cart]');
function pathFor(el){
 const generated=el.closest('[data-mvn-builder-created]');
 if(generated)return '@'+generated.dataset.mvnBuilderCreated;
 const segments=[];let cur=el;
 while(cur&&cur!==document.body){
  const tag=cur.tagName?.toLowerCase();
  if(!/^(main|header|footer|nav|section|article|div|figure|a|span|p|h[1-6]|img|picture|button|strong|small|ul|li)$/.test(tag||''))return null;
  let nth=1;for(let prev=cur.previousElementSibling;prev;prev=prev.previousElementSibling)if(prev.tagName===cur.tagName)nth++;
  segments.unshift(tag+':nth-of-type('+nth+')');cur=cur.parentElement;
 }
 return cur===document.body?'body > '+segments.join(' > '):null;
}
function getTarget(selector){
 try{return selector.startsWith('@')?document.querySelector('[data-mvn-builder-created="'+selector.slice(1)+'"]'):document.querySelector(selector);}catch{return null;}
}
function remember(e){
 if(!baseline.has(e))baseline.set(e,{style:e.getAttribute('style'),text:e.textContent,src:e.tagName==='IMG'?e.getAttribute('src'):null,srcset:e.tagName==='IMG'?e.getAttribute('srcset'):null});
 touched.add(e);
}
function reset(){
 for(const e of touched){
  if(!e.isConnected)continue;const b=baseline.get(e);
  if(b.style===null)e.removeAttribute('style');else e.setAttribute('style',b.style);
  if(e.dataset.mvnBuilderText){e.textContent=b.text;delete e.dataset.mvnBuilderText;}
  if(e.dataset.mvnBuilderImage){
   for(const [source,srcset] of sources.get(e)||[]){if(!source.isConnected)continue;if(srcset===null)source.removeAttribute('srcset');else source.setAttribute('srcset',srcset);}
   sources.delete(e);
   if(b.src===null)e.removeAttribute('src');else e.setAttribute('src',b.src);
   if(b.srcset===null)e.removeAttribute('srcset');else e.setAttribute('srcset',b.srcset);
   delete e.dataset.mvnBuilderImage;
  }
 }
 touched.clear();layer?.replaceChildren();
}
function style(e,k,v){e.style.setProperty(k,v,'important');}
function apply(input){
 doc=input?.version===1?input:{version:1,pages:{}};reset();
 if(!layer){layer=document.createElement('div');layer.dataset.mvnBuilderUi='layer';layer.style.cssText='position:absolute;inset:0;width:100%;height:0;z-index:100000;pointer-events:none';document.body.append(layer);}
 const viewport=matchMedia('(max-width:760px)').matches?'mobile':'desktop';
 for(const op of doc.pages?.[path]||[]){
  if(retiredOperations.has(op.id))continue;
  if(op.device!=='all'&&op.device!==viewport)continue;
  const e=getTarget(op.target);if(!e||isProtected(e))continue;
  if(op.action==='duplicate'&&containsCommerce(e))continue;
  if(op.action==='duplicate'||op.action==='insert'){
   const copy=op.action==='duplicate'?e.cloneNode(true):document.createElement(op.element==='image'?'img':op.element==='button'?'a':op.element==='box'?'div':'p');
   copy.querySelectorAll?.('form,input,select,textarea,script,iframe,video,audio,canvas,[id]').forEach(x=>x.remove());
   for(const at of [...copy.attributes])if(/^on/i.test(at.name))copy.removeAttribute(at.name);
   copy.removeAttribute('id');copy.dataset.mvnBuilderCreated=op.id;
   if(op.action==='insert'){
    if(op.element==='image'){copy.src='/'+op.src;copy.alt='Uploaded image';}else copy.textContent=op.text||'';
    if(op.element==='button')copy.href=op.href;
   }
   const r=e.getBoundingClientRect();
   copy.style.cssText='position:absolute;pointer-events:auto;box-sizing:border-box;max-width:none;max-height:none;overflow:visible;left:'+(r.left+scrollX+20)+'px;top:'+(r.top+scrollY+20)+'px;width:'+Math.max(1,r.width)+'px;min-height:1px;z-index:100001;';
   layer.append(copy);continue;
  }
  remember(e);
  if(op.action==='hide'){if(!containsCommerce(e))style(e,'display','none');continue;}
  if(op.action==='text'){if(e.tagName!=='IMG'&&!containsCommerce(e)){e.textContent=op.text;e.dataset.mvnBuilderText='1';}continue;}
  if(op.action==='image'){if(e.tagName==='IMG'){const picture=e.closest('picture');if(picture){const prior=[...picture.querySelectorAll('source')].map(source=>[source,source.getAttribute('srcset')]);sources.set(e,prior);for(const [source] of prior)source.removeAttribute('srcset');}e.removeAttribute('srcset');e.removeAttribute('sizes');e.src='/'+op.src;e.dataset.mvnBuilderImage='1';}continue;}
  const v=op.values||{};
  if('x'in v||'y'in v||'rotate'in v)style(e,'transform','translate('+(v.x||0)+'px,'+(v.y||0)+'px) rotate('+(v.rotate||0)+'deg)');
  for(const k of ['width','height','fontSize','padding','radius']){
   if(k in v)style(e,k==='radius'?'border-radius':k.replace(/[A-Z]/g,c=>'-'+c.toLowerCase()),v[k]+'px');
  }
  if('opacity'in v)style(e,'opacity',String(v.opacity/100));
  if('zIndex'in v)style(e,'z-index',String(v.zIndex));
  for(const k of ['color','backgroundColor','objectFit','textAlign'])if(v[k])style(e,k.replace(/[A-Z]/g,c=>'-'+c.toLowerCase()),v[k]);
  if(v.unlockLayout===true){
   // Editing unlock: clear max dimensions, clipping, overflow and aspect-ratio imposed
   // by the original template. No changes are saved to the live store until Publish.
   for(let ancestor=e,steps=0;ancestor&&ancestor!==document.documentElement&&steps<24;ancestor=ancestor.parentElement,steps++){
    remember(ancestor);
    style(ancestor,'max-height','none');
    style(ancestor,'max-width','none');
    style(ancestor,'overflow','visible');
    style(ancestor,'overflow-x','visible');
    style(ancestor,'overflow-y','visible');
    style(ancestor,'clip-path','none');
    if(ancestor===e){style(ancestor,'min-height','0');style(ancestor,'aspect-ratio','auto');}
   }
  }
  if(v.fullBleed===true){
   // For the hero picture remove the constraints on its ancestor section,
   // not merely the image pixels; otherwise white margins remain.
   const hero=e.closest('#mvnEditorial');
   const containers=hero?[hero,hero.querySelector('.mvn-editorial-layout'),hero.querySelector('.mvn-owner-banner-feature'),hero.querySelector('.mvn-owner-banner-link')].filter(Boolean):[e];
   for(const container of containers){
    remember(container);style(container,'max-width','none');
    style(container,'box-sizing','border-box');style(container,'width','100%');
    style(container,'padding-left','0');style(container,'padding-right','0');
   }
   const outer=hero||e;remember(outer);style(outer,'width','100vw');
   style(outer,'max-width','none');style(outer,'margin-left','calc(50% - 50vw)');
   style(outer,'margin-right','0');
   if(e!==hero){style(e,'max-width','none');style(e,'width','100%');}
  }
 }
 if(editing)requestAnimationFrame(()=>{positionOutline();reportDocumentHeight();});
}
if(!editing){apply(doc);return;}
const css=document.createElement('style');
css.textContent=`[data-mvn-builder-ui="selection"]{position:absolute;z-index:2147483600;border:2px solid #ff693f;pointer-events:none;box-shadow:0 0 0 1px #fff8}[data-mvn-builder-ui="selection"] [data-handle]{position:absolute;width:30px;height:30px;border-radius:7px;background:#ff693f;border:2px solid white;pointer-events:auto;touch-action:none!important;cursor:nwse-resize}[data-handle="nw"]{left:-15px;top:-15px}[data-handle="ne"]{right:-15px;top:-15px}[data-handle="sw"]{left:-15px;bottom:-15px}[data-handle="se"]{right:-15px;bottom:-15px}[data-mvn-builder-ui="selection"] .builder-name{position:absolute;bottom:100%;left:0;background:#ff693f;color:white;padding:5px 9px;font:700 12px system-ui;white-space:nowrap}[data-mvn-builder-ui="selection"] .builder-hint{position:absolute;left:0;top:100%;background:#1f2a38;color:white;padding:4px 8px;font:600 11px system-ui;white-space:nowrap}.mvn-builder-move-mode body img,.mvn-builder-move-mode body h1,.mvn-builder-move-mode body h2,.mvn-builder-move-mode body h3,.mvn-builder-move-mode body p,.mvn-builder-move-mode body a,.mvn-builder-move-mode body section,.mvn-builder-move-mode body figure,.mvn-builder-move-mode body div{touch-action:none!important}.mvn-builder-move-mode [data-mvn-builder-ui] *{touch-action:none!important}`;
document.head.append(css);
document.head.append(css);
outline=document.createElement('div');outline.dataset.mvnBuilderUi='selection';outline.innerHTML=window.mvnSafeHTML('<span class="builder-name">DRAG TO MOVE · RESIZE CORNERS</span><span data-handle="nw" title="Resize"></span><span data-handle="ne" title="Resize"></span><span data-handle="sw" title="Resize"></span><span data-handle="se" title="Resize"></span><span class="builder-hint">Drag photo or text directly to move it</span>');document.body.append(outline);outline.hidden=true;document.documentElement.classList.add('mvn-builder-move-mode');
function positionOutline(){
 if(!active||!active.isConnected){outline.hidden=true;return;}
 const r=active.getBoundingClientRect();if(r.width<2||r.height<2){outline.hidden=true;return;}
 outline.hidden=false;outline.style.left=r.left+scrollX+'px';outline.style.top=r.top+scrollY+'px';outline.style.width=r.width+'px';outline.style.height=r.height+'px';
}
function send(type,fields){parent.postMessage({type,...fields},location.origin);}
function select(e){
 if(!e||isProtected(e))return;const target=pathFor(e);if(!target)return;
 active=e;selected=target;positionOutline();const r=e.getBoundingClientRect();
 send('mvn-visual-select',{target,tag:e.tagName.toLowerCase(),text:e.tagName==='IMG'?'':e.textContent.slice(0,50000),src:e.tagName==='IMG'?e.getAttribute('src'):'',width:Math.round(r.width),height:Math.round(r.height)});
}
// True canvas interaction: grab the object itself (mouse or touch), not only the small handles.
let directGesture=null;
const beginDirect=ev=>{
 if(mode!=='move'||ev.target.closest?.('[data-mvn-builder-ui]'))return;
 if(ev.button!==0&&ev.pointerType==='mouse')return;
 if(isProtected(ev.target))return;
 const el=ev.target.closest(nodes);
 if(!el||isProtected(el))return;
 const candidate=pathFor(el);if(!candidate)return;
 ev.preventDefault();
 select(el);
 const r=el.getBoundingClientRect(),m=new DOMMatrix(getComputedStyle(el).transform);
 directGesture={id:ev.pointerId,sx:ev.clientX,sy:ev.clientY,x:m.m41,y:m.m42,target:candidate,el,moved:false};
 try{el.setPointerCapture(ev.pointerId)}catch{}
};
document.addEventListener('pointerdown',beginDirect,true);
document.addEventListener('pointermove',ev=>{
 if(!directGesture||ev.pointerId!==directGesture.id)return;
 const g=directGesture,dx=ev.clientX-g.sx,dy=ev.clientY-g.sy;
 if(!g.moved&&Math.abs(dx)+Math.abs(dy)<5)return;
 g.moved=true;ev.preventDefault();style(g.el,'transform','translate('+(g.x+dx)+'px,'+(g.y+dy)+'px)');
 positionOutline();
},true);
function endDirect(ev){
 if(!directGesture||ev.pointerId!==directGesture.id)return;
 const g=directGesture;directGesture=null;
 if(g.moved){ev.preventDefault();send('mvn-visual-operation',{target:g.target,action:'move',values:{x:Math.max(-1000000,Math.min(1000000,Math.round(g.x+ev.clientX-g.sx))),y:Math.max(-1000000,Math.min(1000000,Math.round(g.y+ev.clientY-g.sy)))}});}
}
document.addEventListener('pointerup',endDirect,true);
document.addEventListener('pointercancel',endDirect,true);
document.addEventListener('click',ev=>{
 if(ev.target.closest('[data-mvn-builder-ui]')&&!ev.target.closest('[data-mvn-builder-created]'))return;
 ev.preventDefault();ev.stopImmediatePropagation();
 let e=ev.target.closest(nodes);if(e&&!isProtected(e))select(e);
},true);
document.addEventListener('submit',ev=>{ev.preventDefault();ev.stopImmediatePropagation();},true);
outline.addEventListener('pointerdown',ev=>{
 if(!active||!ev.target.dataset.handle)return;ev.preventDefault();ev.stopPropagation();
 const r=active.getBoundingClientRect();const m=new DOMMatrix(getComputedStyle(active).transform);
 gesture={pointerId:ev.pointerId,kind:ev.target.dataset.handle,sx:ev.clientX,sy:ev.clientY,width:r.width,height:r.height,x:m.m41,y:m.m42};
 ev.target.setPointerCapture(ev.pointerId);
});
outline.addEventListener('pointermove',ev=>{
 if(!gesture||ev.pointerId!==gesture.pointerId||!active)return;
 const dx=ev.clientX-gesture.sx,dy=ev.clientY-gesture.sy;
 const xDir=gesture.kind.includes('w')?-1:1,yDir=gesture.kind.includes('n')?-1:1;
 style(active,'width',Math.max(1,gesture.width+dx*xDir)+'px');
 style(active,'height',Math.max(1,gesture.height+dy*yDir)+'px');
 positionOutline();
});
outline.addEventListener('pointerup',ev=>{
 if(!gesture||ev.pointerId!==gesture.pointerId||!active)return;
 const dx=ev.clientX-gesture.sx,dy=ev.clientY-gesture.sy;
 const xDir=gesture.kind.includes('w')?-1:1,yDir=gesture.kind.includes('n')?-1:1;
 const values={width:Math.max(1,Math.min(1000000,Math.round(gesture.width+dx*xDir))),height:Math.max(1,Math.min(1000000,Math.round(gesture.height+dy*yDir)))};
 send('mvn-visual-operation',{target:selected,action:'resize',values});gesture=null;
});
// Expand the editor iframe when a tall page needs more space; don't tie it to a
// fixed phone/desktop preview height.
function reportDocumentHeight(){
 if(!editing)return;
 const full=Math.max(document.body?.scrollHeight||0,document.documentElement?.scrollHeight||0);
 if(full>innerHeight+24)send('mvn-visual-document-height',{page:path,height:full});
}
addEventListener('scroll',()=>requestAnimationFrame(positionOutline),{passive:true});
addEventListener('load',reportDocumentHeight);
const heightObserver=new ResizeObserver(()=>requestAnimationFrame(reportDocumentHeight));
heightObserver.observe(document.body);
addEventListener('resize',()=>requestAnimationFrame(positionOutline),{passive:true});
addEventListener('message',ev=>{
 if(ev.origin!==location.origin||ev.source!==parent||!ev.data)return;
 if(ev.data.type==='mvn-visual-design')apply(ev.data.document);
 if(ev.data.type==='mvn-visual-select-target')select(getTarget(ev.data.target));
 if(ev.data.type==='mvn-visual-mode'){
  mode=ev.data.mode==='scroll'?'scroll':'move';
  document.documentElement.classList.toggle('mvn-builder-move-mode',mode==='move');
 }
});
apply(doc);send('mvn-visual-ready',{page:path});
})();
