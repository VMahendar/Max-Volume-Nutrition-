import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';

function cartFixture(){
 const nodes={};let active,timerId=0;const timers=new Map();
 for(const id of ['drawer','shade','bag','close','main','previously-inert']){
  const classes=new Set();nodes[id]={id,tagName:'DIV',hidden:['drawer','shade'].includes(id),inert:['drawer','previously-inert'].includes(id),dataset:{},isConnected:true,attrs:{},
   classList:{contains:c=>classes.has(c),add:c=>classes.add(c),remove:c=>classes.delete(c)},
   setAttribute:(k,v)=>{nodes[id].attrs[k]=v;},getBoundingClientRect:()=>({}),focus:()=>{active=nodes[id];}};
 }
 const body={children:Object.values(nodes),classList:{add(){},remove(){}}};
 const document={body,querySelectorAll:()=>body.children.filter(n=>'bagInert' in n.dataset),get activeElement(){return active;}};
 const source=readFileSync('public/app.js','utf8');
 const start=source.indexOf('let bagOpener='),end=source.indexOf('let retailLeadKey=',start);
 const context={document,$:id=>nodes[id],setTimeout:fn=>{timers.set(++timerId,fn);return timerId;},clearTimeout:id=>timers.delete(id)};
 runInNewContext(source.slice(start,end),context);
 return {nodes,open:context.openBag,close:context.closeBag,focus:()=>active,flush:()=>{for(const [id,fn] of timers){timers.delete(id);fn();}}};
}

test('cart removes hidden controls, restores opener and preserves background inert state',()=>{
 const f=cartFixture();f.nodes.bag.focus();f.open();
 assert.equal(f.nodes.drawer.hidden,false);assert.equal(f.nodes.drawer.inert,false);assert.equal(f.focus(),f.nodes.close);
 assert.equal(f.nodes.main.inert,true);
 f.open(); // repeated opens must not replace the opener or prior background state
 f.close();
 assert.equal(f.focus(),f.nodes.bag);assert.equal(f.nodes.drawer.inert,true);
 assert.equal(f.nodes.main.inert,false);assert.equal(f.nodes['previously-inert'].inert,true);
 f.flush();assert.equal(f.nodes.drawer.hidden,true);
});

test('reopening during exit cancels delayed hiding and disconnected openers fall back to bag',()=>{
 const f=cartFixture();f.nodes.main.focus();f.open();f.close();f.nodes.bag.focus();f.open();f.flush();
 assert.equal(f.nodes.drawer.hidden,false);assert.equal(f.nodes.drawer.inert,false);
 f.nodes.bag.isConnected=false;f.close();assert.equal(f.focus(),f.nodes.bag);
});
