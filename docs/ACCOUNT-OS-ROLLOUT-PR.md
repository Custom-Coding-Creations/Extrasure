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

- [ ] Desktop pass across account home/services/activity/billing/invoices/profile/notes (blocked: requires authenticated account session)
- [ ] Mobile pass across account shell nav and quick-action rail (blocked: requires authenticated account session)
- [ ] Reduced-motion preference pass for key transitions (blocked in browser QA due auth gating; code path present and lint/build/test validated)
- [ ] Empty states and filter interactions in timeline (automated coverage complete via unit + jsdom interaction tests)
- [ ] AI assistant prompt chips and CTA paths (blocked: requires authenticated account session)

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
- Constraint: full redesigned authenticated account surfaces cannot be visually exercised without valid account credentials/session in this environment.

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

- Authenticated visual QA remains pending because no signed-in test account/session is available in this environment.
- `npm audit --omit=dev` reports 2 moderate vulns through `next` -> `postcss` advisory (`GHSA-qx2v-qp2m-jg93`).
- Prisma warns that `package.json#prisma` config is deprecated before Prisma 7 and should move to `prisma.config.ts`.

### Follow-up after merge

- Run authenticated manual QA checklist across desktop/mobile and reduced-motion user preference.
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