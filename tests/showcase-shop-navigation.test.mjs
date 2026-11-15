import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
const home=readFileSync('public/index.html','utf8');
const shop=readFileSync('public/shop.html','utf8');
const css=readFileSync('public/mvn-showcase-shop.css','utf8');
const app=readFileSync('public/app.js','utf8');

test('home presents original supplements once; shopping catalogue opens on a separate URL',()=>{
 assert.match(home,/mvn-showcase-home/);
 assert.match(shop,/mvn-full-shop/);
 assert.match(home,/href="shop\.html"/);
 assert.match(home,/href="shop\.html\?cat=whey"/);
 assert.match(home,/href="shop\.html\?cat=pre"/);
 assert.match(home,/href="shop\.html\?cat=creatine"/);
 assert.equal((home.match(/SHOP THE COLLECTION/g)||[]).length,1,'no repeated Shop the Collection button');
 assert.match(css,/mvn-showcase-home[^\n]* main#shop/,'homepage visually hides full catalogue');
 assert.match(css,/mvn-full-shop[^\n]* #shop/,'separate shop displays catalogue');
 assert.doesNotMatch(shop,/id="mvnEditorial"/,'shop does not repeat full group banner');
 assert.doesNotMatch(shop,/mvn-theme-shop-goals/,'shop does not repeat goal cards');
 assert.match(shop,/id="grid"/,'product cards remain intact');
 assert.match(shop,/id="bag"/,'cart remains available');
 assert.match(shop,/id="checkoutFields"/,'WhatsApp checkout is preserved');
 assert.match(shop,/id="priceRange"/,'retail price filter is preserved');
 assert.match(shop,/href="https:\/\/maxvolumenutriton\.shop\/shop\.html"/,'shop has its own canonical');
 assert.ok(existsSync('public/shop.html'));
 assert.match(readFileSync('public/sitemap.xml','utf8'),/<loc>https:\/\/maxvolumenutriton\.shop\/shop\.html<\/loc>/);
 assert.equal(readFileSync('index.html','utf8'),home);
 assert.equal(readFileSync('shop.html','utf8'),shop);
 assert.equal(readFileSync('mvn-showcase-shop.css','utf8'),css);
});

test('goal photography is grounded and source product packs remain unchanged',()=>{
 assert.equal((home.match(/class="mvn-editorial-category mvn-editorial-category-/g)||[]).length,3);
 assert.match(home,/src="assets\/mvn-homepage-banner-20261115\.webp"/);
 assert.match(home,/src="https:\/\/revakanya\.com\/assets\/imgs\/Pro%20Creatine%20Blueberry\.png"/,'genuine manufacturer Blueberry pack used in homepage');
 assert.match(home,/src="assets\/sturdy-watermelon-front-card\.webp"/);
 assert.match(css,/\.mvn-theme-goal-art::after/,'grounded floor shadows');
 assert.match(css,/\.mvn-editorial-promo > img/,'right promo pack is resized safely');
 assert.match(css,/object-fit:contain!important/,'no cropping the original product sources');
});

test('category and search router only redirects on homepage, keeps shop and app intact',()=>{
 assert.match(app,/isShowcaseHome=document\.body\.classList\.contains\('mvn-showcase-home'\)/);
 assert.match(app,/isFullShop=document\.body\.classList\.contains\('mvn-full-shop'\)/);
 assert.match(app,/shopRouteParams\.get\('cat'\)/);
 assert.match(app,/shopRouteParams\.get\('q'\)/);
 assert.match(app,/location\.assign\('shop\.html\?cat='/);
 assert.match(app,/location\.assign\('shop\.html\?q='/);
 assert.match(app,/openBag\(\)/,'cart and drawer functions remain');
 assert.ok(!home.match(/href="#shop"/),'home category links open the new page');
});

test('homepage has no large multi-column footer; essential links live on separate pages',()=>{
 assert.doesNotMatch(home,/<footer\s/,'homepage footer is removed, not merely hidden');
 assert.match(shop,/<footer class="mvn-compact-footer"/,'shop has compact policy footer');
 assert.doesNotMatch(shop,/class="site-footer mvn-home-footer"/,'oversized 4-section footer is removed');
 for (const link of ['contact.html','shipping.html','returns.html','privacy.html','terms.html']) assert.ok(shop.includes('href="'+link+'"'),'essential policy or contact link '+link);
 assert.match(home,/href="contact\.html"/,'Contact is available through the existing 3-dot menu');
 const c=readFileSync('public/contact.html','utf8');
 assert.match(c,/maxvolumenutrition@gmail\.com/);
 assert.match(c,/\+91 77088 30513/);
});
test('Blueberry and Cranberry images are never mixed',()=>{
 const product=readFileSync('public/pro-creatine.html','utf8');
 const original='https://revakanya.com/assets/imgs/Pro%20Creatine%20Blueberry.png';
 assert.ok((home.match(/Pro%20Creatine%20Blueberry\.png/g)||[]).length===2,'the home promo and goal show the same Blueberry pack');
 assert.ok(product.includes(original),'product details use the same official Blueberry pack');
 assert.ok(app.includes(original),'Blueberry retail option uses that pack');
 assert.match(app,/name:"Pro Creatine",cat:"creatine",featuredIndex:0/,'Blueberry is selected first');
 assert.match(app,/label:"Cranberry · 250 g"/,'Cranberry remains an independent pack option');
});

// Keep the top navigation, existing cart/filter JS hooks, and product grid
// while making the in-page shopping controls less crowded on phone screens.
test('shop only uses dark-blue brand panel, compact collection header and hidden duplicate filters',()=>{
 const theme=readFileSync('public/mvn-shop-cleanup.css','utf8');
 assert.match(shop,/mvn-shop-hero-logo/,'official logo appears in shop blue header');
 assert.match(shop,/src="max-volume-logo-wide.png"/,'reuse existing official logo asset');
 assert.match(shop,/mvn-shop-cleanup\.css\?v=20261115-dark-blue-1/);
 assert.match(theme,/#07162f/,'shop hero uses dark blue palette');
 assert.match(theme,/#shop > \.section-title/,'collection title has the shop-only blue treatment');
 assert.match(theme,/#shop \.cats,/,'remove duplicate category chip row visually');
 assert.match(theme,/\.productbar \.sort-label/,'hide sort dropdown visually');
 assert.match(shop,/id="sort"/,'preserve sorting hook for JS');
 assert.match(shop,/class="cats"/,'preserve category hook for JS');
 assert.match(shop,/id="grid"/,'preserve product catalogue');
 assert.match(shop,/class="mvn-theme-main-nav"/,'preserve top navigation');
 assert.doesNotMatch(home,/mvn-shop-cleanup\.css/,'homepage styling unchanged');
});

test('shop dark-blue header exposes account/cart, hides redundant controls, and keeps Home navigation intact',()=>{
 const home=readFileSync('public/index.html','utf8');
 const shop=readFileSync('public/shop.html','utf8');
 const style=shop.match(/<style id="mvn-compact-dark-blue-shop-v2">([\s\S]*?)<\/style>/)?.[1]||'';
 assert.ok(style,'shop-specific dark-blue styles exist');
 assert.match(shop,/class="mvn-theme-home-link" href="\/"/);
 assert.match(shop,/class="mvn-theme-main-nav"/);
 assert.match(shop,/href="account.html" aria-label="My Account"/);
 assert.match(shop,/id="bag" type="button" aria-label="View shopping cart"/);
 assert.match(shop,/<span>View cart<\/span>/);
 for(const key of ['#0c2a4d','.cats','.sort-label','.collection-filters','.head-actions'])assert.ok(style.includes(key),'style covers '+key);
 for(const id of ['id="sort"','id="grid"','id="priceRange"','id="checkoutFields"','id="bag"'])assert.ok(shop.includes(id),'commerce hook retained '+id);
 assert.ok(!home.includes('mvn-compact-dark-blue-shop-v2'),'Home styling is unchanged');
 assert.equal(readFileSync('shop.html','utf8'),shop,'served and root shop stay identical');
});
