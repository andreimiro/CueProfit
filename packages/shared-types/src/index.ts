// Shared types used across the web app and any TS tooling.
//
// The Supabase row types should be generated from the live schema and committed
// here, e.g.:
//   supabase gen types typescript --project-id <ref> > packages/shared-types/src/database.ts
// then re-export: `export type { Database } from "./database";`

export type {
  Database,
  Tables,
  TablesInsert,
  TablesUpdate,
  Enums,
} from "./database";

export type EntityType = "account" | "campaign" | "ad_group" | "product" | "category";

export type RecommendationKind =
  | "scale"
  | "keep"
  | "watch"
  | "fix"
  | "reduce"
  | "exclude"
  | "pause"
  | "needs_more_data"
  | "good_roas_bad_profit"
  | "wasted_spend"
  | "tracking_issue"
  | "feed_issue"
  | "low_margin_pmax";

export type ConfidenceLevel = "low" | "medium" | "high";
