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

For Prisma and Stripe local development, mirror the needed values into `.env` as well because Prisma CLI reads from `.env`.

3. Start development server:

```bash
npm run db:generate
npm run db:push
npm run db:seed
```

4. Start development server:

```bash
npm run dev
```

Open http://localhost:3000.

## Stripe Setup

1. Install the Stripe CLI and authenticate:

```bash
stripe login
```

2. Start local webhook forwarding:

```bash
stripe listen --forward-to localhost:3000/api/admin/stripe/webhook
```

3. Copy the generated `whsec_...` signing secret into `STRIPE_WEBHOOK_SECRET`.

4. Ensure these variables are set locally and in Vercel for deployment:

- `SITE_URL` or `NEXT_PUBLIC_SITE_URL`
- `STRIPE_PUBLISHABLE_KEY`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`

5. Recommended test flows:

- Pay an open invoice from `/admin/payments`
- Start autopay for a recurring invoice from `/admin/payments`
- Open the Stripe billing portal from `/admin/payments`
- Refund a successful payment from `/admin/payments`

Webhook processing is the source of truth for payment success/failure and subscription updates.

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

## AI Chatbot (Milestone A Foundation)

Website chat requests post to `POST /api/ai/chat`.

Current behavior:

1. Uses approved internal FAQ/service content as context.
2. Applies guardrails for medical/legal questions, definitive pesticide safety claims, and guaranteed pricing requests.
3. Always returns human handoff options (call, SMS, contact form).
4. Supports optional OpenAI response generation when configured.
5. Logs transcript events to a webhook when configured.

AI environment variables:

- `OPENAI_API_KEY` (optional, enables GPT response generation)
- `AI_CHAT_MODEL` (optional, default: `gpt-4.1-mini`)
- `AI_TRANSCRIPT_WEBHOOK_URL` (optional, receives transcript events)

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

Owner login route:

- `/owner-login`

Current admin API routes:

- `GET /api/admin/dashboard`
- `GET /api/admin/payments`
- `POST /api/admin/payments` (queues retry intent in scaffold mode)
- `POST /api/admin/stripe/webhook` (signature-required scaffold endpoint)

The admin module now persists through Prisma with a local SQLite database by default (`DATABASE_URL="file:./prisma/dev.db"`). Stripe checkout, billing portal, refund actions, and verified webhook handling are implemented; QuickBooks sync remains for the next implementation phase.

## Admin Authentication Variables

Set these for owner login and signed admin sessions:

- `ADMIN_AUTH_SECRET`
- `ADMIN_LOGIN_EMAIL`
- `ADMIN_LOGIN_PASSWORD`
- `ADMIN_LOGIN_NAME` (optional, defaults to `Owner`)
- `ADMIN_LOGIN_ROLE` (optional, defaults to `owner`)

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
