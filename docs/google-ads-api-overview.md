# Google Ads API Overview for CueProfit

Last researched: 2026-05-30

## Executive summary

The Google Ads API is the right integration layer for CueProfit because it is designed for programmatic management of Google Ads accounts and campaigns, especially where an app needs automated account management, custom reporting, inventory-driven ad management, or Smart Bidding strategy management. Google describes it as suitable for developers building their own software and managing their own infrastructure.

For CueProfit, the API should be treated as both:

- A reporting source for campaign, product, conversion, budget, asset, search term, recommendation, and change-history data.
- A controlled action layer for applying user-approved optimizations such as budget changes, status changes, recommendation dismissals/applies, conversion uploads, and campaign structure edits.

The current repo already points in the right direction: `packages/google-clients` wraps `GoogleAdsService.SearchStream`, defines GAQL query catalogs, and maps Google Ads rows into typed Python records. The next step is to broaden that package from read-only reporting into a versioned Ads integration layer with explicit sync jobs, action services, quota control, audit logs, and user-facing approval flows.

## Official sources used

- Google Ads API introduction: https://developers.google.com/google-ads/api/docs/get-started/introduction
- OAuth overview: https://developers.google.com/google-ads/api/docs/oauth/overview
- GAQL overview: https://developers.google.com/google-ads/api/docs/query/overview
- Mutating resources: https://developers.google.com/google-ads/api/docs/mutating/overview
- Optimization score and recommendations: https://developers.google.com/google-ads/api/docs/recommendations
- API limits and quotas: https://developers.google.com/google-ads/api/docs/best-practices/quotas
- Access levels and RMF: https://developers.google.com/google-ads/api/docs/productionize/access-levels

## What the Google Ads API is

The API exposes Google Ads account resources through versioned services. It can retrieve data, mutate supported resources, upload conversions, inspect account structure, and retrieve or act on Google-generated recommendations.

Typical resource areas:

- Accounts and manager-account hierarchy
- Customers, campaigns, ad groups, ads, assets, criteria, labels, budgets, bidding strategies
- Performance reports through resources, metrics, and segments
- Shopping and Performance Max retail reporting
- Conversion actions, goals, uploads, and adjustment uploads
- Recommendations and optimization score
- Change events and change status
- Keyword planning, audience insights, reach forecasting, and bid simulations
- Billing and account budgets, with tighter per-request constraints

## Authentication and access model

Google Ads API access requires two separate things:

- OAuth 2.0 authorization so CueProfit can access a user's Google Ads account without handling the user's Google login credentials.
- A Google Ads developer token, which is required in addition to OAuth credentials for API calls.

For CueProfit's multi-tenant SaaS model, the relevant OAuth pattern is multi-user authentication: each customer connects their own Google Ads account and authorizes CueProfit to access it. The app should store refresh tokens encrypted, associate them with the workspace/tenant connection, and use the selected Google Ads customer ID when making calls.

Important implementation details:

- Use the `https://www.googleapis.com/auth/adwords` OAuth scope.
- Store refresh tokens through the existing encrypted connection model, not in frontend state.
- Support `login_customer_id` for manager-account access. This is already present in `GoogleAdsClient.__init__`.
- Let users select from accessible customer accounts after OAuth, then persist the selected customer IDs.
- Track token health, last successful sync, consent revocation, and API errors per connection.
- Plan for OAuth app verification because the `adwords` scope is sensitive.

## Developer token access levels

Developer tokens have access levels and are subject to Google's review process.

- Explorer access is useful for early development but has low production quota.
- Basic access is a practical starting point for a production app with limited usage.
- Standard access is needed as volume grows, but may trigger Required Minimum Functionality requirements.

Google notes that access-level reviews can take days or weeks, so CueProfit should apply for the needed level before launch traffic requires it.

## Reporting with GAQL

Google Ads Query Language, or GAQL, is the main reporting/query layer. It lets the app select:

- Resource attributes, such as `campaign.id`, `campaign.name`, and `campaign.status`
- Metrics, such as `metrics.impressions`, `metrics.clicks`, `metrics.cost_micros`, and `metrics.conversions_value`
- Segments, such as `segments.date`, `segments.device`, and `segments.product_item_id`
- Related resource attributes where the selected resource supports them

