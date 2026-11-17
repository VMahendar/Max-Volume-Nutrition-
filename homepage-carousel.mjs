import {readFileSync} from 'node:fs';

export const defaultCarousel=JSON.parse(readFileSync(new URL('./data/homepage-carousel.json',import.meta.url),'utf8'));

export function validateCarousel(value,validImage){
 if(!value||value.version!==1||typeof value.enabled!=='boolean'||typeof value.autoplay!=='boolean')throw Error('Invalid slideshow settings.');
 if(!Number.isInteger(value.intervalMs)||value.intervalMs<4000||value.intervalMs>12000)throw Error('Choose a slide duration from 4 to 12 seconds.');
 if(!Array.isArray(value.slides)||value.slides.length<3||value.slides.length>8)throw Error('Keep between 3 and 8 slides.');
 const text=(value,label,max)=>{if(typeof value!=='string'||!value.trim()||value.length>max)throw Error('Check '+label+'.');return value.trim();};
 const seen=new Set();
 const slides=value.slides.map(slide=>{
  if(!slide||typeof slide.id!=='string'||!/^[a-z0-9-]{1,80}$/.test(slide.id)||seen.has(slide.id))throw Error('Each slide needs a unique ID.');
  seen.add(slide.id);
  if(typeof slide.href!=='string'||!/^\/(?:[a-z0-9-]+\.html)?(?:[?#][a-zA-Z0-9%&=_.~!$'()*+,;:@/?#-]*)?$/.test(slide.href)||slide.href.includes('..'))throw Error('Link slides to a page inside your store.');
  if(!Array.isArray(slide.images)||slide.images.length<1||slide.images.length>3)throw Error('Choose 1–3 product photos for each slide.');
  const images=slide.images.map(photo=>{
   if(!photo||typeof photo.src!=='string'||!/^assets\/[a-zA-Z0-9_./-]+\.(?:png|jpe?g|webp)$/.test(photo.src)||photo.src.includes('..')||!validImage(photo.src))throw Error('Choose an existing or uploaded product photo.');
   if(!['cutout','official'].includes(photo.format))throw Error('Invalid photo layout.');
   return {src:photo.src,alt:text(photo.alt,'photo description',240),format:photo.format};
  });
  return {id:slide.id,name:text(slide.name,'slide name',80),eyebrow:text(slide.eyebrow,'small label',100),title:text(slide.title,'headline',70),highlight:text(slide.highlight,'gold headline',70),description:text(slide.description,'description',300),button:text(slide.button,'button text',45),href:slide.href,images};
 });
 return {version:1,enabled:value.enabled,autoplay:value.autoplay,intervalMs:value.intervalMs,slides};
}
