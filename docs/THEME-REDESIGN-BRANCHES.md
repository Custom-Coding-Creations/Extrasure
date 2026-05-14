# Theme Redesign Branches

## Summary

This repository includes 10 separate full-site visual redesign branches. Each branch preserves the same product behavior while replacing the shared visual language across the highest-leverage surfaces:

- `src/app/globals.css`
- `src/app/layout.tsx`
- `src/app/page.tsx`
- `src/components/cta-strip.tsx`
- `src/components/account/account-shell.tsx`
- `src/components/admin/admin-shell.tsx`
- `src/components/admin/admin-nav.tsx`

Public header/footer token usage was standardized earlier in the rollout so later branches could diverge through shared design tokens, typography, and surface treatment without changing core product flows.

## Branch Matrix

| Branch | Commit | Visual Direction | Primary Characteristics | Validation |
| --- | --- | --- | --- | --- |
| `theme/minimal-luxury` | `33fbb7a` | Warm premium minimalism | restrained neutrals, serif-led elegance, soft editorial spacing | `npm run build` pass |
| `theme/dark-glass` | `40cd58f` | Dark glassmorphism | translucent panels, blur, layered highlights, polished dark shell | `npm run build` pass |
| `theme/cyberpunk` | `6154faf` | Futuristic cyberpunk | neon accents, high contrast, saturated dark gradients, sharp energy | `npm run build` pass |
| `theme/modern-saas` | `2262e6b` | Modern SaaS | crisp product UI, clean spacing, trustworthy blue system, light dashboards | `npm run build` pass |
| `theme/elegant-editorial` | `5a544b7` | Elegant editorial | typography-forward hierarchy, refined contrast, magazine-style polish | `npm run build` pass |
| `theme/neo-brutalism` | `702e557` | Neo-brutalism | heavy borders, flat blocks, bold contrast, unapologetic graphic surfaces | `npm run build` pass |
| `theme/soft-ui` | `c9532de` | Soft UI / neumorphism | rounded surfaces, inset/outset depth, cool gray-blue palette, gentle relief | `npm run build` pass |
| `theme/high-end-corporate` | `3cee4af` | High-end corporate | formal typography, premium navy and gold cues, restrained enterprise polish | `npm run build` pass |
| `theme/creative-agency` | `40d95f6` | Creative agency portfolio | expressive color blocking, bolder gradients, more playful brand energy | `npm run build` pass |
| `theme/ai-startup-gradient` | `2f619ea` | AI startup gradient | luminous blue-violet gradients, product-forward glow, modern AI brand feel | `npm run build` pass |

## Rollout Notes

- All redesigns were built as separate branches rather than stacked in one branch.
- The implementation pattern focused on shared surfaces first so each branch reads as a coherent full-site direction without rewriting every route individually.
- The branch tips listed above are the validated heads for the rollout.
- The workspace was left clean after the last branch validation.

## Preview Workflow

To inspect a theme locally:

1. `git checkout theme/<name>`
2. `npm install` if dependencies are not already present
3. `npm run dev`

To compare a theme against the default branch:

1. `git diff main...theme/<name> -- src/app/globals.css src/app/layout.tsx src/app/page.tsx src/components/cta-strip.tsx src/components/account/account-shell.tsx src/components/admin/admin-shell.tsx src/components/admin/admin-nav.tsx`

## Recommended Next Step

If one of these directions is selected for production refinement, start from that branch and deepen the redesign beyond shared surfaces by addressing secondary routes such as contact, pay, booking, and service detail pages.

PR starter copy for each branch lives in `docs/THEME-REDESIGN-PR-OUTLINES.md`.