(() => {
  const product = new URLSearchParams(location.search).get('product');
  if (!['whey', 'mass', 'creatine', 'pre', 'vitamins'].includes(product) || typeof showDetail !== 'function') return;
  showDetail(product);
})();
