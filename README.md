# ExtraSure Pest Control Platform

Public marketing website and owner operations dashboard for ExtraSure Pest Control in Syracuse, NY, built with Next.js App Router and optimized for lead generation, dispatch visibility, and payment operations.

## Local Development

1. Install dependencies:

```bash
npm install
```

2. Create environment values:

```bash
cp .env.example .env.local
```

3. Start development server:

```bash
npm run dev
```

Open http://localhost:3000.

## Lead Routing API

Form submissions from homepage and contact page are posted to `POST /api/lead`.

The API can fan out each lead to multiple webhook destinations:

- `LEAD_EMAIL_WEBHOOK_URL`
- `LEAD_SMS_WEBHOOK_URL`
- `LEAD_CRM_WEBHOOK_URL`

Behavior:

1. At least one successful route returns `200`.
2. If all configured routes fail, API returns `502`.
3. If no routes are configured, the API still returns `200` and logs the lead server-side for local testing.

## Owner Dashboard (Initial Implementation)

Launch dashboard routes:

- `/admin` (overview KPI board)
- `/admin/customers` (CRM)
- `/admin/schedule` (dispatch)
- `/admin/estimates` (estimate pipeline)
- `/admin/invoices` (billing cycles)
- `/admin/payments` (collection and retry queue)
- `/admin/reports` (owner metrics)
- `/admin/inventory` (material tracking)
- `/admin/automations` (workflow events)
- `/admin/settings` (role and 2FA status)

Current admin API routes:

- `GET /api/admin/dashboard`
- `GET /api/admin/payments`
- `POST /api/admin/payments` (queues retry intent in scaffold mode)
- `POST /api/admin/stripe/webhook` (signature-required scaffold endpoint)

The admin module currently uses in-app sample data to establish UI and workflow architecture. Persisted storage, live Stripe actions, and QuickBooks sync should be connected in the next implementation phase.

## Stripe Environment Variables

Add these in `.env.local` and Vercel Project Settings before enabling production payment flows:

- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`

## Conversion Tracking

Client events are emitted to `dataLayer` and `gtag` when available:

- `call_click`
- `lead_form_submit_attempt`
- `lead_form_submit_success`
- `lead_form_submit_error`
- `sms_click`
- `email_click`

## Quality Checks

```bash
npm run lint
```

## Deployment

Deploy on Vercel and set webhook environment variables in Project Settings before going live.
