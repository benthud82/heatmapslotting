# HeatmapSlotting Go-Live Audit and Deployment Steps

Last updated: 2026-02-15  
Owner: Codex + Product Team  
Scope: full-stack app in `C:\xampp\htdocs\heatmapslotting`

## Purpose
This document is the single source of truth for taking the app from current state to production readiness in controlled phases.

It includes:
- all major findings from the deep audit
- exact file references
- a phased execution plan
- validation checklists and rollback notes
- implementation notes for future Codex sessions (after context reset)

## How To Use This Document After Context Reset
1. Execute phases in order.
2. Do not skip Phase 0/1/2; they remove current launch blockers.
3. At the start of each new session, paste only the relevant phase section.
4. After each phase, update this file with:
   - `Status: done/in-progress/blocked`
   - PR/commit reference
   - test/build output summary
   - any deviations

---

## Executive Summary
The product has strong core value (layout designer + heatmap + item-level slotting + labor analytics), but there are high-risk launch blockers in billing/webhook handling, migration drift, incomplete operational flows, and data integrity protections.

### Primary Launch Blockers
1. Stripe webhook wiring/signature handling risk.
2. Missing billing success route.
3. Migration drift / missing migration file for multi-layout support.
4. Billing columns referenced in code but absent in committed SQL migrations.
5. Secrets in committed env templates.
6. Non-transactional bulk writes in picks upload/generation.

---

## Findings (Severity Ordered)

## Critical

### C1. Stripe webhook routing/body handling is brittle and likely to fail in production
- Evidence:
  - `backend/server.js:13` mounts `app.use('/api/stripe/webhook', require('./routes/stripe'));`
  - `backend/server.js:47` enables `express.json` globally
  - `backend/server.js:66` mounts `app.use('/api/stripe', require('./routes/stripe'));`
  - `backend/routes/stripe.js:109` expects `express.raw` for `/webhook`
- Risk:
  - duplicate route mounting and middleware ordering can break signature verification and cause missed subscription updates.
- Fix strategy:
  - isolate webhook into dedicated router/file mounted once before `express.json`.
  - mount normal Stripe authenticated routes separately.
  - add webhook replay-safe idempotency logging.
- Acceptance criteria:
  - Stripe CLI webhook test passes with valid signature.
  - No duplicate handler invocation.

### C2. Checkout success URL points to missing frontend route
- Evidence:
  - `backend/routes/stripe.js:69` uses `/billing/success?session_id=...`
  - `frontend/app/billing/success/page.tsx` does not exist.
- Risk:
  - successful checkout lands on 404, poor conversion and support load.
- Fix strategy:
  - implement `/billing/success` page and optional verification call.
  - show definitive state and route user back to app.
- Acceptance criteria:
  - post-checkout redirect resolves and shows confirmed status.

### C3. Migration drift + missing migration file can break new deploys
- Evidence:
  - `backend/scripts/migrate.sql:50` still enforces `UNIQUE(user_id)` on `layouts`.
  - `backend/run_migration.js:13` references missing `db/migrations/003_allow_multiple_layouts.sql`.
  - `backend/db/migrations` contains only `004` to `008`.
- Risk:
  - new environments may enforce single-layout behavior unexpectedly.
- Fix strategy:
  - create canonical migration chain (`001...` onward) and remove orphan runner assumptions.
  - ensure base schema reflects current intended behavior (multi-layout).
- Acceptance criteria:
  - fresh database bootstrap supports multiple layouts per user.

### C4. Billing-related columns used in code are not represented in committed DB migration set
- Evidence:
  - code expects columns in `user_preferences`:
    - `subscription_tier`, `subscription_status`, `stripe_customer_id`, `stripe_subscription_id`
    - refs: `backend/routes/stripe.js:33`, `backend/routes/stripe.js:50`, `backend/routes/stripe.js:93`
  - schema file only includes basic prefs:
    - `backend/scripts/migrate.sql:139`
- Risk:
  - runtime SQL errors on fresh/clean environments.
- Fix strategy:
  - add migration for missing columns + defaults + indexes.
  - backfill existing rows safely.
- Acceptance criteria:
  - no column-not-found SQL errors in billing endpoints.

### C5. Sensitive credentials are committed in production template files
- Evidence:
  - `backend/env.production.template:16`, `backend/env.production.template:24`
  - `frontend/env.production.template:9`, `frontend/env.production.template:14`
