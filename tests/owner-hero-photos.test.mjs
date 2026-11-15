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

test('homepage banner preserves the owner-uploaded group photograph',()=>{
  const banner='assets/mvn-homepage-banner-20261115.webp';
  const file=readFileSync('public/'+banner);
  assert.ok(file.length>100000,'full-resolution product lineup must be shipped');
  assert.equal(file.toString('ascii',0,4),'RIFF','hero is a valid RIFF image');
  assert.equal(file.toString('ascii',8,12),'WEBP','hero is a WebP image');
  for(const path of ['index.html','public/index.html']){
    const html=readFileSync(path,'utf8');
    assert.ok(html.includes('src="'+banner+'"'),path+' must load approved full-product montage');
    assert.ok(html.includes('href="/'+banner+'"'),path+' must preload this exact photo');
    assert.ok(!html.includes('class="mvn-real-banner-products"'),path+' must not show 3 substitute product cards');
    assert.ok(!html.includes('mvn-real-product-banner.css'),path+' must not load 3-card presentation CSS');
    assert.match(html,/GLOB-TECH Platinum Whey/,'photo describes correct replacement container');
    assert.match(html,/Creatine Monohydrate/,'photo describes original Creatine replacement');
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
