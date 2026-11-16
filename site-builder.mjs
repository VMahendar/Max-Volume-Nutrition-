// Strictly scoped visual presentation overrides; never model commerce, forms, authentication or payments.
export const visualBuilderPages = Object.freeze([
 '/', '/shop.html', '/about.html', '/contact.html', '/dealer.html',
 '/brands.html', '/potency-whey.html', '/nitro-mass.html', '/pro-creatine.html',
 '/sturdy-pre-workout.html', '/offers.html', '/support.html'
]);
export function canonicalBuilderPage(path){
 if(path==='/index.html')return '/';
 return visualBuilderPages.includes(path)?path:null;
}
const numeric={x:[-1800,1800],y:[-1800,1800],width:[20,2200],height:[20,1600],fontSize:[8,150],rotate:[-180,180],opacity:[0,100],zIndex:[0,100],padding:[0,180],radius:[0,150]};
const color=/^#[a-fA-F0-9]{6}$/;
const selector=/^(?:body|main|header|footer|nav|section|article|div|figure|a|span|p|h[1-6]|img|picture|button|strong|small|ul|li)(?:\s*>\s*(?:main|header|footer|nav|section|article|div|figure|a|span|p|h[1-6]|img|picture|button|strong|small|ul|li)(?::nth-of-type\([1-9][0-9]{0,3}\))?){0,18}$/;
export function validateVisualBuilder(input, imageAllowed=()=>false){
 if(!input||typeof input!=='object'||Array.isArray(input))throw Error('Invalid visual builder document.');
 if(input.version!==1||!input.pages||typeof input.pages!=='object'||Array.isArray(input.pages))throw Error('Invalid visual builder version or pages.');
 const keys=Object.keys(input.pages);
 if(keys.length>visualBuilderPages.length||keys.some(page=>canonicalBuilderPage(page)!==page))throw Error('Page is not editable.');
 const pages={};
 for(const path of keys){
  const operations=input.pages[path];
  if(!Array.isArray(operations)||operations.length>180)throw Error('Too many edits on '+path+'.');
  const ids=new Set();
  pages[path]=operations.map(op=>{
   if(!op||typeof op!=='object'||Array.isArray(op)||typeof op.id!=='string'||!/^v[0-9a-z-]{8,50}$/.test(op.id)||ids.has(op.id))throw Error('Invalid or repeated visual edit ID.');
   ids.add(op.id);
   if(!['move','resize','text','image','hide','duplicate','insert','style'].includes(op.action))throw Error('Unknown visual action.');
   if(!['all','desktop','mobile'].includes(op.device))throw Error('Invalid visual editing device.');
   if(typeof op.target!=='string'||op.target.length>450||!(selector.test(op.target)||/^@v[0-9a-z-]{8,50}$/.test(op.target)))throw Error('Unsafe visual target.');
   const clean={id:op.id,action:op.action,device:op.device,target:op.target};
   if(op.action==='move'||op.action==='resize'||op.action==='style'){
    if(!op.values||typeof op.values!=='object'||Array.isArray(op.values))throw Error('Invalid visual dimensions.');
    const values={};
    for(const [key,value] of Object.entries(op.values)){
     if(Object.hasOwn(numeric,key)){const [min,max]=numeric[key];if(!Number.isInteger(value)||value<min||value>max)throw Error('Invalid visual dimension: '+key);values[key]=value;}
     else if(['color','backgroundColor'].includes(key)){if(typeof value!=='string'||!color.test(value))throw Error('Invalid visual colour.');values[key]=value;}
     else if(key==='objectFit'){if(!['contain','cover','fill'].includes(value))throw Error('Invalid image fitting.');values[key]=value;}
     else if(key==='textAlign'){if(!['left','center','right'].includes(value))throw Error('Invalid text alignment.');values[key]=value;}
     else throw Error('Unapproved visual style.');
    }
    if(!Object.keys(values).length)throw Error('Visual edit has no values.');
    clean.values=values;
   }
   if(op.action==='text'||op.action==='insert'){
    if(typeof op.text!=='string'||op.text.length>1200)throw Error('Invalid text length.');
    clean.text=op.text;
   }
   if(op.action==='image'||op.action==='insert'){
    if(op.src!==undefined){
     if(typeof op.src!=='string'||!imageAllowed(op.src))throw Error('Image must be uploaded or already on the store.');
     clean.src=op.src;
    }else if(op.action==='image')throw Error('Choose an image.');
   }
   if(op.action==='insert'){
    if(!['text','image','button','box'].includes(op.element))throw Error('Unsupported new element.');
    if(!['after','inside'].includes(op.position))throw Error('Invalid insert position.');
    clean.element=op.element;clean.position=op.position;
    if(op.element==='image'&&!clean.src)throw Error('An inserted image needs an uploaded photo.');
    if(op.element==='button'){
     if(typeof op.href!=='string'||!/^\/[a-z0-9/._?=&%-]{0,180}$/i.test(op.href)||op.href.includes('..')||op.href.includes('//'))throw Error('Only local store links are allowed.');
     clean.href=op.href;
    }
   }
   return clean;
  });
 }
 return {version:1,pages};
}
