// Prepare committed Base64-encoded media as ordinary local WebP files.
// Encoding source images as text lets the GitHub contents-only integration
// transport their exact bytes; generated files remain same-origin site assets.
import {readFileSync,writeFileSync,existsSync,mkdirSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
const media=[
 ['data/image-assets/globtech-creatine-monohydrate-official.webp.b64','public/assets/globtech-creatine-monohydrate-official.webp'],
 ['data/image-assets/globtech-crea-pump-official.webp.b64','public/assets/globtech-crea-pump-official.webp'],
 ['data/image-assets/globtech-amino-lean-edge-official.webp.b64','public/assets/globtech-amino-lean-edge-official.webp'],
 ['data/image-assets/globtech-f1-2-official.webp.b64','public/assets/globtech-f1-2-official.webp'],
 ['data/image-assets/globtech-force-1-red-official.webp.b64','public/assets/globtech-force-1-red-official.webp'],

 ['data/image-assets/mvn-orange-lineup-20261117-768.webp.b64','public/assets/mvn-orange-lineup-20261117-768.webp'],
 ['data/image-assets/mvn-orange-whey-20261117.webp.b64','public/assets/mvn-orange-whey-20261117.webp'],
 ['data/image-assets/mvn-orange-lineup-20261117.webp.b64','public/assets/mvn-orange-lineup-20261117.webp'],
 ['data/image-assets/mvn-orange-mass-3kg-20261117.webp.b64','public/assets/mvn-orange-mass-3kg-20261117.webp'],
 ['data/image-assets/mvn-orange-sturdy-20261117.webp.b64','public/assets/mvn-orange-sturdy-20261117.webp'],
 ['data/image-assets/mvn-orange-creatine-20261117.webp.b64','public/assets/mvn-orange-creatine-20261117.webp'],
 ['data/image-assets/sturdy-watermelon-front.webp.b64','public/assets/sturdy-watermelon-front.webp'],
 ['data/image-assets/sturdy-watermelon-back.webp.b64','public/assets/sturdy-watermelon-back.webp'],
 ['data/image-assets/mvn-pro-plus-isolate-1kg.avif.b64','public/assets/mvn-pro-plus-isolate-1kg.avif'],
 ['data/image-assets/mvn-nitro-mass-3kg-photo.avif.b64','public/assets/mvn-nitro-mass-3kg-photo.avif']
];
for(const [source,target] of media){
 const from=resolve(source),to=resolve(target);
 if(!existsSync(from))continue;
 const encoded=readFileSync(from,'utf8').trim();
 const image=Buffer.from(encoded,'base64');
 const webp=image.toString('ascii',0,4)==='RIFF'&&image.toString('ascii',8,12)==='WEBP';
 const avif=image.toString('ascii',4,8)==='ftyp'&&image.toString('ascii',8,12)==='avif';
 if(!webp&&!avif)throw Error('Invalid source product image: '+source);
 if(existsSync(to)&&readFileSync(to).equals(image))continue;
 mkdirSync(dirname(to),{recursive:true});
 writeFileSync(to,image);
}


/*
 * Website detail back-view presentation.
 * Wraps the exact owner-supplied WebP pixels rather than re-typesetting or
 * generating supplement facts. The silhouette mask removes the unfinished
 * photographic matte along the sides; background/shadow remain understated.
 */
const backSource=resolve('data/image-assets/sturdy-watermelon-back.webp.b64');
const studioTarget=resolve('public/assets/sturdy-watermelon-back-studio.svg');
if(existsSync(backSource)){
 const pixels=readFileSync(backSource,'utf8').trim();
 const studioSvg=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 1200" width="1200" height="1200" role="img" aria-label="Original Sturdy Pre-Workout back label photographed on a softly lit studio surface">
<defs>
 <radialGradient id="ambient"><stop offset="0" stop-color="#d8d1c7" stop-opacity=".35"/><stop offset="1" stop-color="#d8d1c7" stop-opacity="0"/></radialGradient>
 <filter id="softShadow" x="-50%" y="-250%" width="200%" height="600%"><feGaussianBlur stdDeviation="23"/></filter>
 <filter id="edgeBlur" x="-2%" y="-2%" width="104%" height="104%"><feGaussianBlur stdDeviation="1.7"/></filter>
 <mask id="cleanJar" maskUnits="userSpaceOnUse">
  <rect width="1200" height="1200" fill="black"/>
  <path d="M201 47 C330 37 925 36 1042 48 C1076 53 1080 79 1080 115 L1081 239 C1086 258 1081 275 1076 284 L1073 998 C1073 1070 1027 1146 959 1160 C740 1187 419 1185 285 1150 C228 1134 205 1095 205 1036 L194 280 C184 260 179 243 183 214 L182 116 C180 74 184 56 201 47 Z" fill="white" filter="url(#edgeBlur)"/>
 </mask>
</defs>
<ellipse cx="598" cy="565" rx="500" ry="490" fill="url(#ambient)"/>
<ellipse cx="625" cy="1119" rx="380" ry="44" fill="#22252b" opacity=".25" filter="url(#softShadow)"/>
<image width="1200" height="1200" href="data:image/webp;base64,${pixels}" mask="url(#cleanJar)" />
</svg>`;
 mkdirSync(dirname(studioTarget),{recursive:true});
 if(!existsSync(studioTarget)||readFileSync(studioTarget,'utf8')!==studioSvg)writeFileSync(studioTarget,studioSvg);
}