Queries are executed through `GoogleAdsService.Search` or `GoogleAdsService.SearchStream`. For sync jobs, CueProfit should prefer `SearchStream` because one `SearchStream` request counts as one API operation regardless of the number of returned batches, and it is better for large report pulls.

The current repo already implements this pattern:

- `packages/google-clients/src/google_clients/ads_client.py` wraps `GoogleAdsService.SearchStream`.
- `packages/google-clients/src/google_clients/gaql.py` defines campaign, shopping product, and conversion action query catalogs.
- `packages/google-clients/src/google_clients/mappers.py` converts `GoogleAdsRow` values into typed stat records and handles money micros.

## High-value reports for CueProfit

### Already represented in the codebase

Campaign daily report:

- Use `campaign` as the main resource.
- Pull customer ID, currency, campaign ID/name/type/status, bidding strategy, budget amount, date, impressions, clicks, cost, conversions, and conversion value.
- Supports dashboard metrics, profit calculations, waste detection, campaign pacing, and budget diagnostics.

Product daily report:

- Use `shopping_performance_view`.
- Pull `segments.product_item_id` with spend/conversion metrics by date and campaign.
- Supports SKU-level profitability once joined to Merchant Center catalog and product cost data.

Conversion actions:

- Use `conversion_action`.
- Pull action ID, name, category, type, status, and primary-for-goal.
- Supports tracking-quality checks and lets CueProfit explain which conversion signals are powering optimization.

### Recommended next reports

Account/customer snapshot:

- Customer descriptive name, currency, time zone, status, optimization score, manager hierarchy.
- Use it for connection setup, account selector UI, and account-level health.

Campaign budget and pacing:

- Campaign budget amount, delivery method, campaign status, serving status, budget-limited signals where available.
- Use it to detect overspend, underspend, and campaigns constrained by budget.

Search term and keyword reports:

- Search terms, keywords, match types, campaign/ad group IDs, clicks, cost, conversions, conversion value.
- Use it for wasted spend, negative keyword recommendations, query mining, and intent analysis.

Asset and Performance Max reports:

- Asset group performance, asset performance labels, product group/listing group filters, campaign criterion reporting.
- Use it for Performance Max explainability and product/category-level diagnostics.

Device, network, geo, and hour/day segmentation:

- Add segments such as device, ad network type, geographic view, hour, and day of week.
- Use it for efficiency insights and suggested bid/budget allocation.

Change history:

- Use change event/status resources to identify whether performance shifts came from user edits, automated changes, or external account activity.
- Use it for audit trails and "what changed?" explanations.

## Mutations and write capabilities

The API supports mutations through resource-specific services, such as `CampaignService.MutateCampaigns` for campaign changes. In general, cross-account mutation is not permitted unless the account is the manager of the client that created the object.

Potential CueProfit write actions:

- Pause or enable campaigns, ad groups, ads, keywords, or criteria.
- Adjust campaign budgets.
- Create or update negative keywords and shared negative keyword sets.
- Apply labels to campaigns, ad groups, products, or criteria for workflow tracking.
- Update bidding settings where supported and appropriate.
- Apply or dismiss Google Ads recommendations.
- Upload offline conversions or conversion adjustments.
- Create experiments or drafts for safer optimization workflows.
- Create or edit Performance Max retail listing group filters, subject to API support and product strategy.

Recommended product pattern:

- Start read-only by default.
- Add "approve action" flows before any mutate call.
- Store every proposed action, user approval, API request ID, before/after values, and result.
- Prefer reversible or low-risk writes first: labels, recommendation dismissals, negative keyword drafts, and budget suggestions.
- Gate higher-risk writes such as budget updates, campaign pauses, and bidding changes behind explicit permissions.

## Recommendations and optimization score

Google Ads exposes optimization score at customer and campaign levels and provides recommendations through `RecommendationService`. Recommendations can be retrieved, applied, or dismissed. Some recommendation types can also be automatically applied through `RecommendationSubscriptionService`.

