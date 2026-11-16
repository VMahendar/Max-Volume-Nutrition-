/* Applies only approved homepage presentation fields. Product data, pricing and cart are untouched. */
(() => {
  'use strict';
  const allowedImages = new Set([
    'assets/mvn-homepage-banner-20261115.webp',
    'assets/mvn-preview-hero-20261116.webp',
    'assets/mvn-hero-whey-cutout-card.webp',
    'assets/unicorn-pro-series-nitro-mass-5kg-double-rich-chocolate-cutout.webp'
  ]);
  const defaults = Object.freeze({
    title: 'Fuel your\nnext set.',
    description: 'Sports supplements for strength, energy and recovery. Compare ingredients and find what fits your training.',
    button: 'Shop supplements',
    image: 'assets/mvn-homepage-banner-20261115.webp',
    categories: 'SHOP BY GOAL',
    bestsellers: 'Best sellers',
    pageBackground: '#ffffff',
    accent: '#192f4c',
    heroPadding: 24,
    showCategories: true,
    showBestsellers: true
  });
  const clean = (config) => {
    const o = config && typeof config === 'object' ? config : {};
    const text = (key, limit) => typeof o[key] === 'string' ? o[key].slice(0, limit) : defaults[key];
    const color = /^#[0-9a-f]{6}$/i.test(o.pageBackground || '') ? o.pageBackground : defaults.pageBackground;
    const accent = /^#[0-9a-f]{6}$/i.test(o.accent || '') ? o.accent : defaults.accent;
    return {
      title: text('title', 90),
      description: text('description', 250),
      button: text('button', 48),
      image: allowedImages.has(o.image) ? o.image : defaults.image,
      categories: text('categories', 80),
      bestsellers: text('bestsellers', 80),
      pageBackground: color,
      accent,
      heroPadding: Number.isInteger(o.heroPadding) && o.heroPadding >= 0 && o.heroPadding <= 72 ? o.heroPadding : defaults.heroPadding,
      showCategories: typeof o.showCategories === 'boolean' ? o.showCategories : defaults.showCategories,
      showBestsellers: typeof o.showBestsellers === 'boolean' ? o.showBestsellers : defaults.showBestsellers
    };
  };
  const $ = (id) => document.getElementById(id);
  const apply = (input) => {
    const c = clean(input);
    const hero = $('mvnEditorialTitle');
    if (hero) {
      const parts = c.title.split('\n', 2);
      const lead = document.createTextNode(parts[0]);
      if (parts.length > 1) {
        const br = document.createElement('br');
        const em = document.createElement('em');
        em.textContent = parts[1];
        hero.replaceChildren(lead, br, em);
      } else hero.replaceChildren(lead);
    }
    const intro = document.querySelector('.mvn-launch-hero-copy > p');
    if (intro) intro.textContent = c.description;
    const shop = document.querySelector('.mvn-launch-hero-actions .mvn-launch-primary');
    if (shop) {
      const arrow = document.createElement('span');
      arrow.textContent = ' →';
      arrow.setAttribute('aria-hidden','true');
      shop.replaceChildren(document.createTextNode(c.button),arrow);
      shop.style.backgroundColor = c.accent;
    }
    const banner = document.querySelector('.mvn-owner-banner-img');
    if (banner && banner.dataset.ownerImage !== c.image) {
      const source = banner.closest('picture')?.querySelector('source');
      if (source) source.remove();
      banner.removeAttribute('srcset');
      banner.removeAttribute('sizes');
      banner.src = '/' + c.image;
      banner.dataset.ownerImage = c.image;
    }
    const categoryTitle = $('mvnEditorialCategoriesTitle');
    if (categoryTitle) categoryTitle.textContent = c.categories;
    const bestTitle = $('mvnBestSellers');
    if (bestTitle) bestTitle.textContent = c.bestsellers;
    const categoryBlock = document.querySelector('.mvn-editorial-categories');
    if (categoryBlock) categoryBlock.style.display = c.showCategories ? '' : 'none';
    const bestBlock = document.querySelector('.mvn-preview-best');
    if (bestBlock) bestBlock.style.display = c.showBestsellers ? '' : 'none';
    const heroBlock = $('mvnEditorial');
    if (heroBlock) {
      heroBlock.style.backgroundColor = c.pageBackground;
      heroBlock.style.paddingTop = c.heroPadding + 'px';
      heroBlock.style.paddingBottom = c.heroPadding + 'px';
    }
  };
  let previewReceived = false;
  if (window.parent !== window) window.addEventListener('message', (event) => {
    if (event.origin !== location.origin || event.source !== window.parent || !event.data || event.data.type !== 'MVN_HOMEPAGE_PREVIEW') return;
    previewReceived = true;
    apply(event.data.config);
  });
  fetch('/api/homepage-config', {cache:'no-store'})
    .then(r => r.ok ? r.json() : Promise.reject(Error('Homepage config unavailable')))
    .then(data => { if (!previewReceived) apply(data.published || defaults); })
    .catch(() => { if (!previewReceived) apply(defaults); });
})();
