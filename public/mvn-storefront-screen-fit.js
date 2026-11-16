'use strict';
// Safety net for earlier saved visual-editor widths that leave blank desktop panes.
// Fix only top-level storefront layout shells, not user photos, text, catalogue,
// prices or interactive checkout controls.
(()=>{
 const shells=['.storehead','#mvnEditorial','.mvn-theme-shop-goals','.mvn-preview-best','.mvn-globtech-launch','#shop','.mvn-home-contact'];
 function repair(){
  if(document.documentElement.dataset.mvnVisualBuilder==='edit'||document.body?.hasAttribute('data-homepage-editor'))return;
  if(!document.body?.classList.contains('mvn-showcase-home')||innerWidth<790)return;
  const viewport=document.documentElement.clientWidth;
  for(const selector of shells){
   const element=document.querySelector(selector);if(!element)continue;
   const box=element.getBoundingClientRect();
   if(box.width>=viewport*.9&&box.left>=-8&&box.right<=viewport+8)continue;
   element.style.setProperty('width','100%','important');
   element.style.setProperty('max-width','none','important');
   element.style.setProperty('min-width','0','important');
   element.style.setProperty('margin-left','0','important');
   element.style.setProperty('margin-right','0','important');
   element.style.setProperty('box-sizing','border-box','important');
   element.style.setProperty('transform','none','important');
  }
  const grid=document.querySelector('.mvn-theme-shop-goals .mvn-editorial-category-grid');
  if(grid){
   const cards=[...grid.children].filter(e=>e.matches('a'));
   const adjacentOverlap=cards.some((a,index)=>{
    const b=cards[index+1];if(!b)return false;
    const r=a.getBoundingClientRect(),n=b.getBoundingClientRect();
    return r.bottom>n.top+8&&n.bottom>r.top+8&&r.right>n.left+8&&n.right>r.left+8;
   });
   if(adjacentOverlap)for(const el of cards){
    el.style.setProperty('transform','none','important');
    el.style.setProperty('position','relative','important');
    el.style.setProperty('left','auto','important');
    el.style.setProperty('right','auto','important');
    el.style.setProperty('top','auto','important');
    el.style.setProperty('bottom','auto','important');
   }
  }
 }
 addEventListener('load',repair,{once:true});
 addEventListener('pageshow',repair);
 addEventListener('resize',repair,{passive:true});
})();
