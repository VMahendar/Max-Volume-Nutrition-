'use strict';
(()=>{
const $=id=>document.getElementById(id);
const labels={header:'Header & logo',hero:'Main banner',categories:'Shop by goal',bestsellers:'Best sellers',brands:'Upcoming brands',footer:'Footer',logo:'Logo image',banner:'Banner image',whey:'Whey category image',pre:'Pre-workout category image',creatine:'Creatine category image',massPromo:'Mass gainer promotion',creatinePromo:'Creatine promotion',bestWhey:'Best seller: Whey',bestMass:'Best seller: Mass',bestCreatine:'Best seller: Creatine',bestPre:'Best seller: Pre-workout'};
const imageIds=['logo','banner','whey','pre','creatine','massPromo','creatinePromo','bestWhey','bestMass','bestCreatine','bestPre'];
let state,empty,published=null,baseRevision=null,baseline={},selection='header',images=[],history=[],ready=false,frameReady=false,dirty=false,busy=false;
async function api(path,body){const response=await fetch(path,{credentials:'same-origin',cache:'no-store',...(body?{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}:{})});let data;try{data=await response.json();}catch{throw Error('The server did not return a valid response.');}if(!response.ok){const error=Error(data.error||'Request failed ('+response.status+')');error.status=response.status;throw error;}return data;}
const clone=value=>JSON.parse(JSON.stringify(value));
const status=message=>{$('status').textContent=message;};
function controlsEnabled(){for(const id of ['save','publish'])$(id).disabled=!ready||!frameReady||busy;$('undo').disabled=!history.length||busy;}
function send(){if(!frameReady)return;$('preview').contentWindow.postMessage({type:'mvn-design',design:state,selection},location.origin);}
function snapshot(){history.push(clone(state));if(history.length>40)history.shift();}
function change(key,value){if(state.fields[key]===value)return;snapshot();state.fields[key]=value;dirty=true;status('Unsaved changes · Preview only');controlsEnabled();send();if(key.endsWith('Image'))renderSections();}
function choose(id,scroll=true){selection=id;$('selectionLabel').textContent=labels[id];$('inspectorTitle').textContent=labels[id];renderSections();renderControls();if(scroll&&frameReady)$('preview').contentWindow.postMessage({type:'mvn-select',id},location.origin);}
function renderSections(){
 const list=$('sectionList');list.replaceChildren();
 for(const id of ['header',...state.order,'footer']){
  const row=document.createElement('div');row.className='section-row'+(selection===id?' selected':'');
  const button=document.createElement('button');button.textContent=labels[id];button.onclick=()=>choose(id);row.append(button);
  if(state.order.includes(id))for(const [symbol,offset] of [['↑',-1],['↓',1]]){
   const move=document.createElement('button');move.className='move';move.textContent=symbol;move.setAttribute('aria-label','Move '+labels[id]+(offset<0?' up':' down'));const index=state.order.indexOf(id);move.disabled=index+offset<0||index+offset>=state.order.length;
   move.onclick=()=>{snapshot();[state.order[index],state.order[index+offset]]=[state.order[index+offset],state.order[index]];dirty=true;status('Unsaved section order');renderSections();controlsEnabled();send();};row.append(move);
  }list.append(row);
 }
 const photos=$('photoList');if(photos){
  photos.replaceChildren();
  for(const id of imageIds){
   const button=document.createElement('button');button.className='photo-quick'+(selection===id?' selected':'');button.type='button';
   const thumb=document.createElement('img');thumb.src='/'+(value(id+'Image')||'assets/mvn-homepage-banner-20261115.webp');thumb.alt='';thumb.loading='lazy';
   const title=document.createElement('span');title.textContent=labels[id];
   button.append(thumb,title);button.onclick=()=>{choose(id);document.querySelector('.inspector')?.scrollIntoView({block:'start',behavior:'smooth'});};
   photos.append(button);
  }
 }
}
const value=key=>Object.hasOwn(state.fields,key)?state.fields[key]:baseline[key];
function field(key,label,type='text',options={}){
 const container=document.createElement('div');const wrap=document.createElement('label');wrap.textContent=label;
 const control=document.createElement(type==='textarea'?'textarea':type==='select'?'select':'input');control.id='field-'+key;control.name=key;
 if(type==='textarea'){control.rows=3;control.maxLength=options.max||350;}
 else if(type==='select'){for(const [val,title] of options.choices){const opt=document.createElement('option');opt.value=val;opt.textContent=title;control.append(opt);}}
 else{control.type=type;if(type==='text')control.maxLength=options.max||120;}
 if(type==='range'){control.min=options.min;control.max=options.max;control.step=1;}
 if(type==='checkbox'){wrap.className='check';control.checked=value(key)!==false;}else control.value=value(key)??'';
 const output=document.createElement('output');if(type==='range'){output.textContent=control.value+(options.unit||'px');wrap.append(output);}
 control.addEventListener(type==='checkbox'||type==='select'?'change':'input',()=>{const val=type==='checkbox'?control.checked:type==='range'?Number(control.value):control.value;change(key,val);if(type==='range')output.textContent=val+(options.unit||'px');});
 wrap.append(control);container.append(wrap);
 if(Object.hasOwn(state.fields,key)){const reset=document.createElement('button');reset.className='reset-field';reset.textContent='Use original';reset.onclick=()=>{snapshot();delete state.fields[key];dirty=true;renderControls();send();controlsEnabled();status('Unsaved changes');};container.append(reset);}
 $('controls').append(container);
}
function fieldGroup(title){
 const heading=document.createElement('h3');heading.className='control-heading';heading.textContent=title;$('controls').append(heading);
}
function quickButton(label,action){
 const button=document.createElement('button');button.type='button';button.className='editor-shortcut';button.textContent=label;button.onclick=action;$('controls').append(button);
}
function imageTools(id){
 fieldGroup('Photo size, crop & position · '+labels[id]);
 field(id+'Zoom','Increase / reduce photo size','range',{min:50,max:250,unit:'%'});
 field(id+'X','Move photo left / right','range',{min:-100,max:100,unit:'%'});
 field(id+'Y','Move photo up / down','range',{min:-100,max:100,unit:'%'});
 field(id+'Fit','Photo fit','select',{choices:[['contain','Show full image'],['cover','Fill / crop image']]});
}
const categoryFields={
 whey:['categoryWheyHeadline','categoryWheyCaption'],
 pre:['categoryPreHeadline','categoryPreCaption'],
 creatine:['categoryCreatineHeadline','categoryCreatineCaption'],
 bestWhey:['bestWheyTitle','bestWheyCaption'],
 bestMass:['bestMassTitle','bestMassCaption'],
 bestCreatine:['bestCreatineTitle','bestCreatineCaption'],
 bestPre:['bestPreTitle','bestPreCaption'],
 massPromo:['promoMassTag','promoMassHeadline'],
 creatinePromo:['promoCreatineTag','promoCreatineHeadline']
};
function renderControls(){
 $('controls').replaceChildren();$('media').hidden=true;
 if(selection==='header'){
  fieldGroup('Header layout');
  field('headerColor','Header background','color');field('headerText','Header text & icons','color');
  field('headerHeight','Header height','range',{min:48,max:180});
  field('logoWidth','Logo width','range',{min:70,max:480});
  field('logoAlign','Logo placement','select',{choices:[['left','Left'],['center','Centre']]});
  field('announcementText','Top announcement','text',{max:90});
  field('navVisible','Show header navigation','checkbox');
  quickButton('Replace or resize the logo photo',()=>choose('logo'));
  mediaFor('logo');
 }else if(selection==='hero'||selection==='banner'){
  fieldGroup('Main homepage banner');
  mediaFor('banner');
  field('heroVisible','Show entire banner section','checkbox');
  field('heroTextVisible','Show headline over banner','checkbox');
  field('heroTitle','Main heading','textarea',{max:120});
  field('heroDescription','Banner description','textarea',{max:350});
  field('heroButton','Primary shop button','text',{max:70});
  field('heroSecondaryButton','Secondary button','text',{max:70});
  field('titleSize','Heading font size','range',{min:24,max:140});
  field('descriptionSize','Description font size','range',{min:12,max:36});
  field('heroCopyWidth','Banner text container width','range',{min:25,max:100,unit:'%'});
  field('heroAlign','Banner text alignment','select',{choices:[['left','Left'],['center','Center'],['right','Right']]});
  field('bannerHeight','Banner section height','range',{min:180,max:1100});
  field('bannerFit','Banner crop','select',{choices:[['cover','Fill banner'],['contain','Show full banner']]});
  field('bannerPosition','Banner focal point left / right','range',{min:0,max:100,unit:'%'});
  field('bannerPositionY','Banner focal point top / bottom','range',{min:0,max:100,unit:'%'});
  imageTools('banner');
  field('promoVisible','Show two product promotion cards','checkbox');
  quickButton('Resize the mass gainer promotion photo',()=>choose('massPromo'));
  quickButton('Resize the creatine promotion photo',()=>choose('creatinePromo'));
 }else if(selection==='categories'){
  fieldGroup('Shop by goal cards');
  field('categoriesVisible','Show categories','checkbox');
  field('categoriesTitle','Section heading','text',{max:90});
  field('goalPhotosVisible','Show category product photos','checkbox');
  field('categoryCardHeight','Card height','range',{min:90,max:480});
  field('categoryGap','Space between cards','range',{min:0,max:50});
  field('categoryCardColor','Card background','color');
  field('categoryWheyHeadline','Whey headline','text',{max:85});
  field('categoryWheyCaption','Whey caption','text',{max:65});
  field('categoryPreHeadline','Pre-workout headline','text',{max:85});
  field('categoryPreCaption','Pre-workout caption','text',{max:65});
  field('categoryCreatineHeadline','Creatine headline','text',{max:85});
  field('categoryCreatineCaption','Creatine caption','text',{max:65});
  field('categoryMassHeadline','Mass gainer headline','text',{max:85});
  field('categoryMassCaption','Mass gainer caption','text',{max:65});
  for(const id of ['whey','pre','creatine'])quickButton('Replace / resize '+labels[id],()=>choose(id));
 }else if(selection==='bestsellers'){
  fieldGroup('Best sellers');
  field('bestsellersVisible','Show best sellers','checkbox');
  field('bestsellersTitle','Section heading','text',{max:90});
  field('bestImageHeight','Product image area height','range',{min:80,max:480});
  for(const id of ['bestWhey','bestMass','bestCreatine','bestPre']){
   const [title,caption]=categoryFields[id];
   field(title,labels[id]+' name','text',{max:85});
   field(caption,labels[id]+' caption','text',{max:65});
   quickButton('Replace / resize '+labels[id]+' photo',()=>choose(id));
  }
 }else if(selection==='brands'){
  fieldGroup('Upcoming brand section');
  field('brandsVisible','Show upcoming brands','checkbox');
  field('brandTag','Top label','text',{max:85});
  field('brandTitle','Brand heading','text',{max:90});
  field('brandHighlight','Brand detail','text',{max:120});
  field('brandDescription','Supporting description','textarea',{max:260});
  field('brandButton','Enquiry button label','text',{max:70});
 }else if(selection==='footer'){
  fieldGroup('Footer / contact');
  field('footerTitle','Footer heading','text',{max:100});
  field('footerSubtitle','Supporting text','textarea',{max:240});
  field('footerColor','Footer background','color');
  field('footerText','Footer text colour','color');
 }else if(imageIds.includes(selection)){
  fieldGroup('Replace '+labels[selection]);
  mediaFor(selection);
  imageTools(selection);
  if(categoryFields[selection]){
   const [headline,caption]=categoryFields[selection];
   if(['massPromo','creatinePromo'].includes(selection)){
    field(headline,'Promotion top label','text',{max:65});
    field(caption,'Promotion headline','text',{max:85});
   }else{
    field(headline,'Card headline / title','text',{max:85});
    field(caption,'Card caption / label','text',{max:65});
   }
  }
  if(['whey','pre','creatine'].includes(selection)){
   field('goalPhotosVisible','Show category photos on homepage','checkbox');
   field('categoryCardHeight','Category card height','range',{min:90,max:480});
  }
  if(['massPromo','creatinePromo'].includes(selection))field('promoVisible','Show promotion cards','checkbox');
 }
 fieldGroup('Global homepage appearance');
 field('sectionGap','Space between sections','range',{min:0,max:100});
 field('pageColor','Page background','color');
 field('accentColor','Button accent','color');
}
let mediaTarget='logo';
function mediaFor(id){
 mediaTarget=id;$('media').hidden=false;
 const title=$('mediaTitle');if(title)title.textContent='Replace '+labels[id];
 const current=$('currentPhoto');if(current){const src=value(id+'Image');current.src=src?'/'+src:'';current.alt='Current '+labels[id];}
 renderImages();
}
function renderImages(){const current=$('currentPhoto');if(current){const src=value(mediaTarget+'Image');if(src)current.src='/'+src;}
 const search=$('mediaSearch').value.trim().toLowerCase(),host=$('imageLibrary');host.replaceChildren();const chosen=value(mediaTarget+'Image');const visible=images.filter(src=>!search||src.toLowerCase().includes(search)).slice(0,60);for(const src of visible){const button=document.createElement('button');button.title=src;button.setAttribute('aria-label','Use '+src.split('/').pop());if(src===chosen)button.style.borderColor='#fa633e';const img=document.createElement('img');img.src='/'+src;img.loading='lazy';img.alt='';const name=document.createElement('span');name.textContent=src.split('/').pop();button.append(img,name);button.onclick=()=>{change(mediaTarget+'Image',src);renderImages();};host.append(button);}}
$('mediaSearch').oninput=renderImages;
$('upload').onchange=async()=>{const file=$('upload').files[0];if(!file)return;const target=mediaTarget;if(file.size>8*1024*1024){status('Choose an image smaller than 8 MB.');$('upload').value='';return;}busy=true;controlsEnabled();status('Uploading image…');try{const content=await new Promise((ok,no)=>{const reader=new FileReader();reader.onload=()=>ok(String(reader.result).split(',')[1]);reader.onerror=()=>no(Error('Unable to read image'));reader.readAsDataURL(file);});const result=await api('/api/admin/homepage-images',{content});images.unshift(result.path);change(target+'Image',result.path);renderImages();status('Image uploaded · Save or publish when ready');}catch(error){status(error.message);}finally{busy=false;$('upload').value='';controlsEnabled();}};
$('undo').onclick=()=>{if(!history.length)return;state=history.pop();dirty=true;renderSections();renderControls();send();controlsEnabled();status('Change undone · Not published');};
$('reset').onclick=()=>{snapshot();state=clone(published||empty);dirty=true;renderSections();renderControls();send();controlsEnabled();status('Published design restored in preview');};
async function persist(action){if(!ready||busy)return;busy=true;controlsEnabled();status(action==='publish'?'Publishing homepage…':'Saving draft…');try{const result=await api('/api/admin/homepage-design',{action,design:state,baseRevision});state=result.design;if(action==='publish'){published=clone(state);baseRevision=state.revision;}dirty=false;status(action==='publish'?'Published · Your homepage is updated':'Draft saved · Not published');}catch(error){status(error.message);if(error.status===401||error.status===403){ready=false;showLogin('Your session expired. Sign in here to continue.');}}finally{busy=false;controlsEnabled();}}
$('save').onclick=()=>persist('save');$('publish').onclick=()=>persist('publish');
let device='desktop';
function resizePreview(){
 const frame=$('preview'),host=frame.parentElement,padding=getComputedStyle(host),width=device==='mobile'?390:1440;
 const available=Math.max(200,host.clientWidth-parseFloat(padding.paddingLeft)-parseFloat(padding.paddingRight));
 const height=Math.max(350,host.clientHeight-parseFloat(padding.paddingTop)-parseFloat(padding.paddingBottom));
 const scale=Math.min(1,available/width);
 frame.style.width=width+'px';frame.style.height=height/scale+'px';frame.style.zoom=String(scale);
}
new ResizeObserver(resizePreview).observe($('preview').parentElement);
for(const button of document.querySelectorAll('[data-device]'))button.onclick=()=>{for(const other of document.querySelectorAll('[data-device]')){other.classList.toggle('active',other===button);other.setAttribute('aria-pressed',String(other===button));}device=button.dataset.device;$('preview').classList.toggle('mobile',device==='mobile');resizePreview();};
addEventListener('message',event=>{if(event.origin!==location.origin||event.source!==$('preview').contentWindow)return;if(event.data?.type==='mvn-ready'){baseline=event.data.baseline;frameReady=true;renderSections();renderControls();send();controlsEnabled();}else if(event.data?.type==='mvn-selected'&&labels[event.data.id])choose(event.data.id,false);});
function showLogin(message='',switchAccount=false){$('login').hidden=false;$('workspace').hidden=true;$('loginMessage').textContent=message;$('loginForm').hidden=switchAccount;$('switchAccount').hidden=!switchAccount;status('Owner sign-in required');}
$('switchAccount').onclick=async()=>{try{await api('/api/logout',{});showLogin();}catch(error){$('loginMessage').textContent=error.message;}};
$('loginForm').onsubmit=async event=>{event.preventDefault();const button=event.submitter;button.disabled=true;$('loginMessage').textContent='Signing in…';try{const result=await api('/api/login',Object.fromEntries(new FormData(event.currentTarget)));$('loginForm').elements.password.value='';if(result.user?.role!=='admin'){showLogin('This account does not have administrator access. Use your owner account.',true);return;}await load();}catch(error){$('loginMessage').textContent=error.message;}finally{button.disabled=false;}};
async function load(){try{const result=await api('/api/admin/homepage-design');const media=await api('/api/admin/homepage-images');empty=result.empty;published=result.published;baseRevision=published?.revision||null;if(!state)state=clone(result.draft||published||empty);images=media.images;ready=true;frameReady=false;$('login').hidden=true;$('workspace').hidden=false;renderSections();status(result.draft?'Private draft loaded':'Ready · Select a section to edit');$('preview').src='/?homepage_editor=1';controlsEnabled();}catch(error){if(error.status===401||error.status===403){const session=await api('/api/session');showLogin(session.user?'Use your administrator account to edit the homepage.':'',!!session.user);}else{$('failure').hidden=false;$('failure').textContent=error.message;status('Editor could not load');}}}
addEventListener('beforeunload',event=>{if(dirty){event.preventDefault();event.returnValue='';}});
void load();
})();
