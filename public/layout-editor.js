'use strict';
(function(){
const allowed=['collection','banner','products','highlights','wholesale'];
const images=['assets/mvn-homepage-banner-20261115.webp','assets/mvn-hero-whey-cutout-card.webp','assets/unicorn-pro-series-nitro-mass-5kg-double-rich-chocolate-cutout.webp'];
const defaults=()=>({version:1,theme:{navy:'#0b2b4f',accent:'#ec6733',paper:'#f6f7f9',spacing:18,radius:12,logo:100},sections:[
{id:'collection',visible:true,title:'SHOP THE COLLECTION.',subtitle:'Explore original supplements and choose your preferred pack.',cta:'',image:images[0]},
{id:'banner',visible:false,title:'Products banner',subtitle:'Original supplement group photograph.',cta:'',image:images[0]},
{id:'products',visible:true,title:'OUR PRODUCTS',subtitle:'Choose from the current sports nutrition catalogue.',cta:'',image:images[0]},
{id:'highlights',visible:false,title:'WHY SHOP WITH US',subtitle:'Verified product photography and direct support.',cta:'',image:images[0]},
{id:'wholesale',visible:false,title:'WHOLESALE ENQUIRIES',subtitle:'For gyms, trainers and supplement retailers in Tamil Nadu.',cta:'CONTACT WHOLESALE',image:images[0]}
]});
const $=id=>document.getElementById(id);
const escapeText=(value,max)=>String(value==null?'':value).slice(0,max);
const hex=value=>typeof value==='string'&&/^#[a-f0-9]{6}$/i.test(value);
const between=(value,minimum,maximum,fallback)=>Number.isFinite(Number(value))?Math.max(minimum,Math.min(maximum,Math.round(Number(value)))):fallback;
function normalize(data){
const basis=defaults();if(!data||data.version!==1||!Array.isArray(data.sections))return basis;
const names=new Set();
const cleanSections=[];
for(const section of data.sections){
if(!section||!allowed.includes(section.id)||names.has(section.id))continue;
names.add(section.id);
const fallback=basis.sections.find(item=>item.id===section.id);
cleanSections.push({id:section.id,visible:section.visible===true,title:escapeText(section.title,90),subtitle:escapeText(section.subtitle,240),cta:escapeText(section.cta,48),image:images.includes(section.image)?section.image:fallback.image});
}
for(const section of basis.sections)if(!names.has(section.id))cleanSections.push(section);
const source=data.theme||{};
return {version:1,theme:{
navy:hex(source.navy)?source.navy:basis.theme.navy,
accent:hex(source.accent)?source.accent:basis.theme.accent,
paper:hex(source.paper)?source.paper:basis.theme.paper,
spacing:between(source.spacing,0,48,18),
radius:between(source.radius,0,28,12),
logo:between(source.logo,65,150,100)
},sections:cleanSections};
}
let state=defaults(),selection='collection',history=[],ready=false,dirty=false;
const titles={collection:'Collection heading',banner:'Image banner',products:'Product collection',highlights:'Benefits strip',wholesale:'Wholesale section'};
const setStatus=text=>{$('status').textContent=text};
function snapshot(){if(!ready)return;history.push(JSON.stringify(state));if(history.length>25)history.shift();$('undo').disabled=!history.length}
function changed(){dirty=true;setStatus('Unsaved changes');$('save').disabled=false}
function select(id){selection=id;renderSections();renderCanvas();renderInspector()}
function reorder(from,to){if(from===to||from<0||to<0||from>=state.sections.length||to>=state.sections.length)return;snapshot();const item=state.sections.splice(from,1)[0];state.sections.splice(to,0,item);changed();renderSections();renderCanvas()}
function sectionNode(section){
const wrapper=document.createElement('section');wrapper.className='preview-section block-'+section.id+(selection===section.id?' selected':'');
const mark=document.createElement('span');mark.className='marker';mark.textContent=titles[section.id];wrapper.append(mark);
const body=document.createElement('div');body.className='section-content';
const kicker=document.createElement('small');kicker.className='kicker';kicker.textContent=section.id==='products'?'SPORTS NUTRITION':'MAX VOLUME NUTRITION';
if(section.id!=='banner')body.append(kicker);
if(section.id==='banner'){const img=document.createElement('img');img.src='/'+section.image;img.alt='Approved product photograph';body.append(img)}
else{
const heading=document.createElement(section.id==='collection'?'h1':'h2');heading.textContent=section.title;body.append(heading);
const paragraph=document.createElement('p');paragraph.textContent=section.subtitle;body.append(paragraph);
if(section.id==='products'){
const cards=document.createElement('div');cards.className='cards';
const samples=[['Potency Whey 5 lb','assets/mvn-hero-whey-cutout-card.webp'],['Nitro Mass 5 kg','assets/unicorn-pro-series-nitro-mass-5kg-double-rich-chocolate-cutout.webp'],['Sturdy Pre-Workout','assets/sturdy-watermelon-front-card.webp']];
for(const sample of samples){
const tile=document.createElement('div');tile.className='card';
const image=document.createElement('img');image.src='/'+sample[1];image.alt=sample[0];
const name=document.createElement('b');name.textContent=sample[0];
const note=document.createElement('small');note.textContent='Preview card';
tile.append(image,name,note);cards.append(tile);
}body.append(cards);
}
if(section.id==='highlights'){const tags=document.createElement('div');tags.className='highlight-items';for(const label of ['Original pack photos','WhatsApp support','Gym & retail supply']){const el=document.createElement('span');el.textContent=label;tags.append(el)}body.append(tags)}
if(section.cta){const cta=document.createElement('span');cta.className='preview-cta';cta.textContent=section.cta;body.append(cta)}
}
wrapper.append(body);wrapper.addEventListener('click',()=>select(section.id));return wrapper;
}
function renderCanvas(){
const canvas=$('canvas');const theme=state.theme;canvas.style.setProperty('--navy',theme.navy);canvas.style.setProperty('--accent',theme.accent);canvas.style.setProperty('--paper',theme.paper);canvas.style.setProperty('--space',theme.spacing+'px');canvas.style.setProperty('--radius',theme.radius+'px');canvas.style.setProperty('--logo',theme.logo+'%');
const host=$('canvasSections');host.replaceChildren();
for(const section of state.sections)if(section.visible)host.append(sectionNode(section));
}
function renderSections(){
const host=$('sectionList');host.replaceChildren();
state.sections.forEach((section,index)=>{
const row=document.createElement('div');row.className='section-row'+(section.id===selection?' selected':'');row.dataset.id=section.id;row.draggable=true;
const grip=document.createElement('span');grip.className='grip';grip.textContent='⋮⋮';grip.title='Drag to reorder';grip.setAttribute('role','button');grip.setAttribute('tabindex','0');grip.setAttribute('aria-label','Drag '+titles[section.id]);
const label=document.createElement('span');label.className='row-name';const strong=document.createElement('b');strong.textContent=titles[section.id];const small=document.createElement('small');small.textContent=section.visible?'Visible':'Hidden';label.append(strong,small);label.onclick=()=>select(section.id);
const ctrls=document.createElement('span');ctrls.className='mini';
for(const [symbol,title,fn] of [
['↑','Move up',()=>reorder(index,index-1)],
['↓','Move down',()=>reorder(index,index+1)],
[section.visible?'◉':'◌','Toggle visibility',()=>{snapshot();section.visible=!section.visible;changed();renderSections();renderCanvas()}]
]){
const button=document.createElement('button');button.type='button';button.textContent=symbol;button.title=title;button.setAttribute('aria-label',title+' '+titles[section.id]);button.onclick=fn;ctrls.append(button);
}
row.append(grip,label,ctrls);host.append(row);
row.addEventListener('dragstart',event=>{event.dataTransfer.setData('text/plain',section.id);event.dataTransfer.effectAllowed='move'});
row.addEventListener('dragover',event=>{event.preventDefault();row.classList.add('over')});
row.addEventListener('dragleave',()=>row.classList.remove('over'));
row.addEventListener('drop',event=>{event.preventDefault();row.classList.remove('over');const id=event.dataTransfer.getData('text/plain');reorder(state.sections.findIndex(e=>e.id===id),state.sections.findIndex(e=>e.id===section.id))});
grip.addEventListener('pointerdown',event=>{if(event.pointerType==='mouse')return;const id=section.id;const startY=event.clientY;grip.setPointerCapture(event.pointerId);
const end=ev=>{grip.removeEventListener('pointerup',end);grip.removeEventListener('pointercancel',end);if(Math.abs(ev.clientY-startY)<8)return;const target=document.elementFromPoint(ev.clientX,ev.clientY)?.closest('.section-row');if(target)reorder(state.sections.findIndex(e=>e.id===id),state.sections.findIndex(e=>e.id===target.dataset.id))};
grip.addEventListener('pointerup',end);grip.addEventListener('pointercancel',end);
});
});
}
function renderInspector(){
const section=state.sections.find(item=>item.id===selection);$('sectionControls').classList.toggle('ready',!!section);if(!section)return;
$('selectionTitle').textContent=titles[section.id];$('titleInput').value=section.title;$('subtitleInput').value=section.subtitle;$('ctaInput').value=section.cta;$('imageInput').value=section.image;
$('imageWrap').hidden=section.id!=='banner';$('titleInput').disabled=section.id==='banner';$('subtitleInput').disabled=section.id==='banner';
}
function renderTheme(){for(const key of ['navy','accent','paper','spacing','radius','logo']){$(key).value=state.theme[key];$(key+'Out').textContent=String(state.theme[key])+(key==='spacing'||key==='radius'?'px':key==='logo'?'%':'')}}
function rerender(){renderTheme();renderSections();renderCanvas();renderInspector()}
for(const key of ['navy','accent','paper','spacing','radius','logo'])$(key).addEventListener('input',()=>{snapshot();state.theme[key]=key==='navy'||key==='accent'||key==='paper'?$(key).value:Number($(key).value);changed();$(key+'Out').textContent=String(state.theme[key])+(key==='spacing'||key==='radius'?'px':key==='logo'?'%':'');renderCanvas()});
for(const [field,key] of [['titleInput','title'],['subtitleInput','subtitle'],['ctaInput','cta'],['imageInput','image']])$(field).addEventListener('input',()=>{const s=state.sections.find(i=>i.id===selection);if(!s)return;snapshot();s[key]=$(field).value;changed();renderCanvas()});
document.querySelectorAll('[data-device]').forEach(button=>button.addEventListener('click',()=>{document.querySelectorAll('[data-device]').forEach(b=>{b.classList.toggle('active',b===button);b.setAttribute('aria-pressed',String(b===button))});$('canvas').classList.toggle('mobile',button.dataset.device==='mobile')}));
$('undo').onclick=()=>{if(!history.length)return;state=normalize(JSON.parse(history.pop()));$('undo').disabled=!history.length;changed();rerender()};
$('reset').onclick=()=>{if(!confirm('Reset all layout design changes to the default editor arrangement?'))return;snapshot();state=defaults();selection='collection';changed();rerender()};
$('export').onclick=()=>{const data=JSON.stringify(state,null,2);const blob=new Blob([data],{type:'application/json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='mvn-layout-draft.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),2000)};
$('import').onchange=async()=>{const file=$('import').files[0];if(!file)return;try{if(file.size>30000)throw Error('JSON file is too large');const data=JSON.parse(await file.text());snapshot();state=normalize(data);changed();rerender()}catch(error){alert('Cannot import design: '+error.message)}$('import').value=''};
$('save').onclick=async()=>{if(!ready)return;$('save').disabled=true;setStatus('Saving draft…');try{const response=await fetch('/api/admin/layout-draft',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({draft:state})});if(!response.ok)throw Error('Save rejected ('+response.status+')');const result=await response.json();state=normalize(result.draft||state);dirty=false;setStatus('Draft saved · Not published');rerender()}catch(error){setStatus('Save failed: '+error.message)}finally{$('save').disabled=false}};
async function init(){
$('undo').disabled=true;$('save').disabled=true;
try{const r=await fetch('/api/admin/layout-draft',{credentials:'same-origin',cache:'no-store'});if(r.status===401||r.status===403){location.assign('/account.html');return}if(!r.ok)throw Error('Editor API returned '+r.status);
const result=await r.json();state=normalize(result.draft||defaults());ready=true;$('workspace').hidden=false;setStatus(result.draft?'Private draft loaded':'New draft · Not published');$('save').disabled=false;rerender();
}catch(error){$('failure').hidden=false;$('failure').textContent='Could not load the private editor: '+error.message;setStatus('Editor unavailable')}
}
window.addEventListener('beforeunload',event=>{if(dirty){event.preventDefault();event.returnValue=''}});
init();
})();
