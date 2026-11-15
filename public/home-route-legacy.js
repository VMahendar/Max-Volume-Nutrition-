// Preserve existing deep links from product pages, Google and bookmarks after separating the homepage.
(() => {
 const hash=window.location.hash;
 const allowed=new Set(['#shop','#offers','#brands','#certificate','#dealer','#search']);
 if(allowed.has(hash.toLowerCase())) window.location.replace('shop.html'+hash);
})();