CueProfit should use Google recommendations as an input, not as the final decision. The profit engine can re-rank or reject recommendations based on gross margin, product cost, return rate, stock status, blended CAC, and customer business rules.

Useful CueProfit features:

- Display Google recommendations alongside projected profit impact.
- Detect recommendations that improve ROAS but may reduce profit.
- Add a "profit-aware recommendation queue."
- Apply only user-approved recommendations.
- Dismiss recommendations when CueProfit has a clear reason, such as margin-negative products.
- Track optimization score uplift separately from profit impact.

## Conversion and value management

Conversion data is central to CueProfit because Google Ads often optimizes toward conversion value rather than actual profit.

Useful capabilities:

- Read conversion actions and primary goal status.
- Detect missing, inactive, duplicate, or low-quality conversion actions.
- Compare Google conversion value with CueProfit revenue/profit data.
- Upload offline conversions where customers have server-side or CRM conversion data.
- Upload conversion adjustments when orders are refunded, canceled, partially returned, or corrected.
- Use custom conversion variables where needed for richer downstream analysis.

Implementation caution:

- Conversion upload services have specific limits, such as 2,000 call or click conversions per request.
- Uploads should be idempotent, batched, retried carefully, and tied to source order/event IDs.

## Quotas, limits, and operational constraints

Important published limits:

- Explorer access: 2,880 API operations per day against production accounts and 15,000 per day against test accounts.
- Basic access: 15,000 API operations per day against test and production accounts.
- Mutate requests: maximum 10,000 mutate operations per request.
- Action operations: maximum 100 action operations per request.
- Conversion upload: 2,000 conversions per request.
- Conversion adjustment upload: 2,000 adjustments per request.
- Google client libraries use gRPC and set a 64 MB max response message size; reduce selected fields, stream results, or split requests if responses are too large.

Operational guidance for CueProfit:

- Centralize quota accounting per developer token and per customer account.
- Use `SearchStream` for report syncs.
- Keep GAQL field lists narrow.
- Split historical backfills by date range, account, and report type.
- Cache metadata such as conversion actions, account hierarchy, and field compatibility.
- Add exponential backoff for retryable errors and clear handling for `RESOURCE_EXHAUSTED`.
- Avoid using API calls from interactive dashboard views when synced warehouse tables can serve the UI.

## Suggested CueProfit architecture

### Connection setup

1. User clicks "Connect Google Ads" in the web app.
2. Next.js route starts OAuth with the `adwords` scope.
3. Callback exchanges the code for tokens.
4. API encrypts and stores refresh token in the existing connections table.
5. Worker/API lists accessible Google Ads accounts.
6. User selects account/customer IDs to sync.
7. Initial sync job is queued.

### Sync pipeline

1. Scheduler triggers account sync jobs.
2. Worker loads encrypted token and customer selection.
3. Worker runs GAQL queries through `packages/google-clients`.
4. Raw rows are normalized into staging tables.
5. Mappers convert micros and metrics into typed internal records.
6. Product identity resolver joins Ads product IDs to Merchant Center products and cost data.
7. Profit engine computes contribution margin, wasted spend, profit deltas, and recommendations.
8. Dashboard reads from Supabase tables, not directly from Google Ads.

### Action pipeline

1. Profit engine or AI tool-runner proposes an action.
2. App displays reason, expected impact, risk, and exact API change.
3. User approves.
4. API writes an action record with idempotency key.
5. Worker executes mutate/recommendation/conversion upload call.
6. Result, Google request ID, errors, and before/after state are stored.
7. Follow-up sync verifies the account state changed as expected.

## Webapp feature opportunities

### Dashboard and diagnostics

- Profit by campaign, product, channel type, and date.
- Spend waste by product, query, device, geo, or campaign.
- Tracking health: conversion actions, primary goals, inactive conversions, suspicious value gaps.
- Budget pacing: constrained winners, margin-negative spenders, overspending losers.
- Change timeline: explain performance moves with Google Ads change history.
- Performance Max visibility: product, asset group, and listing group reporting.

### AI and recommendations

