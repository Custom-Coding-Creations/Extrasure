# ExtraSure Pest Control Website

Marketing site for ExtraSure Pest Control in Syracuse, NY, built with Next.js App Router and optimized for call-first local lead generation.

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
