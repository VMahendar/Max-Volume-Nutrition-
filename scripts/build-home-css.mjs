// Generate two deterministic CSS bundles in the same root directory as
// the source stylesheets. Keep source sheets for non-home pages and tests.
// The two bundles are split at the original inline <style> sections to
// preserve existing cascade order exactly.
import {readFileSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';

const root=resolve('public');
export const base=[
 'style.css',
 'premium.css',
 'flagship.css',
 'shopping.css',
 'campaigns.css',
 'store-updates.css',
 'android-layout.css'
];
export const layout=[
 'product-experience.css',
 'mvn-spotlight.css',
 'option-two-product-store.css',
 'mvn-editorial-home.css',
 'mvn-grouped-home.css',
 'mvn-studio-final.css',
 'mvn-owner-banner.css',
 'mvn-fitness-retail.css'
];

for(const [target,files] of [
 ['mvn-home-base.bundle.css',base],
 ['mvn-home-layout.bundle.css',layout]
]){
 const bundle=files.map(name=>{
  const text=readFileSync(resolve(root,name),'utf8');
  if(/^\s*@charset\b/im.test(text))throw Error('Cannot concatenate @charset declaration: '+name);
  if(/^\s*@import\b/im.test(text))throw Error('Cannot concatenate @import declaration: '+name);
  return '\n/* '+name+' — source of truth */\n'+text+'\n';
 }).join('');
 writeFileSync(resolve(root,target),bundle,'utf8');
 console.log('Generated '+target+' from '+files.length+' stylesheets ('+Buffer.byteLength(bundle)+' bytes)');
}
