# Lighthouse corrections — 18 November 2026

Prepared for review against main commit 9ebf2253b8dd6187a049251f53e5a3f344277864. Not deployed.

- Keep original product photography; correct the homepage creatine image's intrinsic dimensions to 530 × 644.
- Add a visible homepage main landmark and keyboard skip link. Keep the retired catalogue hidden and preserve owner section ordering.
- Make the closed shopping cart inert. Opening restores interaction, traps keyboard focus (including the address textarea), and closing restores the trigger. Use a div for its dialog role; correct the carousel slide role and remove unsupported MRP labels.
- Correct measured low-contrast text in Home, Shop, Nitro Mass, My Account and About Us while retaining the approved palette. Correct the Shop heading sequence and name information-page regions.
- Issue a new cryptographic nonce for each HTML response and apply strict-dynamic CSP to trusted template and server-generated scripts. Preserve product schema, cart, admin, visual editor and payment-script compatibility.
- Add COOP same-origin-allow-popups. Preserve existing production HSTS (one year plus subdomains). No preload registration or HTTPS commitment change.
- Use Trusted Types in report-only mode. Enforcing it still requires migrating the existing cart/admin HTML sinks; no permissive default policy was added. Reports appear in the browser console; no remote report collector is configured.
- Refresh changed script and stylesheet URLs to avoid stale browser assets.

## Verification

- npm run check passed.
- npm test: 175 tests passed, zero failures. Includes an HTTP regression test checking unique nonces, template and generated script authorization, no-store HTML, production HSTS and COOP.
- axe-core 4.14.1: no automatically detected WCAG A/AA or best-practice violations on Home, Shop, Potency Whey, Nitro Mass, Pre-Workout, Creatine, My Account, Wholesale, About and Contact in desktop and 390-pixel iframe viewports. Some image/overlay contrast checks remain manual; this is not a claim of complete accessibility compliance or a new Lighthouse score.
- Browser checked cart open/close, background inertness, forward/backward focus wrap, Escape and trigger restoration, plus the native collection dialog.
- Security script checks ran with the stronger CSP active. Real provider payments remain disabled and were not exercised.
- Temporary audit scripts and framing allowances were removed before the final regression run.

These changes do not establish or resolve Google's desktop homepage ranking. Google-selected canonical and query/device performance still require Search Console data.
