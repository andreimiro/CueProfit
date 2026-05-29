# CueProfit

Google Ads + Merchant Center **profit-intelligence** platform for ecommerce.
Connect Google Ads, Merchant Center, and product-cost data to see true campaign
and product profit, wasted spend, feed/tracking issues, projected incremental
profit, and AI-recommended next actions.

> Positioning: *Stop optimizing for ROAS. Start optimizing for profit.*

## Architecture

| Layer | Tech | Hosting |
| --- | --- | --- |
| Frontend / BFF | Next.js (App Router), TypeScript, Tailwind, shadcn/ui, TanStack Query | **Vercel** |
| API (reads, AI tool-runner) | FastAPI (Python) | **Cloud Run** (service) |
| Workers (sync, matching, profit, modeling) | Python | **Cloud Run Jobs** + Cloud Scheduler |
| Database / Auth / Storage | Postgres + Auth + Storage + RLS | **Supabase** |
| Secrets / token encryption | Secret Manager + Cloud KMS | **GCP** |
| AI gateway | OpenRouter (model-agnostic) | external |
| Billing | Stripe | external |

See the full build plan / gap analysis at
`~/.claude/plans/below-is-the-plan-melodic-ocean.md`.

## Monorepo layout

```
apps/web/                # Next.js app → Vercel
services/api/            # FastAPI service (Cloud Run): reads + AI tool-runner
services/workers/        # Cloud Run Jobs: sync, matching, profit, modeling
packages/profit-engine/  # pure Python profit math + golden tests
packages/google-clients/ # Google Ads + Merchant API wrappers
packages/shared-types/   # shared TS types
supabase/migrations/     # SQL schema + RLS
infra/                   # IaC (Terraform): Cloud Run, Scheduler, Secret Manager, KMS, IAM
.github/workflows/       # CI/CD
```

TypeScript packages are managed with **pnpm** (`pnpm-workspace.yaml`); Python
packages are managed with **uv** (each has its own `pyproject.toml`).

## Prerequisites

- Node ≥ 22, pnpm 10
- Python 3.12+, uv
- Supabase CLI, gcloud SDK
- Docker (for Cloud Run container builds)

## Quick start (local)

```bash
cp .env.example .env            # fill in values
pnpm install                    # JS deps
supabase start                  # local Postgres + Auth (Docker)
supabase db reset               # apply migrations + seed
pnpm py:test                    # run profit-engine golden tests
pnpm web:dev                    # Next.js dev server
pnpm py:api                     # FastAPI dev server
```

## External setup (critical path — see plan §2.1)

These gate **production** data, not local development (you can build against a
Google Ads test account + up to 100 OAuth test users meanwhile):

1. Google Cloud project + billing.
2. Google Ads Manager (MCC) → developer token (apply for Basic, then Standard).
3. OAuth consent screen + app verification for the sensitive `adwords` scope.
4. Merchant API enabled (build against v1).
5. Stripe + OpenRouter accounts.

## Status

🚧 Milestone 0 (foundations) in progress. See the build plan for the full roadmap.
