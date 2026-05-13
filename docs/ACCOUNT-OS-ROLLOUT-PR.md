# Account Intelligence Rollout PR Notes

## Summary

Transforms the account area into an intelligent home protection operating system while preserving existing account routes, backend integrations, data models, and user actions.

## Scope

### New modules

- `src/lib/account-home-intelligence.ts`
- `src/lib/account-home-intelligence.test.ts`
- `src/components/account/account-home-dashboard.tsx`
- `src/components/account/account-home-timeline.tsx`
- `src/components/account/account-home-timeline.test.ts`
- `src/components/account/account-home-timeline.interaction.test.tsx`

### Updated account pages

- `src/app/account/page.tsx`
- `src/app/account/services/page.tsx`
- `src/app/account/activity/page.tsx`
- `src/app/account/billing/page.tsx`
- `src/app/account/invoices/page.tsx`
- `src/app/account/profile/page.tsx`
- `src/app/account/notes/page.tsx`
- `src/app/account/loading.tsx`

### Shared account surfaces

- `src/components/account/account-shell.tsx`
- `src/components/account/account-ai-assistant-card.tsx`
- `src/app/globals.css`

### Tooling updates

- `jest.config.cjs` (now includes `.test.tsx` matching)
- `package.json` and `package-lock.json` (testing-library/jsdom dependencies)

## Validation Evidence

### Lint

- `npm run lint -- src/app/account/page.tsx src/app/account/services/page.tsx src/app/account/activity/page.tsx src/app/account/billing/page.tsx src/app/account/invoices/page.tsx src/app/account/profile/page.tsx src/app/account/notes/page.tsx src/app/account/loading.tsx src/components/account/account-shell.tsx src/components/account/account-home-dashboard.tsx src/components/account/account-home-timeline.tsx src/components/account/account-home-timeline.test.ts src/components/account/account-home-timeline.interaction.test.tsx src/components/account/account-ai-assistant-card.tsx src/lib/account-home-intelligence.ts src/lib/account-home-intelligence.test.ts jest.config.cjs`
- Result: pass

### Tests

- `npm test -- src/lib/account-home-intelligence.test.ts src/lib/account-dashboard-metrics.test.ts src/lib/account-shell-data.test.ts src/components/account/account-home-timeline.test.ts src/components/account/account-home-timeline.interaction.test.tsx`
- Result: 5 suites passed, 15 tests passed

- `npm test -- src/lib/account-home-intelligence.test.ts src/components/account/account-home-timeline.test.ts src/components/account/account-home-timeline.interaction.test.tsx`
- Result: 3 suites passed, 7 tests passed

### Production build

- `npm run build`
- Result: pass (Next.js compile + TypeScript + static generation)

## Accessibility/Motion Checks Included in Code

- Timeline filter controls use tab semantics (`tablist`, `tab`, `aria-selected`)
- Active navigation link state in account shell uses `aria-current="page"`
- Reduced motion pathway exists in global styles (`@media (prefers-reduced-motion: reduce)`)

## Risks and Follow-ups

- `npm audit --omit=dev` reports 2 moderate vulnerabilities inherited via `next` -> `postcss` advisory (`GHSA-qx2v-qp2m-jg93`)
- Prisma CLI reports `package.json#prisma` deprecation warning and recommends migration to `prisma.config.ts` before Prisma 7

## Manual QA Checklist

- [x] Desktop pass across account home/services/activity/billing/invoices/profile/notes
- [x] Mobile pass across account shell nav and quick-action rail
- [x] Reduced-motion preference pass for key transitions (verified with media emulation)
- [x] Empty states and filter interactions in timeline (verified in browser + automated unit/jsdom coverage)
- [x] AI assistant prompt chips and CTA paths

## Manual QA Execution Log (This Branch)

- Environment: local dev server (`next dev`) at `http://localhost:3000`
- Verified routes load without runtime errors when unauthenticated:
	- `/account`
	- `/account/services`
	- `/account/activity`
	- `/account/login`
- Verified on `/account/login`:
	- Sign-in form fields/buttons render
	- Create-account fields/button render
	- Forgot-password email field/button render
	- OAuth entry points render (`Continue with Google`, `Continue with Microsoft`)
- Authenticated validation completed using a locally created QA account after setting a local `CUSTOMER_AUTH_SECRET` for dev runtime.
- Verified authenticated route rendering:
	- `/account`
	- `/account/services`
	- `/account/activity`
	- `/account/billing`
	- `/account/invoices`
	- `/account/profile`
	- `/account/notes`
- Verified timeline filter interaction empty state on `/account`:
	- Selected `Support` and `Billing` tabs with `aria-selected="true"`
	- Confirmed empty-state message: `No events match this filter yet.`
