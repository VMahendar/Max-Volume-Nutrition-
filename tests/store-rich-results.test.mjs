import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

test('homepage Store JSON-LD includes only verified business details for Rich Results',()=>{
 const originals=['index.html','public/index.html'].map(p=>readFileSync(p,'utf8'));
 assert.equal(originals[0],originals[1],'Keep homepage source and served file synchronized');
 const scripts=[...originals[1].matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
 const store=scripts.map(m=>JSON.parse(m[1])).find(v=>v['@type']==='Store');
 assert.ok(store,'Published Store JSON-LD missing');
 assert.equal(store.name,'Max Volume Nutrition');
 assert.equal(store.url,'https://maxvolumenutriton.shop/');
 assert.equal(store.image,store.logo,'Image must be the existing original business logo');
 assert.equal(store.priceRange,'₹699–₹5,500','Only the current public retail price range');
 assert.equal(store.address.postalCode,'603103');
 assert.equal(store.address.addressLocality,'Kelambakkam');
 assert.equal(store.address.addressCountry,'IN');
 assert.equal(store['@context'],'https://schema.org');
});
