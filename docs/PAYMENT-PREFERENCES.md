# Payment Preferences and ACH Optimization

## Overview

This document describes the local payment preference model that complements Stripe as the payment processor source of truth. The goal is to support ACH-first checkout UX, customer autopay intent, and admin adoption analytics while keeping existing payment flows backward compatible.

## Data Model

### Customer fields

Defined in Prisma Customer model:

- preferredPaymentMethod: enum card | ach | none (default none)
- autopayEnabled: boolean (default false)
- autopayMethodType: enum card | ach | none (default none)
- achDiscountEligible: boolean (default true)

### SavedPaymentMethod model

Local snapshot of Stripe-attached methods:

- id
- customerId
- stripePaymentMethodId (unique)
- type (card | ach)
- brand
- last4
- isDefault
- createdAt
- updatedAt

Index:

- customer_payment_pref_idx on (customerId, isDefault)

## Service APIs

Primary implementation: src/lib/payment-preferences.ts

### Sync and retrieval

- syncSavedPaymentMethodsFromStripe(stripeCustomerId)
- syncAllSavedPaymentMethodsFromStripe()
- getCustomerPaymentMethods(customerId)
- getDefaultPaymentMethod(customerId)

### Preference updates

- setPreferredPaymentMethod(customerId, type)
- enableAutopay(customerId, methodType)
- disableAutopay(customerId)
- updateCustomerPaymentPreferences(customerId, options)

### Discount logic

- isAchDiscountEligible(customerId)
- calculateAchDiscount(amount)

## Stripe integration points

Primary implementation: src/lib/stripe-billing.ts

- applyAchDiscountIfEligible(paymentIntentId, customerId, originalAmount)
- attachPaymentMethodPreference(paymentIntentId, preferredMethod)
- getPaymentElementOptionsForAch(customerId, isRecurring)

### Checkout Elements save-method behavior

The checkout initialization path now accepts savePaymentMethod and uses it when creating Checkout Elements sessions for one-time payments.

- savePaymentMethod=true sets payment_intent_data.setup_future_usage=off_session
- savePaymentMethod=false omits setup_future_usage
- recurring subscription checkouts are unaffected by this flag

## API routes

### Customer routes

- GET /api/payment-methods
  - Returns saved methods and customer preference snapshot
- POST /api/payment-methods/preferences
  - Updates preferred method and autopay settings
- PATCH /api/payment-methods/{savedPaymentMethodId}
  - action=set-default
- DELETE /api/payment-methods/{savedPaymentMethodId}
  - Removes local saved method and detaches Stripe method where appropriate

### Sync route

- POST /api/payment-methods/sync
  - Admin-only bulk sync for customers with Stripe IDs

### Checkout initialization

- POST /api/payment-intent
- POST /api/book/checkout-elements
- POST /api/admin/payments/checkout-elements

All three support savePaymentMethod and return:

- clientSecret
- sessionId
- type
- paymentElementOptions
- achDiscount
- preferredPaymentMethod

## Webhook reconciliation

Stripe webhook handler in src/lib/stripe-billing.ts updates local saved methods through these events:

- checkout.session.completed
- checkout.session.async_payment_succeeded
- payment_method.attached
- charge.succeeded

This keeps local SavedPaymentMethod records aligned with Stripe-side method attachment activity.

## Admin analytics

Metrics helpers in src/lib/admin-page-data.ts:

- getAchAdoptionMetrics()
- getPaymentMethodDistribution()

UI page:

- /admin/payments/ach-analytics

KPI coverage:

- ACH adoption
- Autopay adoption
- ACH discount usage count
- Estimated discount savings YTD
- Method distribution
- ACH vs card success comparison
- ACH share by billing cycle

## Migration and compatibility

- Existing customers default to preferredPaymentMethod=none, autopayEnabled=false, autopayMethodType=none
- Existing checkout and invoice flows remain valid; ACH behavior is additive
- Stripe remains source of truth for credentials and payment execution
- Local DB stores only metadata used for preference, UX, and analytics

## Rollout verification checklist

1. Existing invoice and booking payment flows complete successfully for non-ACH users.
2. ACH-preferred eligible customer sees ACH-first ordering and 3% savings messaging.
3. One-time checkout savePaymentMethod toggle changes setup_future_usage behavior.
4. Saved payment methods sync into SavedPaymentMethod after checkout/webhook events.
5. Customer can set default and remove methods in account billing payment methods page.
6. Preferred payment method and autopay settings persist after refresh/new session.
7. Admin sync endpoint completes without auth bypass and returns synced customer count.
8. Discount is not applied when achDiscountEligible is false.
9. Admin ACH analytics page loads and shows coherent numbers.
10. Targeted tests pass: admin-page-data, stripe-billing.ach-helpers, payment-preferences.

## Manual verification status (2026-05-13)

Environment prerequisite used for local validation:

- CUSTOMER_AUTH_SECRET and ADMIN_AUTH_SECRET must be set for customer/admin session creation.
- Admin email login for local checks used ADMIN_LOGIN_EMAIL/ADMIN_LOGIN_PASSWORD.

Verified outcomes:

- Customer portal signup now succeeds and redirects to /account.
- /account/billing/payment-methods loads while authenticated and renders Billing Method Manager controls.
- Owner login succeeds and /admin/payments/ach-analytics renders KPI blocks and distribution metrics.
- Tokenized invoice checkout renders Payment Element without Stripe IntegrationError.
- savePaymentMethod toggle causes checkout re-initialization requests to /api/payment-intent.

## Automated verification evidence (2026-05-13)

- Added [src/lib/stripe-billing.checkout-elements.test.ts](src/lib/stripe-billing.checkout-elements.test.ts) to assert one-time checkout behavior:
- savePaymentMethod=false omits payment_intent_data.setup_future_usage.
- default behavior sets payment_intent_data.setup_future_usage=off_session.
- recurring checkout path uses subscription_data and does not apply one-time setup semantics.
- Existing route tests in [src/app/api/payment-methods/[savedPaymentMethodId]/route.test.ts](src/app/api/payment-methods/[savedPaymentMethodId]/route.test.ts) continue to cover set-default/delete auth, 404, and success edge paths.
- Targeted regression command passed:
- npm test -- payment-intent payment-methods stripe-billing.ach-helpers stripe-billing.checkout-elements payment-preferences admin-page-data --runInBand
