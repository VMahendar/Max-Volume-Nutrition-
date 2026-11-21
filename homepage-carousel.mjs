import {readFileSync} from 'node:fs';

export const defaultCarousel=JSON.parse(readFileSync(new URL('./data/homepage-carousel.json',import.meta.url),'utf8'));
const responsiveMedia=JSON.parse(readFileSync(new URL('./data/homepage-responsive-media.json',import.meta.url),'utf8'));
const escapeHTML=value=>String(value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));

// Media attributes come from our committed originals, never owner-supplied markup.
export function carouselMedia(config){
 return {...config,slides:config.slides.map(slide=>({...slide,images:slide.images.map(photo=>({...photo,...responsiveMedia[photo.src]}))}))};
}

export function firstCarouselHTML(config){
 const item=config.slides[0],e=escapeHTML;
 const photos=item.images.map((photo,index)=>`<div class="mvn-campaign-pack${photo.format==='official'?' mvn-campaign-official':''}"><img src="/${e(photo.src)}" alt="${e(photo.alt)}"${photo.width?` width="${photo.width}" height="${photo.height}"`:''}${photo.srcset?` srcset="${e(photo.srcset.replaceAll('assets/','/assets/'))}" sizes="(max-width:760px) 44vw, 28vw"`:''} loading="eager" decoding="async"${index===0?' fetchpriority="high"':''}></div>`).join('');
 return `<div class="mvn-campaign-carousel" data-server-rendered="true" role="region" aria-roledescription="carousel" aria-label="Featured supplement collections" tabindex="0"><div class="mvn-campaign-viewport"><div class="mvn-campaign-slide" role="group" aria-roledescription="slide" aria-label="1 of ${config.slides.length}: ${e(item.name)}"><div class="mvn-campaign-copy"><span class="mvn-campaign-eyebrow">${e(item.eyebrow)}</span><h1 class="mvn-campaign-title">${e(item.title)}<em>${e(item.highlight)}</em></h1><p class="mvn-campaign-description">${e(item.description)}</p><a class="mvn-campaign-cta" href="${e(item.href)}">${e(item.button)} →</a></div><a class="mvn-campaign-stage" href="${e(item.href)}" aria-label="Explore ${e(item.name)}"><div class="mvn-campaign-products" data-count="${item.images.length}">${photos}</div><span class="mvn-campaign-photo-note">${e(item.name.toUpperCase())}</span></a></div></div><div class="mvn-campaign-controls" aria-hidden="true"></div></div>`;
}

export function renderInitialCarousel(html,config){
 if(!config?.enabled||config.slides?.length<3)return html;
 // The real first slide is parseable before JavaScript. Avoid fetching the retired
 // montage and its CSS bundle while preserving both in editor/static previews.
 return html.replace(/<link rel="preload" as="image"[^>]+>/,'')
  .replace('<link rel="preload" as="style" href="/mvn-shopping-bundle-20261115.css?v=1">','')
  .replace(/<img class="mvn-owner-banner-img"[^>]*>/,tag=>tag.replace('fetchpriority="high"','fetchpriority="low" loading="lazy"'))
  .replace(/(<section id="mvnEditorial"[^>]*)(>)/,(_,open,close)=>open.replace(/ aria-labelledby="[^"]*"/,'')+' data-carousel-ready="true"'+close+firstCarouselHTML(config));
}

export function optimizeHomeAssets(html){
 const styles=['style.css','commerce.css','mvn-orange-home-20261117.css','mvn-brand-gold-20261117.css','mvn-globtech-20261117.css','mvn-hero-carousel.css','mvn-best-sellers-shop-match.css'];
 let bundled=false;
 html=html.replace(/<link rel="stylesheet" href="\/([^"?]+)(?:\?[^\"]*)?">/g,(tag,file)=>{
  if(!styles.includes(file))return tag;
  if(bundled)return '';
  bundled=true;return '<link rel="stylesheet" href="/mvn-home-critical-20261118.css?v=2">';
 });
 return html.replace(/<img\b[^>]*>/g,tag=>{
  const src=tag.match(/\bsrc="\/?([^\"]+)"/)?.[1],photo=responsiveMedia[src];
  if(!photo||tag.includes('srcset='))return tag;
  return tag.replace(/\s(?:width|height)="[^"]*"/g,'').replace('>',` width="${photo.width}" height="${photo.height}" srcset="${photo.srcset.replaceAll('assets/','/assets/')}" sizes="(max-width:760px) 48vw, 28vw">`);
 });
}

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