- Risk:
  - credential leakage / compromised systems.
- Fix strategy:
  - rotate all exposed credentials immediately.
  - replace with placeholders only.
  - add secret scanning gate in CI.
- Acceptance criteria:
  - rotated keys active, no real secrets in repo.

## High

### H1. Pick upload/generation pipelines are not transactional
- Evidence:
  - multi-step upserts/inserts without transaction boundaries:
    - `backend/routes/picks.js:264`, `backend/routes/picks.js:324`
    - generation path clears and reinserts data at `backend/routes/picks.js:961`
- Risk:
  - partial writes on failure; inconsistent items/locations/picks.
- Fix strategy:
  - wrap each upload/generate operation in explicit DB transaction.
  - rollback on any failure.
- Acceptance criteria:
  - forced mid-operation failure leaves DB unchanged.

### H2. Date-based delete endpoints only remove legacy picks, not item-level picks
- Evidence:
  - `backend/routes/picks.js:804` and `backend/routes/picks.js:845` delete from `pick_transactions` only.
- Risk:
  - UI says data deleted, but item-level data remains and analytics still show activity.
- Fix strategy:
  - mirror deletes into `item_pick_transactions`.
  - return split row counts per table.
- Acceptance criteria:
  - date delete removes both legacy + item-level picks.

### H3. Element limit enforcement queries only one layout per user
- Evidence:
  - `backend/middleware/limits.js:23` selects single layout by user.
  - then counts elements only on that layout at `backend/middleware/limits.js:36`.
- Risk:
  - incorrect plan enforcement across multi-layout users.
- Fix strategy:
  - enforce limit based on policy decision:
    - per-layout cap, or
    - per-account total cap.
  - implement accordingly and reflect in messaging.
- Acceptance criteria:
  - deterministic enforcement aligned with product policy.

### H4. Stripe `priceId` is trusted from client input
- Evidence:
  - `backend/routes/stripe.js:12`, `backend/routes/stripe.js:64`
- Risk:
  - user can submit arbitrary active price IDs.
- Fix strategy:
  - server whitelist by plan key (e.g., `pro_monthly`) -> env-backed price ID mapping.
- Acceptance criteria:
  - unknown `priceId` rejected server-side.

### H5. Labor API contract mismatches between frontend and backend
- Evidence:
  - frontend expects arrays:
    - `frontend/lib/laborApi.ts:377`, `frontend/lib/laborApi.ts:426`, `frontend/lib/laborApi.ts:460`
  - backend returns paginated objects:
    - `backend/routes/labor.js:639`, `backend/routes/labor.js:847`, `backend/routes/labor.js:1113`
- Risk:
  - silent data-shape bugs and fragile UI logic.
- Fix strategy:
  - normalize API contracts and typings (pick one shape).
  - update consumers and tests.
- Acceptance criteria:
  - runtime type-safe parsing; no shape assumptions.

### H6. ROI CSV export endpoint is explicitly incomplete
- Evidence:
  - `backend/routes/labor.js:1202` TODO comment.
- Risk:
  - broken/incomplete premium workflow.
- Fix strategy:
  - include recommendation rows and full ROI detail in export.
- Acceptance criteria:
  - export contains summary + recommendations + assumptions.

### H7. Admin page has no authorization model yet
- Evidence:
  - `frontend/app/admin/page.tsx:13` only checks for session existence.
- Risk:
  - any authenticated user can open admin page.
- Fix strategy:
  - add role claim check (JWT/app profile role) and server-side enforcement for admin APIs.
- Acceptance criteria:
  - non-admin users denied with clear UX.

## Medium

### M1. Missing legal pages referenced on landing page
- Evidence:
  - links exist at `frontend/app/landing/page.tsx:144`, `frontend/app/landing/page.tsx:147`, `frontend/components/waitlist/WaitlistForm.tsx:248`
  - pages absent: `frontend/app/privacy/page.tsx`, `frontend/app/terms/page.tsx`.
- Risk:
  - compliance trust gap pre-launch.

### M2. Root metadata still default
- Evidence:
  - `frontend/app/layout.tsx:18`, `frontend/app/layout.tsx:19`.
- Risk:
  - poor SEO/social previews.

