import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const heroPhotos=[
  ['mvn-pro-plus-isolate-1kg.avif','data/image-assets/mvn-pro-plus-isolate-1kg.avif.b64'],
  ['mvn-nitro-mass-3kg-photo.avif','data/image-assets/mvn-nitro-mass-3kg-photo.avif.b64'],
];
test('original owner photo sources are valid AVIF and cannot become synthetic substitutes',()=>{
  for(const [name,path] of heroPhotos){
    const encoded=readFileSync(path,'utf8').trim();
    assert.match(encoded,/^[A-Za-z0-9+/]+={0,2}$/,'Unexpected image encoding: '+name);
    const bytes=Buffer.from(encoded,'base64');
    assert.ok(bytes.length>1500,'Original photo missing: '+name);
    assert.equal(bytes.toString('ascii',4,8),'ftyp',name+' is not an AVIF');
    assert.equal(bytes.toString('ascii',8,12),'avif',name+' has an unexpected image container');
  }
});

test('homepage banner uses the owner photos, not the synthetic product group',()=>{
  const images=[
    '/assets/mvn-pro-plus-isolate-1kg.avif',
    '/assets/potency-whey-coffee-5lb.webp',
    '/assets/mvn-nitro-mass-3kg-photo.avif'
  ];
  for(const path of ['index.html','public/index.html']){
    const html=readFileSync(path,'utf8');
    assert.ok(html.includes('class="mvn-real-banner-products"'),path);
    for(const img of images)assert.ok(html.includes('src="'+img+'"'),path+' missing '+img);
    assert.ok(html.includes('mvn-real-product-banner.css'),path+' missing mobile/desktop photo styling');
    assert.ok(!html.includes('src="assets/mvn-banner-20261115-no-logo-no-pineapple.webp"'),path+' still displays the synthetic composite');
    assert.ok(!html.includes('href="/assets/mvn-banner-20261115-no-logo-no-pineapple.webp"'),path+' still preloads the composite');
  }
});

test('original photos are generated from the committed sources without modifying product data',()=>{
  const script=readFileSync('deploy/prepare-product-media.mjs','utf8');
  for(const [name,path] of heroPhotos){
    assert.ok(script.includes(path),name+' missing from media preparation');
    assert.ok(script.includes('public/assets/'+name),name+' output missing');
  }
  assert.ok(script.includes("image.toString('ascii',8,12)==='avif'"),'AVIF validation missing');
  const server=readFileSync('server.mjs','utf8');
  assert.ok(server.includes("'.avif':'image/avif'"),'AVIF response MIME missing');
});
