'use strict';
(() => {
  const $ = id => document.getElementById(id);
  const defaults = {
    title:'Fuel your\nnext set.',
    description:'Sports supplements for strength, energy and recovery. Compare ingredients and find what fits your training.',
    button:'Shop supplements',
    image:'assets/mvn-homepage-banner-20261115.webp',
    categories:'SHOP BY GOAL',
    bestsellers:'Best sellers',
    pageBackground:'#ffffff',
    accent:'#192f4c',
    heroPadding:24,
    showCategories:true,
    showBestsellers:true
  };
  const validImages = new Set([
    'assets/mvn-homepage-banner-20261115.webp',
    'assets/mvn-preview-hero-20261116.webp',
    'assets/mvn-hero-whey-cutout-card.webp',
    'assets/unicorn-pro-series-nitro-mass-5kg-double-rich-chocolate-cutout.webp'
  ]);
  const form=$('editor'),frame=$('preview'),notice=$('status'),login=$('login');
  let state={...defaults},owner=false;
  const status=(message,error=false) => {notice.textContent=message;notice.dataset.error=String(error)};
  function normalize(v) {
    const o=v&&typeof v==='object'?v:{};
    const c={...defaults};
    for(const field of ['title','description','button','categories','bestsellers'])
      if(typeof o[field]==='string')c[field]=o[field].slice(0,field==='description'?250:field==='title'?90:field==='button'?48:80);
    if(validImages.has(o.image))c.image=o.image;
    for(const field of ['pageBackground','accent'])
      if(typeof o[field]==='string'&&/^#[0-9a-f]{6}$/i.test(o[field]))c[field]=o[field];
    if(Number.isInteger(o.heroPadding)&&o.heroPadding>=0&&o.heroPadding<=72)c.heroPadding=o.heroPadding;
    for(const field of ['showCategories','showBestsellers'])
      if(typeof o[field]==='boolean')c[field]=o[field];
    return c;
  }
  function fieldsFromState() {
    for(const [key,value] of Object.entries(state)) {
      const field=form.elements.namedItem(key);
      if(!field)continue;
      if(field.type==='checkbox')field.checked=value;
      else field.value=value;
    }
    $('paddingValue').textContent=state.heroPadding+'px';
  }
  function readFields() {
    const result={};
    for(const key of Object.keys(defaults)){
      const field=form.elements.namedItem(key);
      if(field) result[key]=field.type==='checkbox'?field.checked:field.type==='range'?Number(field.value):field.value;
    }
    return normalize(result);
  }
  function preview() {
    if(frame.contentWindow)frame.contentWindow.postMessage({type:'MVN_HOMEPAGE_PREVIEW',config:state},location.origin);
  }
  form.addEventListener('input',()=>{
    state=readFields();
    $('paddingValue').textContent=state.heroPadding+'px';
    preview();
    status('Preview updated. Live homepage unchanged until you publish.');
  });
  frame.addEventListener('load',preview);
  function device(type){
    frame.classList.toggle('mobile',type==='mobile');
    $('mobile').setAttribute('aria-pressed',String(type==='mobile'));
    $('desktop').setAttribute('aria-pressed',String(type==='desktop'));
    preview();
  }
  $('mobile').onclick=()=>device('mobile');
  $('desktop').onclick=()=>device('desktop');
  async function api(path,body) {
    const res=await fetch(path,{credentials:'same-origin',cache:'no-store',...(body?{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}:{})});
    const data=await res.json().catch(()=>({}));
    if(!res.ok){const error=Error(data.message||data.error||'Request failed ('+res.status+')');error.status=res.status;throw error}
    return data;
  }
  async function refreshOwner(){
    try{
      const session=await api('/api/session');
      owner=session.user?.role==='admin';
    }catch{owner=false}
    return owner;
  }
  $('save').onclick=async()=>{
    state=readFields();
    localStorage.setItem('mvn-homepage-edit-draft-v1',JSON.stringify(state));
    if(!await refreshOwner())return status('Draft saved in this browser. Sign in as Owner when ready to publish.');
    try{
      await api('/api/admin/homepage-config',{mode:'draft',config:state});
      status('Draft saved securely to the website. Live homepage unchanged.');
    }catch(e){status('Draft saved in this browser, but server save failed: '+e.message,true)}
  };
  $('publish').onclick=async()=>{
    state=readFields();
    localStorage.setItem('mvn-homepage-edit-draft-v1',JSON.stringify(state));
    if(!await refreshOwner()){
      $('signin').hidden=false;
      $('signin').scrollIntoView({block:'nearest',behavior:'smooth'});
      status('Design saved in this browser. Owner sign-in is required to publish.',true);
      return;
    }
    if(!confirm('Publish these homepage design changes to the public website now? Products, prices, orders and cart will not change.'))return;
    $('publish').disabled=true;
    try{
      await api('/api/admin/homepage-config',{mode:'publish',config:state});
      status('Homepage published successfully. Open View Store to check the public website.');
    }catch(e){status('Homepage not published: '+e.message,true)}
    finally{$('publish').disabled=false}
  };
  login.addEventListener('submit',async event=>{
    event.preventDefault();
    const button=login.querySelector('button[type=submit]');
    button.disabled=true;
    try{
      await api('/api/login',Object.fromEntries(new FormData(login)));
      if(!await refreshOwner())throw Error('This account is not an administrator. No homepage changes published.');
      $('signin').hidden=true;
      login.reset();
      status('Owner signed in. Click Publish Homepage when your preview is ready.');
    }catch(e){status('Sign-in failed: '+e.message,true)}
    finally{button.disabled=false}
  });
  (async()=>{
    try{
      const result=await api('/api/homepage-config');
      state=normalize(result.published||defaults);
    }catch{state={...defaults}}
    try {
      const saved=localStorage.getItem('mvn-homepage-edit-draft-v1');
      if(saved)state=normalize(JSON.parse(saved));
    }catch{}
    fieldsFromState();
    preview();
    await refreshOwner();
    status(owner?'Owner recognised. Edit, preview, save a draft, or publish when ready.':'Preview is ready. You can edit without signing in; publishing requires Owner access.');
  })();
})();