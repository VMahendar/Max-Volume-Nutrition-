// Build the approved, order-preserving storefront stylesheet used by Home and Shop.
// Run during deploy checks so later CSS edits cannot leave a stale bundle behind.
import {readFileSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';

const files=[
 'mvn-home-layout.bundle.css',
 'mvn-advance-layout.css',
 'mvn-homepage-consistency.css',
 'mvn-supplement-store-reference.css',
 'mvn-info-pages.css',
 'mvn-storefront-cleanup.css',
 'mvn-showcase-shop.css'
];
const combined=[
 '/* MVN shopping CSS bundle. Concatenated from the approved source styles in exact cascade order. */',
 ...files.map(name=>'\n/* BEGIN '+name+' */\n'+readFileSync(resolve('public',name),'utf8').trim()+'\n/* END '+name+' */')
].join('\n')+'\n';
for(const target of ['public/mvn-shopping-bundle-20261115.css','mvn-shopping-bundle-20261115.css']){
 const path=resolve(target);
 let same=false;
 try{same=readFileSync(path,'utf8')===combined}catch{}
 if(!same)writeFileSync(path,combined);
}

// Home keeps its own approved cascade, including contrast and compact pack fixes.
const homeFiles=['style.css','commerce.css','mvn-orange-home-20261117.css','mvn-brand-gold-20261117.css','mvn-globtech-20261117.css','mvn-hero-carousel.css','mvn-best-sellers-shop-match.css'];
const homeCSS=homeFiles.map(name=>'/* '+name+' */\n'+readFileSync(resolve('public',name),'utf8').trim()).join('\n')+'\n';
writeFileSync(resolve('public/mvn-home-critical-20261118.css'),homeCSS);
