(() => {
  const root = document.querySelector('[data-mvn-product-order]');
  if (!root) return;
  const fields = Object.fromEntries([...root.querySelectorAll('[data-order-field]')].map(el => [el.dataset.orderField, el]));
  const image = document.querySelector('main .grid .media img');
  const primaryPhoto = image?.getAttribute('src');
  const photoCaption = document.querySelector('main .grid .media > small');
  const format = new Intl.NumberFormat('en-IN', {style:'currency',currency:'INR',minimumFractionDigits:0,maximumFractionDigits:2});
  const money = paise => format.format(paise / 100);
  const orderKey = 'mvn-inline-order-v1';
  let quantity = 1;
  let selected;
  let productName = root.dataset.productName;
  let variants = [];

  function packInfo(variant) {
    const label = String(variant.label || '');
    const match = label.match(/\b\d+(?:\.\d+)?\s*(?:lbs?|kg|g|tablets|capsules|servings)\b/i);
    const size = match ? match[0].replace(/(\d)([A-Za-z])/, '$1 $2') : label;
    const flavor = match ? label.replace(match[0], '').replace(/^[\s·/–—-]+|[\s·/–—-]+$/g,'') : '';
    return {...variant,size,flavor:flavor || 'Standard pack'};
  }

  function options(items, key, label, value) {
    return items.map(item => {
      const option = document.createElement('option');
      option.value = item[key];
      option.textContent = item[label];
      option.selected = item[key] === value;
      return option;
    });
  }

  function update() {
    fields.price.textContent = money(selected.pricePaise);
    fields.mrp.hidden = !(Number.isSafeInteger(selected.mrpPaise) && selected.mrpPaise > selected.pricePaise);
    fields.mrp.textContent = fields.mrp.hidden ? '' : money(selected.mrpPaise);
    fields.discount.hidden = fields.mrp.hidden;
    fields.discount.textContent = fields.mrp.hidden ? '' : `${Math.floor(100 * (selected.mrpPaise - selected.pricePaise) / selected.mrpPaise)}% off`;
    fields.quantity.textContent = String(quantity);
    fields.minus.disabled = quantity <= 1;
    fields.plus.disabled = quantity >= 99;
    fields.total.textContent = money(selected.pricePaise * quantity);
    const photo = selected.image || (selected.id === root.dataset.primaryVariant ? primaryPhoto : '');
    if (image) {
      image.hidden = !photo;
      if (photo) {
        image.src = photo;
        image.alt = `${productName} · ${selected.label}`;
      }
      fields.photoNote.hidden = Boolean(photo);
      if (photoCaption) photoCaption.hidden = selected.id !== root.dataset.primaryVariant;
    }
    for (const card of document.querySelectorAll('.nitro-pack-card')) {
      const active = card.id === 'nitro-' + selected.id.replace(/^mass-/, '');
      card.classList.toggle('is-selected', active);
      const link = card.querySelector('.nitro-pack-choose');
      if (active) link?.setAttribute('aria-current','true');
      else link?.removeAttribute('aria-current');
      const choice = card.querySelector('.nitro-pack-select');
      if (choice) choice.textContent = active ? 'Selected pack' : 'View this pack';
    }
    fields.whatsapp.href = 'https://wa.me/917708830513?text=' + encodeURIComponent([
      'Hi Max Volume Nutrition, please confirm this pack:',
      productName, selected.label, `Quantity: ${quantity}`,
      `Product subtotal: ${money(selected.pricePaise * quantity)}`,
      'Please confirm current stock and delivery charges.',
    ].join('\n'));
  }

  function updateFlavors(size, variantId) {
    const available = variants.filter(v => v.size === size);
    selected = available.find(v => v.id === variantId) || available[0];
    fields.flavor.replaceChildren(...options(available, 'id', 'flavor', selected.id));
    update();
  }

  fields.size.addEventListener('change', () => updateFlavors(fields.size.value));
  fields.flavor.addEventListener('change', () => {
    selected = variants.find(v => v.id === fields.flavor.value);
    if (selected) update();
  });
  fields.minus.addEventListener('click', () => { if (quantity > 1) { quantity--; update(); } });
  fields.plus.addEventListener('click', () => { if (quantity < 99) { quantity++; update(); } });
  fields.add.addEventListener('click', () => {
    if (!selected) return;
    try {
      sessionStorage.setItem(orderKey, JSON.stringify({ id:selected.id, quantity }));
      location.assign('/shop.html?open=cart');
    } catch {
      fields.status.textContent = 'Your browser blocked the cart. You can continue with WhatsApp.';
    }
  });

  async function init() {
    const response = await fetch('/api/retail/catalog', { cache:'no-store', signal:AbortSignal.timeout(8000) });
    if (!response.ok) return;
    const data = await response.json();
    const product = data.products?.find(p => p.id === root.dataset.mvnProductOrder);
    variants = (product?.variants || []).filter(v => typeof v.id === 'string' && Number.isSafeInteger(v.pricePaise) && v.pricePaise > 0).map(packInfo);
    if (!variants.length) return;
    if (typeof product.name === 'string' && product.name.trim()) productName = product.name;
    const pack = new URLSearchParams(location.search).get('pack');
    selected = (pack && variants.find(v => v.id === 'mass-' + pack)) || variants.find(v => v.id === root.dataset.primaryVariant) || variants[0];
    const sizes = [...new Map(variants.map(v => [v.size, v])).values()];
    fields.size.replaceChildren(...options(sizes, 'size', 'size', selected.size));
    updateFlavors(selected.size, selected.id);
    document.querySelector('[data-mvn-order-fallback]')?.setAttribute('hidden','');
    root.hidden = false;
  }
  init().catch(() => {});
})();
