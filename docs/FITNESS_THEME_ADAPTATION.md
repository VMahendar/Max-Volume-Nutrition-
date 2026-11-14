# Advance Fitness Gym-inspired MVN storefront refresh

## Source and scope
The owner uploaded `advance-fitness-gym.pot`. This is a GNU gettext **translation template** identifying Themeshopy's **Advance Fitness Gym 1.2.5** WordPress theme, not a complete WordPress theme archive. WordPress.org currently lists a newer version; its description informed this *original MVN visual adaptation*. No theme PHP, WooCommerce, or vendor assets were installed.

MVN is a Node.js/SQLite storefront. `public/` is the source actually served by Render; root-level static compatibility files are not the production entrypoint.

## Changed
- `public/mvn-fitness-retail.css`: scoped stylesheet for the browser storefront and five public supplement-information pages.
- `public/index.html`: adds scoped class and the stylesheet link after the existing design layers.
- `public/potency-whey.html`, `nitro-mass.html`, `pro-creatine.html`, `sturdy-pre-workout.html`, `musclevite-multivitamin.html`: load the same product-page theme layer.

## Intent
- Charcoal gym-inspired header and clearer categories, bold high-contrast product merchandising.
- One restrained warm-red interactive accent, avoiding an all-gold/all-blue page.
- White, spacious product cards; original manufacturer and owner-supplied photos remain uncropped.
- Desktop and mobile layouts retain existing interaction and responsive behavior.

## Untouched
- Existing official MVN logo files and owner-provided landscape art.
- Product catalogue and descriptions, retail/wholesale prices, images, inventory, GST, accounts.
- Cart and WhatsApp order-enquiry behavior.
- Payment and shipping disabled-state settings.
- Mobile app, backend services, database, Render, DNS and indexing configuration.

## Release checklist (must be verified before merge/deploy)
1. Inspect 1440px desktop / 768px tablet / 390px Android view for header/logo, readable navigation and no horizontal scroll.
2. Verify hero/banner is fully visible and each product photo remains the correct source pack.
3. Click category filters and search; verify catalogue price, flavour, pack size and add-to-bag behavior.
4. Open/close cart, review WhatsApp request text, and verify both account/wholesale links.
5. Load each of the five product pages, check breadcrumbs, images, enquiries and internal links.
6. Verify payments and shipping remain disabled, then run repository checks / CI.
7. Only merge and deploy after owner approves the visual review.

## Rollback
Remove the `mvn-fitness-retail.css` link and added body class from these six pages. The existing styles immediately resume. No backend/database migration is involved.
