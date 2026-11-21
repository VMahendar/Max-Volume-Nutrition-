(() => {
 const comparison = document.getElementById('mvnPackCompare');
 const cards = document.getElementById('mvnPackCompareCards');
 const status = document.getElementById('mvnPackCompareStatus');
 const money = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2, minimumFractionDigits: 0 });
 const packs = [['mass-3kg', 3], ['mass-5kg', 5]];
 let loading = false;

 function packCard(variant, kg) {
  const card = document.createElement('article');
  const label = document.createElement('h4');
  label.textContent = variant.label;
  if (variant.image) {
   const photo = document.createElement('img');
   photo.src = variant.image;
   photo.alt = 'Nitro Mass ' + variant.label;
   photo.loading = 'lazy';
   card.append(photo);
  }
  const price = document.createElement('p');
  const unit = document.createElement('small');
  price.textContent = money.format(variant.pricePaise / 100);
  unit.textContent = money.format(variant.pricePaise / (100 * kg)) + ' per kg';
  card.append(label, price, unit);
  return card;
 }

 comparison.addEventListener('toggle', async () => {
  if (!comparison.open || loading || cards.childElementCount) return;
  loading = true;
  status.textContent = 'Loading current retail prices…';
  try {
   const response = await fetch('/api/catalog', { credentials: 'omit', cache: 'no-store' });
   if (!response.ok) throw new Error('Catalogue unavailable');
   const { products } = await response.json();
   const mass = products.find(product => product.id === 'nitro-mass');
   const results = packs.map(([id, kg]) => {
    const variant = mass?.variants.find(item => item.id === id);
    if (!variant || !Number.isFinite(variant.pricePaise)) throw new Error('Pack unavailable');
    return packCard(variant, kg);
   });
   cards.replaceChildren(...results);
   status.textContent = '';
  } catch {
   status.textContent = 'The comparison is unavailable right now. Open Nitro Mass details to browse the packs.';
  } finally {
   loading = false;
  }
 });
})();
