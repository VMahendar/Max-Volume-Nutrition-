# Automated customer review requests

Implemented on the existing MVN service. Installation creates no provider accounts, subscriptions or extra hosted services and leaves review-message delivery paused. WhatsApp uses the existing **+91 77088 30513**; SMS uses the business's approved MSG91 sender ID, not a spoofed mobile number.

## Owner workflow

Open Admin → Reviews → Google review link, completed purchases & review requests → Automatic review requests.

1. Connect the existing WhatsApp number through supported Business App coexistence onboarding. Preserve the existing mobile app account; do not delete or migrate its account to work around onboarding. Complete provider account/billing checks in the provider UI.
2. Put API credentials only in Render's encrypted environment settings. Never paste access tokens or passwords in chat or in the public repository.
3. Have Meta approve both exact review templates shown in the admin panel. Use body-only positional templates with four fields: first name, product name, invitation URL, stop URL. Request and reminder have separate template names. The sender check verifies the actual existing number belongs to the configured WABA and both exact template bodies are approved. The check does not send any messages.
4. Connect/fund an existing MSG91 account only within the owner's approved messaging budget. Complete SMS DLT entity, sender, template and URL allowlisting with MSG91. Create an approved SMS flow with variables named `review_url` and `stop_url`. Both are populated with the invitation link. Disable URL shortening. The registered flow must be associated with the declared sender and DLT template. No new provider account is created by the code.
5. Save the confirmed Kelambakkam Google review URL in Reviews settings. Missing URLs block automatic delivery rather than directing customers to an unconfirmed listing.
6. Approve messaging costs and provider billing limits, then configure the delivery gates below. These flags must not be set just to remove an error. The in-app daily/monthly caps count attempted API requests, including unknown/failed attempts; they are not a rupee spending guarantee. SMS can have multiple billable segments. Keep a provider spending limit as well.
7. Run the WhatsApp sender/template check, set suitable combined channel limits and enable review requests. Both channel checks must pass to enable. Only deliveries recorded after first activation qualify; there is no bulk import or historical backfill.

For WhatsApp/offline sales, record the completed receipt and delivery in the purchase verification form. This automatically creates one delivery event per receipt/product. For paid website orders linked to a customer account, the transition to delivered creates events for purchased products. An enquiry, a lead marked converted, registration, a cart or payment without delivery never qualifies. This does not activate website payments or couriers.

Record the customer's actual delivery phone and their separate, explicit permission for WhatsApp and SMS using the consent form. Keep a short reference to when and where they agreed. Existing marketing preferences are not imported as review consent. Customers with a confirmed delivery contact can change these review preferences in their account; they cannot enter someone else's number there.

## Environment settings

- `REVIEW_AUTOMATION_ENABLED=true`: explicit review delivery gate.
- `REVIEW_MESSAGE_SPEND_APPROVED=true`: set only after owner approval of messaging costs and provider spending limits.
- Production must be `NODE_ENV=production`, `STAGING_MODE=false`; staging/test processes never send.
- Reuse `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_GRAPH_VERSION`, `WHATSAPP_TEMPLATE_LANGUAGE`, `WHATSAPP_APP_SECRET`. Add `WHATSAPP_BUSINESS_ACCOUNT_ID` for the actual account containing the existing sender.
- `REVIEW_WHATSAPP_REQUEST_TEMPLATE`, `REVIEW_WHATSAPP_REMINDER_TEMPLATE`: exact approved template names.
- `REVIEW_WHATSAPP_VERIFY_TOKEN`: a distinct random webhook verification secret.
- `MSG91_AUTH_KEY`, `REVIEW_SMS_TEMPLATE_ID`: actual SMS API credentials and approved flow/template.
- `REVIEW_SMS_SENDER_ID`: approved six-letter uppercase sender.
- `REVIEW_SMS_DLT_ENTITY_ID`, `REVIEW_SMS_DLT_TEMPLATE_ID`, `REVIEW_SMS_DLT_APPROVED=true`: registered details, declared after approval. The MSG91 flow supplies its mapped sender and DLT routing; these IDs are readiness checks, not substitute registration or verification by the application.

Meta webhook URL: `https://maxvolumenutriton.shop/api/reviews/whatsapp-webhook`. Subscribe the existing app to message/status events and configure the verification token. Incoming POST payloads require the valid Meta HMAC signature and the configured phone number ID. Delivery receipts are matched to the message reference and customer phone. `STOP`, `UNSUBSCRIBE` and `CANCEL` withdraw WhatsApp review consent; the invitation's stop button withdraws both channels. Review webhook setup must be coordinated with any existing Meta callback configuration; do not overwrite another workflow's callback without arranging routing.

## Delivery and limits

- Scheduler runs every five minutes in the existing process, between 09:00 and 20:00 India time.
- First request: at least three days after confirmed delivery.
- One reminder per channel: at least five days after initial provider acceptance, only while eligible. No repeat reminder loop.
- One cycle per customer/product per 30 days; one attempted message per phone/channel per 24 hours. Combined channel daily/monthly caps apply to all attempts.
- Requests expire 30 days after delivery. Pause cancels queued jobs. Consent/contact changes cancel old jobs. Refunded/revoked purchases and submitted product reviews suppress sends, including a pending or low-rating review.
- A public invitation token reveals only the product name and safe review links, never the customer's email, phone or receipt. GET requests have no side effects, so link scanners cannot silently unsubscribe the customer.
- Customer can mark the invitation done or stop both channels without signing in. Product-review submission is detected regardless of rating or moderation status. Google does not provide reliable submission tracking here; do not claim it does. The customer can dismiss reminders after a Google review.
- Provider acceptance is recorded separately from confirmed delivery. Signed Meta callbacks can update WhatsApp sent/delivered/read status. SMS acceptance and request IDs are recorded; actual SMS delivery remains in MSG91 reports. Do not label SMS accepted as delivered.
- Interrupted, timeout, HTTP 5xx/429 and malformed acceptance outcomes are held as unknown and are never automatically retried. Reconcile with provider reports. This avoids duplicate messages and duplicate billing.

Before enabling in production, complete a permitted test with a consenting owner-controlled recipient, verify opt-out and both provider receipts, then enable only within the agreed budget. The application tests use mock providers and send no real messages. Native Google review submission and star ratings remain entirely the customer's choice.

Official references: [Meta Business App coexistence](https://developers.facebook.com/documentation/business-messaging/whatsapp/embedded-signup/onboarding-business-app-users), [Meta template status](https://developers.facebook.com/docs/graph-api/reference/whats-app-business-account/message_templates/), [MSG91 SMS API](https://docs.msg91.com/en/sms/send-sms).
