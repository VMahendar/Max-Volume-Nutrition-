import {api,esc} from './commerce-api.js';

const form=document.getElementById('bannerEditorForm');
if(form){
 const host=document.getElementById('bannerSlideCards'),message=document.getElementById('bannerEditorMessage');
 let state=null,publishedRevision=null,choices=[],loaded=false,busy=false;
 const input=(label,field,value,max,area=false)=>`<label>${label}<${area?'textarea':'input'} data-banner-field="${field}" ${area?'rows="3"':'type="text"'} maxlength="${max}" required${area?'':` value="${esc(value)}"`}>${area?esc(value)+'</textarea>':''}</label>`;
 function photoOptions(photo,optional){
  const items=[...choices];
  if(photo&&!items.some(x=>x.src===photo.src))items.push(photo);
  return `<option value="">${optional?'No supporting photo':'Choose a product photo'}</option>`+items.map(p=>`<option value="${esc(p.src)}"${photo?.src===p.src?' selected':''}>${esc(p.alt)}</option>`).join('');
 }
 function capture(){
  if(!state)return;
  state.enabled=document.getElementById('bannerEnabled').checked;
  state.autoplay=document.getElementById('bannerAutoplay').checked;
  state.intervalMs=Number(document.getElementById('bannerInterval').value);
  host.querySelectorAll('[data-slide-id]').forEach(card=>{
   const slide=state.slides.find(s=>s.id===card.dataset.slideId);
   for(const field of card.querySelectorAll('[data-banner-field]'))slide[field.dataset.bannerField]=field.value;
   slide.images=Array.from(card.querySelectorAll('[data-photo-slot]')).flatMap(select=>{
    if(!select.value)return [];
    const photo=choices.find(p=>p.src===select.value)||slide.images.find(p=>p.src===select.value);
    return photo?[{...photo}]:[];
   });
  });
 }
 function render(){
  document.getElementById('bannerEnabled').checked=state.enabled;
  document.getElementById('bannerAutoplay').checked=state.autoplay;
  document.getElementById('bannerInterval').value=state.intervalMs;
  host.innerHTML=state.slides.map((slide,i)=>`<article class="banner-slide-card" data-slide-id="${esc(slide.id)}"><header><h3>Slide ${i+1} · ${esc(slide.name)}</h3><div><button type="button" data-slide-up${i===0?' disabled':''} aria-label="Move slide ${i+1} up">↑</button><button type="button" data-slide-down${i===state.slides.length-1?' disabled':''} aria-label="Move slide ${i+1} down">↓</button><button type="button" data-slide-remove${state.slides.length<=3?' disabled':''}>Remove</button></div></header><div class="banner-slide-fields">${input('Slide name','name',slide.name,80)}${input('Small label','eyebrow',slide.eyebrow,100)}${input('White headline','title',slide.title,70)}${input('Gold headline','highlight',slide.highlight,70)}${input('Description','description',slide.description,300,true)}${input('Button words','button',slide.button,45)}${input('Store page link','href',slide.href,300)}</div><div class="banner-slide-photos">${[0,1,2].map(slot=>`<div><label>${slot===0?'Main product':'Supporting product '+slot}<select data-photo-slot="${slot}"${slot===0?' required':''}>${photoOptions(slide.images[slot],slot>0)}</select></label><div class="banner-photo-preview${slide.images[slot]?.format==='official'?' official':''}">${slide.images[slot]?`<img src="/${esc(slide.images[slot].src)}" alt="${esc(slide.images[slot].alt)}">`:''}</div><label class="banner-upload">Upload a photo<input type="file" accept="image/png,image/jpeg,image/webp" data-upload-slot="${slot}"></label></div>`).join('')}</div></article>`).join('');
  document.getElementById('bannerAddSlide').disabled=state.slides.length>=8;
 }
 async function load(){
  if(busy)return;busy=true;message.textContent='Loading banners…';
  try{
   const [data,catalog]=await Promise.all([api('/api/admin/homepage-carousel'),api('/api/admin/overview')]);
   choices=[];
   for(const p of catalog.products||[])for(const v of p.variants||[]){
    const src=v.image||p.image;if(!src||choices.some(x=>x.src===src))continue;
    choices.push({src,alt:((p.brand||'')+' '+p.name+' · '+v.label).trim(),format:src.includes('globtech-')?'official':'cutout'});
   }
   state=structuredClone(data.draft||data.published||data.defaults);publishedRevision=data.published?.revision||null;loaded=true;render();
   message.textContent=data.draft?'Draft loaded. Save changes before opening the draft preview.':state.slides.length+' slides are ready. Edit and save a draft to preview changes.';
  }catch(error){message.textContent=error.message;}finally{busy=false;}
 }
 async function save(action){
  if(!loaded||busy||!form.reportValidity())return;
  capture();busy=true;
  for(const b of form.querySelectorAll('button,input,textarea,select'))b.disabled=true;
  message.textContent=action==='publish'?'Publishing banners…':'Saving draft…';
  try{
   const data=await api('/api/admin/homepage-carousel',{action,baseRevision:publishedRevision,carousel:state});
   state=data.carousel;if(action==='publish')publishedRevision=state.revision;
   message.textContent=action==='publish'?'Published. Your live homepage is updated.':'Draft saved. Open the preview to review it.';
  }catch(error){message.textContent=error.message;}finally{busy=false;for(const control of form.querySelectorAll('button,input,textarea,select'))control.disabled=false;render();}
 }
 form.onsubmit=event=>{event.preventDefault();void save('save');};
 document.getElementById('bannerPublish').onclick=()=>void save('publish');
 document.getElementById('bannerReload').onclick=()=>void load();
 document.getElementById('bannerAddSlide').onclick=()=>{
  if(!state||state.slides.length>=8)return;capture();
  const next=structuredClone(state.slides.at(-1));next.id='slide-'+crypto.randomUUID();next.name='New product slide';state.slides.push(next);render();
 };
 host.addEventListener('click',event=>{
  const button=event.target.closest('[data-slide-up],[data-slide-down],[data-slide-remove]');if(!button||busy)return;
  capture();const card=button.closest('[data-slide-id]'),i=state.slides.findIndex(s=>s.id===card.dataset.slideId);
  if(button.hasAttribute('data-slide-remove')){if(state.slides.length>3)state.slides.splice(i,1);}
  else{const j=i+(button.hasAttribute('data-slide-up')?-1:1);if(j>=0&&j<state.slides.length)[state.slides[i],state.slides[j]]=[state.slides[j],state.slides[i]];}
  render();
 });
 host.addEventListener('change',async event=>{
  const select=event.target.closest('[data-photo-slot]');
  if(select){
   const photo=choices.find(p=>p.src===select.value)||state.slides.flatMap(s=>s.images).find(p=>p.src===select.value),preview=select.closest('div').querySelector('.banner-photo-preview');
   preview.replaceChildren();preview.classList.toggle('official',photo?.format==='official');
   if(photo){const img=document.createElement('img');img.src='/'+photo.src;img.alt=photo.alt;preview.append(img);}return;
  }
  const upload=event.target.closest('[data-upload-slot]'),file=upload?.files?.[0];if(!file)return;
  if(busy)return;busy=true;message.textContent='Uploading product photo…';
  try{
   if(!['image/png','image/jpeg','image/webp'].includes(file.type)||file.size>8*1024*1024)throw Error('Choose a PNG, JPG or WebP smaller than 8 MB.');
   const dataURL=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=reject;reader.readAsDataURL(file);});
   const result=await api('/api/admin/homepage-images',{content:dataURL.split(',')[1]});
   capture();const slide=state.slides.find(s=>s.id===upload.closest('[data-slide-id]').dataset.slideId),slot=Number(upload.dataset.uploadSlot);
   const photo={src:result.path,alt:file.name.replace(/\.[^.]+$/,'').slice(0,200)||'Uploaded product photo',format:'cutout'};choices.push(photo);
   // Select the slot before capturing so removing optional images never creates holes.
   const target=upload.closest('div').querySelector('select'),option=document.createElement('option');option.value=photo.src;option.textContent=photo.alt;target.append(option);target.value=photo.src;
   slide.images=Array.from(upload.closest('[data-slide-id]').querySelectorAll('[data-photo-slot]')).flatMap(s=>{const photo=choices.find(p=>p.src===s.value)||slide.images.find(p=>p.src===s.value);return photo?[{...photo}]:[];});
   render();message.textContent='Photo uploaded. Save a draft or publish to apply it.';
  }catch(error){message.textContent=error.message;}finally{busy=false;}
 });
 document.addEventListener('admin-overview',()=>{if(!loaded)void load();});
 if(document.getElementById('dashboard')&&!document.getElementById('dashboard').hidden)void load();
}
