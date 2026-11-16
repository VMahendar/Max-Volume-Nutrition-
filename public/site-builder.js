'use strict';
(()=>{
const $=id=>document.getElementById(id);
const frame=$('preview'),status=message=>{$('status').textContent=message;};
const pages=new Set(['/','/shop.html','/about.html','/contact.html','/dealer.html','/brands.html','/potency-whey.html','/nitro-mass.html','/pro-creatine.html','/sturdy-pre-workout.html','/offers.html','/support.html','/wholesale-account.html']);
let documentState={version:1,pages:{}},published={version:1,pages:{}},baseRevision=null,page='/',selected=null,ready=false,busy=false,dirty=false,clipboard=null,history=[],future=[],view='desktop',mode='move';
const clone=data=>JSON.parse(JSON.stringify(data));
const newId=()=> 'v'+crypto.randomUUID().replaceAll('-','');
async function api(path,body){
 const response=await fetch(path,{credentials:'same-origin',cache:'no-store',...(body!==undefined?{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}:{})});
 const data=await response.json().catch(()=>({}));
 if(!response.ok){const err=Error(data.error||'Server error '+response.status);err.status=response.status;throw err;}
 return data;
}
function operations(){return documentState.pages[page]||(documentState.pages[page]=[]);}
function controls(){
 const available=!!selected;
 for(const id of ['copy','cut','duplicate','delete','restore'])$(id).disabled=!available||busy;
 $('paste').disabled=!clipboard||busy;
 for(const id of ['save','publish'])$(id).disabled=!ready||busy;
 $('undo').disabled=!history.length||busy;
 $('redo').disabled=!future.length||busy;
}
function change(fn){
 history.push(clone(documentState));if(history.length>60)history.shift();future=[];
 fn();dirty=true;controls();send();status('Unsaved visual changes. Save a private draft or publish when ready.');
}
function send(){if(ready){frame.contentWindow?.postMessage({type:'mvn-visual-design',document:documentState},location.origin);frame.contentWindow?.postMessage({type:'mvn-visual-mode',mode},location.origin);}}
function add(action,extras={},target=selected?.target){
 if(!target){status('Select a page element first.');return;}
 const device=$('device').value;
 change(()=>operations().push({id:newId(),action,target,device,...extras}));
}
function updateValues(values,action='style'){
 if(!selected)return;
 const items=operations(),found=[...items].reverse().find(op=>op.target===selected.target&&op.device===$('device').value&&['move','resize','style'].includes(op.action));
 change(()=>{
  if(found){found.values={...found.values,...values};found.action='style';}
  else items.push({id:newId(),action,target:selected.target,device:$('device').value,values});
 });
}
function choosePage(path){
 if(!pages.has(path))return;
 page=path;ready=false;selected=null;controls();$('page').value=path;
 $('selectionName').textContent='Click any element on the page';$('propertyControls').hidden=true;$('emptyProperties').hidden=false;
 $('pageName').textContent=$('page').selectedOptions[0]?.textContent||path;
 frame.src=path+(path.includes('?')?'&':'?')+'visual_builder=1';
 status('Opening editable '+path+'. Drag orange handles to move or resize.');
}
function chooseSelection(info){
 selected=info;$('selectionName').textContent=info.tag.toUpperCase()+' · '+info.target.slice(-100);
 $('propertyControls').hidden=false;$('emptyProperties').hidden=true;
 $('text').value=info.text||'';
 $('width').value=info.width||'';$('height').value=info.height||'';
 const existing=[...(documentState.pages[page]||[])].reverse().find(op=>op.target===selected.target&&op.values);
 const v=existing?.values||{};
 for(const id of ['x','y','fontSize','opacity'])$(id).value=v[id]??(id==='opacity'?100:0);
 $('color').value=v.color||'#ffffff';$('backgroundColor').value=v.backgroundColor||'#202020';
 $('replaceSelected').hidden=info.tag!=='img';
 $('fullBleed').textContent=v.fullBleed?'⛶ Remove full-width override':'⛶ Extend to full width';
 controls();
}
function addNew(element,src){
 const target=selected?.target||'body';
 const data={element,position:'inside',text:element==='button'?'Shop now':element==='text'?'Your new text':'',...(element==='button'?{href:'/shop.html'}:{}),...(src?{src}:{})};
 add('insert',data,target);
}
$('page').onchange=e=>choosePage(e.target.value);
for(const button of document.querySelectorAll('[data-view]'))button.onclick=()=>{
 view=button.dataset.view;
 for(const b of document.querySelectorAll('[data-view]'))b.classList.toggle('selected',b===button);
 frame.classList.toggle('mobile',view==='mobile');
 frame.style.width=view==='mobile'?'390px':'100%';frame.style.height=view==='mobile'?'790px':'100%';
 frame.contentWindow?.location.reload();
};
function chooseMode(next){
 mode=next==='scroll'?'scroll':'move';
 $('moveMode').classList.toggle('selected',mode==='move');
 $('scrollMode').classList.toggle('selected',mode==='scroll');
 if(ready)frame.contentWindow?.postMessage({type:'mvn-visual-mode',mode},location.origin);
 status(mode==='move'?'MOVE MODE · Drag any photo/text. Four orange corners resize it.':'SCROLL MODE · Swipe to browse the page. Select Move / Resize to edit.');
}
$('moveMode').onclick=()=>chooseMode('move');
$('scrollMode').onclick=()=>chooseMode('scroll');
$('fit').onclick=()=>{
 const on=$('workspace').classList.toggle('canvas-wide');
 $('fit').textContent=on?'Show side panels':'Full width';
 status(on?'Full-width canvas. Click Show side panels to access editing properties.':'Editing panels restored.');
 requestAnimationFrame(()=>frame.style.width=view==='mobile'?'390px':'100%');
};
$('addText').onclick=()=>addNew('text');
$('addButton').onclick=()=>addNew('button');
$('addBox').onclick=()=>addNew('box');
$('addImage').onclick=()=>$('fileUpload').click();
$('replaceSelected').onclick=()=>$('fileUpload').click();
$('fullBleed').onclick=()=>{
 if(!selected)return;
 const op=(documentState.pages[page]||[]).slice().reverse().find(item=>item.target===selected.target&&item.values);
 const next=!(op?.values?.fullBleed);
 updateValues({fullBleed:next},'style');
 $('fullBleed').textContent=next?'⛶ Remove full-width override':'⛶ Extend to full width';
};
$('copy').onclick=()=>{clipboard=selected?{page,target:selected.target,cut:false}:null;controls();status(clipboard?'Element copied. Choose Paste to duplicate it.':'Select an element to copy.');};
$('cut').onclick=()=>{clipboard=selected?{page,target:selected.target,cut:true}:null;controls();status(clipboard?'Element marked for cutting. Paste to move it.':'Select an element first.');};
$('paste').onclick=()=>{
 if(!clipboard)return;if(clipboard.page!==page){status('Open the copied element’s page before pasting it.');return;}
 if(clipboard.cut){const target=clipboard.target;change(()=>{operations().push({id:newId(),action:'duplicate',target,device:$('device').value});operations().push({id:newId(),action:'hide',target,device:$('device').value});});clipboard=null;controls();}
 else add('duplicate',{},clipboard.target);
};
$('duplicate').onclick=()=>{if(selected)add('duplicate');};
$('delete').onclick=()=>{if(selected)add('hide');};
$('restore').onclick=()=>{
 if(!selected)return;
 change(()=>{documentState.pages[page]=operations().filter(op=>op.target!==selected.target);});
};
$('setText').onclick=()=>{if(selected)add('text',{text:$('text').value.slice(0,1200)});};
$('applyStyle').onclick=()=>{
 if(!selected)return;const values={};
 for(const id of ['width','height','x','y','fontSize','opacity']){
  const field=$(id);if(field.value==='')continue;let n=Number(field.value);
  const minimum=Number(field.min||-1800),maximum=Number(field.max||2200);
  values[id]=Math.max(minimum,Math.min(maximum,Math.round(n)));
 }
 for(const id of ['color','backgroundColor'])if($(id).value)values[id]=$(id).value;
 updateValues(values);
};
$('fileUpload').onchange=async()=>{
 const file=$('fileUpload').files[0];if(!file)return;
 $('fileUpload').value='';
 if(file.size>8*1024*1024){status('Choose a PNG, JPG or WebP image smaller than 8 MB.');return;}
 busy=true;controls();status('Uploading selected photo privately…');
 try{
  const content=await new Promise((resolve,reject)=>{
   const reader=new FileReader();reader.onload=()=>resolve(String(reader.result).split(',')[1]);reader.onerror=()=>reject(Error('Photo could not be read'));reader.readAsDataURL(file);
  });
  const response=await api('/api/admin/homepage-images',{content});
  if(selected?.tag==='img')add('image',{src:response.path});
  else addNew('image',response.path);
  status('Photo uploaded. Drag its corners in the preview. Publish when approved.');
 }catch(error){status('Upload failed: '+error.message);}finally{busy=false;controls();}
};
$('undo').onclick=()=>{if(!history.length)return;future.push(clone(documentState));documentState=history.pop();dirty=true;send();controls();};
$('redo').onclick=()=>{if(!future.length)return;history.push(clone(documentState));documentState=future.pop();dirty=true;send();controls();};
async function save(action){
 if(busy||!ready)return;busy=true;controls();status(action==='publish'?'Publishing design…':'Saving private draft…');
 try{
  const result=await api('/api/admin/visual-builder',{action,design:documentState,baseRevision,page});
  documentState=result.design;
  if(action==='publish'){published=clone(documentState);baseRevision=result.revision;status('Selected page published. Other pages stay unchanged.');}
  else status('Private draft saved. Public store unchanged.');
  dirty=false;
 }catch(error){status('Save failed: '+error.message);}
 finally{busy=false;controls();}
}
$('save').onclick=()=>save('save');
$('publish').onclick=()=>{
 if(!confirm('Publish visual changes on '+page+'? Catalogue, orders and checkout stay protected.'))return;
 save('publish');
};
addEventListener('message',event=>{
 if(event.origin!==location.origin||event.source!==frame.contentWindow||!event.data)return;
 const data=event.data;
 if(data.type==='mvn-visual-ready'){ready=true;controls();send();status('Canvas ready. Drag an element directly to move, or pull any orange corner to resize. On mobile, tap Scroll Page to browse.');}
 if(data.type==='mvn-visual-select')chooseSelection(data);
 if(data.type==='mvn-visual-operation'){
  if(!pages.has(page)||!data.target)return;
  selected={...(selected||{}),target:data.target};
  updateValues(data.values,data.action);
  for(const [key,value] of Object.entries(data.values))if($(key))$(key).value=value;
 }
});
addEventListener('keydown',e=>{
 if(!ready||['INPUT','TEXTAREA','SELECT'].includes(document.activeElement?.tagName))return;
 if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='c'&&selected){e.preventDefault();$('copy').click();}
 else if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='x'&&selected){e.preventDefault();$('cut').click();}
 else if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='v'&&clipboard){e.preventDefault();$('paste').click();}
 else if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='z'){e.preventDefault();(e.shiftKey?$('redo'):$('undo')).click();}
 else if((e.key==='Delete'||e.key==='Backspace')&&selected){e.preventDefault();$('delete').click();}
});
addEventListener('beforeunload',e=>{if(dirty){e.preventDefault();e.returnValue='';}});
async function load(){
 try{
  const result=await api('/api/admin/visual-builder');
  documentState=clone(result.draft||result.published||{version:1,pages:{}});
  published=result.published||{version:1,pages:{}};baseRevision=result.revision||null;
  $('login').hidden=true;$('workspace').hidden=false;choosePage('/');
 }catch(error){
  if(error.status===401||error.status===403){$('login').hidden=false;$('workspace').hidden=true;}
  else{$('failure').hidden=false;$('failure').textContent=error.message;}
 }
}
$('loginForm').onsubmit=async e=>{
 e.preventDefault();
 try{const response=await api('/api/login',Object.fromEntries(new FormData($('loginForm'))));
  if(response.user?.role!=='admin')throw Error('Use your MVN owner administrator account.');
  $('loginForm').elements.password.value='';await load();
 }catch(error){$('loginError').textContent=error.message;}
};
void load();
})();