### M3. Waitlist copy/date stale
- Evidence:
  - `frontend/components/waitlist/HeroSection.tsx:40` says “Launching Q1 2025”.
- Risk:
  - credibility hit.

### M4. Excess debug logging in production path
- Evidence:
  - heavy logs in `frontend/lib/dashboardUtils.ts:1498` onward.
- Risk:
  - noisy console, potential sensitivity, perf clutter.

### M5. Duplicate auth token strategies
- Evidence:
  - mix of `supabase.auth.getSession()` and manual `localStorage` token reads across app.
- Risk:
  - inconsistent auth state handling in edge cases.

---

## Build/Test Snapshot (from audit run)
- `frontend` lint currently fails with many TypeScript/ESLint issues.
- `frontend` build failed in this environment with `spawn EPERM` (environment restriction).
- `backend` JS syntax check passed with `node --check`.

---

## Phase Plan (Execute In Order)

Status legend: `pending | in-progress | blocked | done`

## Phase 0: Secrets and Environment Baseline
Status: `pending`

### Goals
- remove exposed credentials from repo templates
- define production env contract cleanly

### Tasks
- rotate all exposed DB/Supabase/Stripe keys immediately.
- update:
  - `backend/env.production.template`
  - `frontend/env.production.template`
  with placeholders only.
- create `.env.example` for backend/frontend with strict required vars.
- add startup validation for required env vars in backend.

### Validation
- app refuses startup with missing critical vars (clear error).
- no real credential-like strings in git history moving forward.

---

## Phase 1: Stripe and Billing Reliability
Status: `pending`

### Goals
- make billing flow deterministic and safe

### Tasks
- split Stripe routing:
  - dedicated webhook route mounted once before JSON parser.
  - authenticated Stripe user routes mounted separately.
- whitelist price IDs on server by plan key.
- implement `frontend/app/billing/success/page.tsx`.
- add subscription management endpoint placeholder (portal) or hide UI until implemented.
- ensure idempotent webhook handling by event id.

### Validation
- Stripe CLI `checkout.session.completed` updates DB exactly once.
- redirect lands on billing success page.
- invalid price IDs rejected.

---

## Phase 2: Database Migration Canonicalization
Status: `pending`

### Goals
- eliminate schema drift and fresh-deploy failures

### Tasks
- create canonical migration sequence including:
  - multi-layout support
  - user_preferences billing columns
  - any missing indexes/constraints used by code
- retire or fix `backend/run_migration.js` missing-file reference.
- document migration order and rollback steps.

### Validation
- from empty DB: run full migrations -> app boots and core flows work.
- no runtime “column does not exist” errors.

---

## Phase 3: Data Integrity Hardening (Picks Pipeline)
Status: `pending`

### Goals
- prevent partial writes and inconsistent analytics

### Tasks
- wrap upload and generate flows in DB transactions in `backend/routes/picks.js`.
- update date-delete endpoints to include both:
  - `pick_transactions`
  - `item_pick_transactions`
- return explicit counts by table in responses.

### Validation
- simulated failure during bulk import rolls back fully.
- delete-by-date removes all pick sources.

---

## Phase 4: Plan Enforcement and Access Control
Status: `pending`

### Goals
- correct subscription limit logic and secure admin access

### Tasks
- rework `checkElementLimit` policy scope (per-layout vs per-account).
- enforce layout creation limits from `tiers`.
- add admin role checks in frontend + backend (when admin APIs exist).

### Validation
- free/pro/enterprise limits behave exactly as product policy.
- non-admin users blocked from admin-only paths.

---

## Phase 5: API Contract Consistency + Type Safety
Status: `pending`

### Goals
- eliminate frontend/backend shape mismatches

### Tasks
- standardize labor history endpoints response shape.
- update `frontend/lib/laborApi.ts` return types and consumers.
- remove high-risk `any` usages in business-critical paths.

### Validation
- labor page renders with correct typed data across empty and populated states.
- no runtime parse/shape errors.

---

## Phase 6: Launch Completeness and Compliance
Status: `pending`

### Goals
- close obvious trust/compliance gaps

### Tasks
- create `frontend/app/privacy/page.tsx` and `frontend/app/terms/page.tsx`.
- update root metadata/title/description.
- refresh stale launch copy and dates.
- complete ROI CSV recommendation export.

