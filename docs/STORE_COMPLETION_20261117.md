# Store completion — 17 November 2026

Globe-Tech remains **Coming soon** without prices. No whey or mass-gainer packs are added to that collection.

## Changes

- Homepage Best Sellers uses Shop All's original pack photographs, neutral cards and current gold/charcoal palette.
- Four featured product pages share contained photography, readable headings, pack/flavour selectors and the same visual treatment as Shop All.
- Admin Customers now lists all registered accounts, independently of marketing consent, with search, pagination, registration time, newly tracked successful sign-ins and linked order/enquiry history. Existing sign-in history is not invented.
- Signed-in WhatsApp enquiries are linked server-side to the account; customers can see their references/status. Guest enquiries remain in the private enquiry inbox, without matching accounts by name or phone.
- Admin Store health & backups reports the recorded upload and isolated restore check, with a downloaded encrypted-file verification form. The restore check never replaces the running database and does not expose recovery keys or row contents.
- Owner enquiry alerts have a persistent, duplicate-protected queue for email and WhatsApp. A provider acceptance is recorded as accepted, not delivered; uncertain outcomes are held for review rather than resent. Customer marketing settings are unchanged.

## Owner alert connection

No new provider account, paid service or customer campaign is created. The queue remains inactive until the owner configures existing provider credentials in Render:

Email: `ORDER_ALERTS_ENABLED=true`, `RESEND_API_KEY`, `ORDER_ALERT_FROM` (verified sender), `ORDER_ALERT_EMAIL` (owner recipient).

WhatsApp: `ORDER_ALERTS_ENABLED=true`, existing `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_GRAPH_VERSION`, `WHATSAPP_TEMPLATE_LANGUAGE`, plus `ORDER_ALERT_WHATSAPP_TO` (owner number, country code and digits only), `ORDER_ALERT_WHATSAPP_TEMPLATE` (approved utility template with one body parameter: enquiry reference).

Alerts contain only the enquiry reference and owner-dashboard link. They do not contact customers, import contacts or enable automatic marketing. Check the owner inbox/provider delivery receipts before treating external delivery as verified. Failed or uncertain attempts require provider reconciliation; this update intentionally does not offer blind resending.

## External verification observed

- Drive contains daily encrypted files from 8–16 November. Latest `mvn-2026-11-16.sqlite.enc` was created 17 November at 02:30 IST, before the next daily window.
- An actual downloaded production file still needs its isolated restore verification using the owner's authenticated Store health screen. Unit tests of recovery mechanics do not establish production disaster recovery.
- Google Search Console: homepage and Potency Whey submitted/indexed; Nitro Mass and Pro Creatine discovered but not indexed; Sturdy Pre-Workout crawled but not indexed. All three are already in the sitemap. Inspection reads Google's existing state and does not submit an indexing request or guarantee ranking.
- Payment and automated shipping remain disabled. Existing stock quantities, trade prices, business settings and owner credentials are preserved.

## Acceptance

- Source validation and 174 unit/integration tests pass.
- Isolated Chromium acceptance passes at 390 px and 1440 px: all four product pages, original pack images and flavour switching, five-slide carousel, responsive Best Sellers, persistent cart, Coming Soon catalogue, customer registration/login and account-linked enquiries, admin access controls/directory, wholesale approval and owner banner editor.
- The sitemap records 17 November only for pages changed in this release. Search indexing remains Google's external decision.