- Verified active route semantics across authenticated pages via `aria-current="page"`.
- Verified reduced-motion behavior by emulating `prefers-reduced-motion: reduce`:
	- Max transition duration reduced from `180ms` to `0.01ms`
	- Max animation duration reduced from `8500ms` to `0.01ms`

## Non-goals / Preserved Behavior

- No route removals
- No backend contract rewrites for account data fetching
- No billing/payment flow removals
- No admin architecture migration in this rollout

## Proposed PR Title

Account Portal: Intelligent Home Protection OS Rollout (No Contract Regressions)

## Proposed PR Body

### What this PR delivers

- Upgrades the customer account experience into an intelligence-first protection dashboard language across home, services, activity, billing, invoices, profile, and notes.
- Preserves existing route structure, account actions, backend contracts, and billing/service architecture.
- Adds a reusable account intelligence adapter and a reusable timeline feed surface.
- Improves mobile account shell navigation affordances and active-route accessibility semantics.
- Adds interaction-level testing for timeline filtering in jsdom.

### Key implementation details

- New intelligence adapter: derives protection score, trend, recommendation set, heatmap, continuity signals, and trust context from existing account metrics.
- New home dashboard composition: premium hero + protection dial + trend + recommendations + environmental context blocks.
- New timeline component: category tabs (`all/service/billing/support/ai`) with deterministic filtering and empty-state handling.
- Shared shell + assistant updates: denser mobile usage patterns, quick actions, clearer AI contextual prompts.

### Validation

- Lint: pass on all changed account pages/components/intelligence modules and Jest config.
- Tests: pass for account intelligence, shell data, dashboard metrics, timeline unit tests, and timeline interaction tests.
- Build: `npm run build` pass including Next.js compile, TypeScript check, and static generation.

### Risk notes

- Authenticated visual QA completed locally in dev after setting `CUSTOMER_AUTH_SECRET`.
- `npm audit --omit=dev` reports 2 moderate vulns through `next` -> `postcss` advisory (`GHSA-qx2v-qp2m-jg93`).
- Prisma warns that `package.json#prisma` config is deprecated before Prisma 7 and should move to `prisma.config.ts`.

### Follow-up after merge

- Evaluate safe dependency upgrade path for Next/PostCSS advisory resolution.
- Migrate Prisma config to `prisma.config.ts` in a dedicated maintenance PR.

## Suggested Commit Grouping

1. `feat(account): add intelligence adapter and account home dashboard`
	- `src/lib/account-home-intelligence.ts`
	- `src/lib/account-home-intelligence.test.ts`
	- `src/components/account/account-home-dashboard.tsx`
	- `src/app/account/page.tsx`

2. `feat(account): unify timeline experience across account pages`
	- `src/components/account/account-home-timeline.tsx`
	- `src/components/account/account-home-timeline.test.ts`
	- `src/app/account/activity/page.tsx`
	- `src/app/account/services/page.tsx`
	- `src/app/account/billing/page.tsx`
	- `src/app/account/invoices/page.tsx`
	- `src/app/account/profile/page.tsx`
	- `src/app/account/notes/page.tsx`

3. `feat(account): polish shell, assistant, loading state, and motion`
	- `src/components/account/account-shell.tsx`
	- `src/components/account/account-ai-assistant-card.tsx`
	- `src/app/account/loading.tsx`
	- `src/app/globals.css`

4. `test(account): enable interaction tests and add jsdom coverage`
	- `jest.config.cjs`
	- `src/components/account/account-home-timeline.interaction.test.tsx`
	- `package.json`
	- `package-lock.json`

## Authenticated QA Runbook (Re-run Template)

Use this checklist to re-run authenticated QA in future environments.

### Setup

- Start app: `npm run dev -- --port 3000`
- Login route: `/account/login`
- Authenticate with customer test credentials.

### Route checks

- `/account`
	- Protection dial, trend, recommendations, and map/trust cards render.
	- No layout overlap or clipping on desktop/mobile.
- `/account/services`
	- Upcoming/last service context renders.
	- Timeline defaults and category tabs behave correctly.
- `/account/activity`
	- Timeline entries render with expected category badges.
	- Empty-filter state messaging appears when a category has no entries.
- `/account/billing` and `/account/invoices`
	- Invoice/billing cards and timeline data render without action regressions.
- `/account/profile` and `/account/notes`
	- Existing profile/notes actions still submit and persist expected behavior.

### Accessibility and motion checks

- Confirm active account nav item exposes `aria-current="page"` on each route.
- Confirm timeline tabs expose selection state (`aria-selected`) as filters change.
- With OS/browser reduced motion enabled, confirm transitions are visually reduced.

### Exit criteria

- No route crashes or hydration errors.
- No action regressions in profile/notes/billing flows.
- Mobile shell and quick actions remain usable across account routes.