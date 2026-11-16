(() => {
  const mode = new URLSearchParams(location.search).get('open');
  if (mode !== 'cart' || typeof openBag !== 'function') return;
  const key = 'mvn-inline-order-v1';
  try {
    const pending = JSON.parse(sessionStorage.getItem(key) || 'null');
    sessionStorage.removeItem(key);
    if (pending && typeof pending.id === 'string' && Number.isSafeInteger(pending.quantity) && pending.quantity > 0 && pending.quantity <= 99) {
      const pack = purchasedPack(pending.id);
      if (pack) {
        const cartKey = pack.p.id + '|' + pack.i;
        cart[cartKey] = Math.min(999, (cart[cartKey] || 0) + pending.quantity);
        persist();
      }
    }
  } catch { /* The existing cart still opens when storage is unavailable. */ }
  history.replaceState(history.state, '', '/shop.html');
  openBag();
})();
