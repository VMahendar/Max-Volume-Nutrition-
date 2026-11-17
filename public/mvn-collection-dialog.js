'use strict';
(()=>{
 const dialog=document.getElementById('mvnCollectionDialog');
 const trigger=document.getElementById('mvnOpenCollection');
 const close=document.getElementById('mvnCloseCollection');
 if(!dialog||!trigger)return;
 trigger.addEventListener('click',()=>{
  if(typeof dialog.showModal==='function')dialog.showModal();
  else window.location.href='/shop.html';
 });
 close?.addEventListener('click',()=>dialog.close());
 dialog.addEventListener('click',event=>{if(event.target===dialog)dialog.close();});
})();
