import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync,existsSync,readFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {openCommerce} from '../commerce.mjs';
import {quote} from '../lib.mjs';

test('Globe-Tech includes four product families and five exact packs without whey or gainers',()=>{
 const products=JSON.parse(readFileSync('data/products.json')).filter(p=>p.brand==='Globe-Tech Nutrition');
 assert.equal(products.length,4);
 assert.equal(products.flatMap(p=>p.variants).length,5);
 assert.ok(products.every(p=>!/(whey|gainer)/i.test(p.name)));
 const force=products.find(p=>p.id==='globtech-force-1');
 assert.deepEqual(force.variants.map(v=>v.label),['400 g · Pineapple Voltage','400 g · Red Fusion Berry']);
 for(const v of products.flatMap(p=>p.variants)){
  assert.equal(v.pricePaise,null,'unconfirmed INR prices must remain unset');
  assert.ok(existsSync('public/'+v.image),'official pack image is available');
 }
});

test('persistent store addition is idempotent and preserves owner prices, stock and other products',()=>{
 const dir=mkdtempSync(join(tmpdir(),'mvn-globtech-'));
 let c;
 try{
  c=openCommerce(dir);
  const wheyBefore=c.db.prepare("SELECT data FROM products WHERE id='potency-whey'").get().data;
  // Reproduce an existing store seeded before the new brand, plus an owner-edited pack.
  c.db.prepare("DELETE FROM products WHERE id='globtech-crea-pump'").run();
  const custom=JSON.parse(c.db.prepare("SELECT data FROM products WHERE id='globtech-creatine'").get().data);
  custom.variants[0].pricePaise=123400;
  c.db.prepare('UPDATE products SET data=? WHERE id=?').run(JSON.stringify(custom),custom.id);
  c.db.prepare('UPDATE inventory SET on_hand=7 WHERE variant_id=?').run(custom.variants[0].id);
  c.db.close();c=openCommerce(dir);c.db.close();c=openCommerce(dir);
  assert.equal(c.catalogue(null).filter(p=>p.brand==='Globe-Tech Nutrition').length,4);
  assert.equal(c.catalogue(null).find(p=>p.id===custom.id).variants[0].pricePaise,123400);
  assert.equal(c.catalogue(null).find(p=>p.id===custom.id).variants[0].stock,7);
  assert.equal(c.db.prepare("SELECT data FROM products WHERE id='potency-whey'").get().data,wheyBefore);
  assert.equal(c.db.prepare("SELECT COUNT(*) AS n FROM audit WHERE action='product.add' AND target='globtech-crea-pump'").get().n,1);
 }finally{c?.db.close();rmSync(dir,{recursive:true,force:true});}
});

test('quote-only packs cannot be purchased at a zero or invented price even when stock exists',()=>{
 const p={id:'globtech',name:'Force 1',variants:[{id:'gt-force',label:'400 g',pricePaise:null,stock:10}]};
 assert.throws(()=>quote([{variantId:'gt-force',quantity:1}],[p],0),/Selling prices are awaiting confirmation/);
});
