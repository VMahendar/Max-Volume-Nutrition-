import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';

const script=readFileSync('public/desktop-preview.js','utf8');

function check(search,width=390){
 const props={};
 const context={
  URLSearchParams,
  window:{location:{search},screen:{width}},
  document:{
   querySelector:selector=>selector==='meta[name="viewport"]'?{setAttribute:(key,value)=>props[key]=value}:null,
   documentElement:{setAttribute:(key,value)=>props[key]=value}
  }
 };
 runInNewContext(script,context,{timeout:1000});
 return props;
}

test('default mobile website is not overridden by desktop-preview mode',()=>{
 assert.deepEqual(check(''),{});
 assert.deepEqual(check('?q=whey'),{});
});

test('desktop preview opt-in sets a 1280 CSS-pixel layout and keeps pinch zoom available',()=>{
 const viewport=check('?desktop=1',390);
 assert.match(viewport.content,/width=1280/);
 assert.match(viewport.content,/user-scalable=yes/);
 assert.equal(viewport['data-desktop-preview'],'true');
});

test('desktop preview is linked early in both canonical homepage copies',()=>{
 for(const path of ['index.html','public/index.html']){
  const html=readFileSync(path,'utf8');
  assert.ok(html.includes('<script src="/desktop-preview.js"></script>'),path);
  assert.ok(html.indexOf('/desktop-preview.js')<html.indexOf('<link rel="stylesheet" href="/mvn-orange-home-20261117.css?v=5">'),path);
 }
});
