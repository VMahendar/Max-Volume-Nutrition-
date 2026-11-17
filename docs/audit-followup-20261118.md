# Follow-up to live audit 99d32a59-8e0a-4f07-b9f6-d0b400eb5568

The mobile audit identified a 1,965,302-byte logo on Musclevite and the wholesale footer, oversized certificate/product media, small wholesale footer links and homepage CSP console warnings. This update keeps the original artwork and product content.

- The exact original wide logo is resized to 420 × 336 WebP (13,772 bytes). The 1.9 MB PNG remains available but is no longer loaded by those visible logos.
- Musclevite uses 440/880-pixel responsive derivatives (13,050/33,564 bytes), with the original photograph retained as the fallback and search image.
- The certificate gets 480/960-pixel responsive WebP previews, correct 1536:1024 intrinsic proportions and explicit header-logo dimensions. Its original document link is preserved.
- Wholesale footer links have at least 44 CSS pixels of height. The bag name and Best Seller link names now include their visible labels.
- Legacy HTML assignments in the cart/catalogue, homepage editor and visual selection overlay now pass through DOMPurify 3.4.18 and return explicit TrustedHTML where supported. Scripts, event handlers and javascript: links are removed. The original CSP, nonces, HSTS, COOP and report-only Trusted Types policy are unchanged; no permissive default policy is installed.
- A versioned, local sanitizer bootstrap is included before page scripts, with the upstream license. No CDN or additional paid infrastructure is used.
- Sitemap last-modified dates reflect the actual changed pages. Private/no-store responses are retained instead of weakening caching protections to satisfy the bfcache diagnostic.

Validation: npm run check passed; 191 Node tests passed. Browser checks confirmed safe text/data retention and removal of scripts, event attributes and javascript: URLs. Normal loads of Home, Shop, Musclevite, Certificate and Wholesale produced no CSP violations. Axe checks passed on Home, Shop, Musclevite and Wholesale at desktop and 390-pixel widths; the remaining certificate hero region warning was corrected. Cart opening and closing remained functional. Temporary test scripts and framing allowances were removed before the final tests.

Search Console inspection: Home and Potency Whey are indexed. Shop, Nitro Mass and Creatine are discovered but not indexed; Pre-Workout is crawled but not indexed; Musclevite is unknown. Inspection reads do not submit indexing requests. No indexing or ranking result is promised.