### Validation
- no broken footer/legal/billing links.
- metadata reflects product.

---

## Phase 7: Quality Gate and Release Candidate
Status: `pending`

### Goals
- enforce reproducible release readiness

### Tasks
- fix lint errors or adjust lint policy intentionally.
- resolve build env `EPERM` issue in CI/release environment and confirm green build.
- add minimum automated tests:
  - webhook route
  - picks upload transaction rollback
  - labor history response contract
  - auth-protected route behavior
- create deployment checklist and rollback playbook.

### Validation
- `frontend` build succeeds in release environment.
- smoke tests pass end-to-end.

---

## Detailed Execution Checklist (Operator-Friendly)

## Pre-Deploy Checklist
- [ ] Credentials rotated and templates sanitized.
- [ ] Migrations audited and versioned.
- [ ] Stripe webhook endpoint configured in Stripe Dashboard.
- [ ] `FRONTEND_URL`, `API_URL`, `CORS_ORIGIN` aligned.
- [ ] Health endpoint checked: `GET /api/health`.
- [ ] Billing success and cancel routes verified manually.

## Deploy Checklist
- [ ] run migrations
- [ ] deploy backend
- [ ] deploy frontend
- [ ] run smoke tests:
  - auth login
  - create layout
  - create elements
  - upload picks
  - dashboard metrics load
  - heatmap + reslot HUD load
  - labor tab load
  - pricing checkout session creation

## Post-Deploy Checklist
- [ ] monitor server logs for SQL/billing errors
- [ ] verify webhook events flowing
- [ ] verify no 404 on legal/billing routes
- [ ] validate plan limits with test users

---

## Rollback Strategy

## Backend rollback
- keep previous backend release artifact/image available.
- if migration is non-breaking additive, rollback app only.
- if migration is breaking, run tested down-migration or restore DB snapshot.

## Frontend rollback
- redeploy previous stable frontend build.
- clear CDN cache if route-level issues.

## Billing rollback
- if webhook failure occurs:
  - disable checkout CTA temporarily
  - process affected users manually from Stripe events
  - replay events after fix

---

## Moat Opportunities (Post-Stabilization)
These are not launch blockers, but strong defensibility investments.

1. Closed-loop execution:
   - create move tasks from recommendations
   - confirm task completion via scan/workflow
   - show realized vs predicted savings over time
2. WMS integrations:
   - ingest live slotting + demand feeds
   - export approved move plans back to WMS
3. Scenario engine:
   - labor constraints, seasonality, service-level targets
   - compare multiple slotting strategies with confidence ranges
4. Benchmark intelligence:
   - anonymized percentile benchmarks across similar warehouse profiles
5. Continuous optimization:
   - automated weekly drift detection and prioritized move packs

---

## Notes For Future Codex Sessions (Self-Notes)

1. Start with Phase 0-2 before feature work; there are hard launch blockers.
2. Do not trust current migration story; verify schema from scratch.
3. Be careful with Stripe route wiring in `backend/server.js` to avoid duplicate mounts.
4. Use DB transactions in bulk data routes (`picks.js`) before any performance tuning.
5. Keep frontend/backend contracts strict; avoid `any` in cross-layer payloads.
6. Watch out for environment-specific build limits (`EPERM spawn`) when validating `next build`.
7. Preserve existing user changes; avoid unrelated refactors while stabilizing.
8. When fixing limits, confirm product decision: per-layout vs per-account element cap.
9. Add tests around the exact bug classes found here; they are regression-prone.

---

## Suggested Session Prompts (for phased follow-up)
Use one per new context-cleared session:

- `Phase 0`: "Implement Phase 0 from deployment_steps.md completely."
- `Phase 1`: "Implement Phase 1 from deployment_steps.md with tests."
- `Phase 2`: "Canonicalize migrations per Phase 2 in deployment_steps.md."
- `Phase 3`: "Make picks upload/generate transactional per Phase 3."
- `Phase 4`: "Fix plan enforcement and admin authorization per Phase 4."
- `Phase 5`: "Normalize labor API contracts and frontend typings per Phase 5."
- `Phase 6`: "Complete launch-completeness items per Phase 6."
- `Phase 7`: "Run final quality gate and produce release checklist artifacts."

---

## Current File Status
- `deployment_steps.md`: created
- next action: begin Phase 0