- Profit-aware Google recommendations queue.
- "Why did profit drop?" account diagnostics.
- Suggested negative keywords based on low-margin or non-converting queries.
- Suggested budget shifts from low-profit campaigns/products to high-profit ones.
- Feed/tracking issue explanations that combine Ads data with Merchant Center data.
- Natural-language reports grounded in synced metrics.

### Automation

- Daily sync and alert jobs.
- Budget guardrails.
- Margin-aware pause suggestions.
- Conversion adjustment uploads for refunds/returns.
- Scheduled recommendation reviews.
- Account anomaly monitoring.

### User-controlled write actions

- Apply labels for workflow state.
- Draft negative keyword additions.
- Pause low-profit products/campaigns after approval.
- Adjust campaign budgets after approval.
- Apply or dismiss Google recommendations after profit review.
- Upload offline conversions or conversion adjustments.

## Data model implications

CueProfit should store:

- Google Ads connection and OAuth metadata.
- Accessible manager/customer hierarchy.
- Selected customer accounts.
- Campaign, ad group, ad, asset, budget, bidding, criterion, and conversion action dimensions.
- Daily fact tables for campaign, product, search term, asset, device, geo, and conversion metrics.
- Sync cursors per account/report/date range.
- Raw API request/response metadata for observability.
- Proposed actions, approvals, execution results, and audit logs.
- Recommendation snapshots and decisions.

Avoid storing only the transformed dashboard aggregates. The app needs enough dimensional history to explain changes, reconstruct profit calculations, and safely verify write actions.

## Security and compliance notes

- Encrypt refresh tokens and any customer secrets.
- Never expose developer token or refresh tokens to the browser.
- Use tenant isolation and RLS for all account-linked data.
- Request the minimum OAuth scopes needed; for Google Ads this generally means the `adwords` scope.
- Keep a user-visible disconnect/revoke flow.
- Log Google request IDs for support, but avoid logging access tokens or PII.
- Prepare for Google's OAuth app verification and Google Ads API review process.
- Review Required Minimum Functionality before applying for Standard access.

## Implementation roadmap

### Phase 1: Read-only foundation

- Finalize OAuth connection flow and encrypted refresh-token storage.
- List accessible accounts and persist selected customer IDs.
- Pin and document the `google-ads` client library/API version.
- Expand `packages/google-clients` query catalog for account, campaign, product, conversion action, and recommendation snapshots.
- Add worker jobs for incremental daily sync and historical backfill.
- Add quota-aware batching and retry handling.

### Phase 2: Profit intelligence

- Join Ads product IDs to Merchant Center/catalog data.
- Compute campaign and SKU contribution profit.
- Add wasted spend, budget pacing, conversion tracking, and product profitability dashboards.
- Add recommendation snapshots and profit-aware ranking.
- Add change-history sync for explanations.

### Phase 3: Controlled actions

- Introduce action proposal and approval tables.
- Implement labels and recommendation dismiss/apply as first low-risk writes.
- Add negative keyword and budget-change actions behind user approval.
- Store Google request IDs, before/after values, and execution status.
- Add post-action verification syncs.

### Phase 4: Advanced automation

- Upload offline conversions and conversion adjustments.
- Add alerting/monitoring for margin-negative spend and tracking failures.
- Add experiments/drafts where supported.
- Add customer-level automation rules with strict guardrails.

## Open questions for product and engineering

- Will CueProfit launch read-only first, or include user-approved write actions in the first paid version?
- Will we operate through the customer's connected account only, or also support an MCC model where CueProfit manages accounts under a manager account?
- Which ecommerce platforms provide order, refund, margin, and COGS data?
- Do we want to upload profit-adjusted conversion values back to Google Ads, or only report profit in CueProfit?
- What level of automation should be allowed without explicit per-action approval?
- Which Google Ads API access level is realistic for launch volume?

## Immediate next engineering tasks

- Confirm OAuth app, developer token status, and access level.
- Add a `google-ads` API version note to `packages/google-clients`.
- Implement accessible account listing after OAuth.
- Add sync tables and jobs for campaign/product/conversion/recommendation reports.
- Add structured error handling around Google Ads API failures.
- Add a quota manager before running large historical backfills.
