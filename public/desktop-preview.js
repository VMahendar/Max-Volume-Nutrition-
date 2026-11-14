// Optional phone-based desktop preview. No stored preference or desktop override for regular visitors.
// An external script is required because the storefront CSP blocks inline JavaScript.
if (new URLSearchParams(window.location.search).get('desktop') === '1') {
  const viewport = document.querySelector('meta[name="viewport"]');
  if (viewport) {
    const layoutWidth = 1280;
    const screenWidth = Number(window.screen?.width) || 390;
    const initialScale = Math.min(1, Math.max(0.2, screenWidth / layoutWidth));
    viewport.setAttribute('content', 'width=' + layoutWidth + ',initial-scale=' + initialScale.toFixed(3) + ',user-scalable=yes');
    document.documentElement.setAttribute('data-desktop-preview', 'true');
  }
}
