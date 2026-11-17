// Independent public-internet launch check. Run from GitHub Actions, not
// from the Render host, to confirm the real customer-facing domain.
import assert from 'node:assert/strict';

const origin='https://maxvolumenutriton.shop';
const request=async(path)=>{
  const url=new URL(path,origin);
  const response=await fetch(url,{redirect:'follow',signal:AbortSignal.timeout(18000),
    headers:{'User-Agent':'MVN-Launch-QA/1.0','Accept':'*/*'}});
  console.log('PUBLIC_HTTP',path,'status='+response.status,'url='+response.url);
  assert.equal(response.status,200,path+' must be publicly accessible without login');
  assert.equal(new URL(response.url).hostname,'maxvolumenutriton.shop',path+' must not redirect away from the sole official domain');
  return response;
};
const home=await request('/');
const markup=await home.text();
assert.match(markup,/mvn-brand-gold-20261117\.css/, 'Current shared brand stylesheet is live');
assert.match(markup,/mvn-preview-nav/, 'Current storefront navigation is live');
assert.doesNotMatch(markup,/coming soon placeholder/i,'live home is not a placeholder');
const indexing=home.headers.get('x-robots-tag')||'';
assert.doesNotMatch(indexing,/noindex/i,'live homepage must not be blocked from indexing');
const style=await request('/mvn-product-shop-match.css');
assert.match(await style.text(),/Shared Shop All presentation/,'live CSS is the approved shared product layout');
await request('/healthz');
const retail=await request('/api/retail/catalog');
const catalogue=await retail.json();
assert.equal(catalogue.tier,'retail','public catalogue must not leak wholesale prices');
assert.ok(Array.isArray(catalogue.products)&&catalogue.products.length>=5,'public retail product list');
assert.ok(catalogue.products.some(p=>p.id==='potency-whey'),'whey must be available');
console.log('PASS live official-domain homepage, Option 2 CSS, health endpoint, public retail catalogue and indexability');
