'use strict';
(()=>{
 const isShop=()=>document.body?.classList.contains('mvn-full-shop')
  &&new URLSearchParams(location.search).get('visual_builder')!=='1';
 const set=(selector,styles)=>{
  const node=document.querySelector(selector);if(!node)return;
  for(const [rule,value] of Object.entries(styles))node.style.setProperty(rule,value,'important');
 };
 function normalize(){
  if(!isShop())return;
  set('header.storehead',{'background-color':'#080808','background-image':'none','border-bottom':'1px solid #3e3e3e'});
  set('#shop',{'background-color':'#F8F7F5','background-image':'none',width:'100%','max-width':'none',margin:'0'});
  set('#shop>.section-title',{
   display:'flex','background-color':'#080808',background:'#080808',
   'background-image':'none',color:'#fff','border-top':'4px solid #D3AF37',
   'border-radius':'0',width:'100%','max-width':'1440px',
   'margin-left':'auto','margin-right':'auto'
  });
  set('#shop>.section-title h1',{'color':'#fff'});
  set('#shop>.section-title h1 strong',{'color':'#fff'});
  set('#shop>.section-title>p',{'color':'#d5d5d5'});
  set('#shop>.productbar',{
   'background-color':'#fff','background-image':'none',
   color:'#1C222B','max-width':'1440px',
   'margin-left':'auto','margin-right':'auto'
  });
  set('#shop>.cats',{'max-width':'1440px','margin-left':'auto','margin-right':'auto'});
  set('.mvn-compact-footer',{'background-color':'#080808','background-image':'none'});
 }
 document.addEventListener('DOMContentLoaded',normalize,{once:true});
 window.addEventListener('load',normalize,{once:true});
 window.addEventListener('pageshow',normalize);
})();
