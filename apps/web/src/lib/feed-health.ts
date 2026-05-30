// Pure helpers for the Feed health page. Reads the synced Merchant catalog
// (products table) and derives feed problems — approval status + quality checks.

export type CatalogProduct = {
  id: string;
  offer_id: string | null;
  title: string | null;
  gtin: string | null;
  image_url: string | null;
  price: number | string | null;
  availability: string | null;
  status: string | null; // approved | disapproved | pending | null
};

export type FeedSeverity = "critical" | "high" | "medium" | "low";
export type FeedProblem = { label: string; severity: FeedSeverity };
export type FeedIssueRow = {
  id: string;
  offer: string;
  title: string | null;
  problems: FeedProblem[];
  rank: number;
};

export type FeedSummary = {
  total: number;
  approved: number;
  disapproved: number;
  pending: number;
  clean: number;
  issues: FeedIssueRow[]; // products with ≥1 problem, worst first
};

const SEV_RANK: Record<FeedSeverity, number> = { critical: 3, high: 2, medium: 1, low: 0 };

function problemsFor(p: CatalogProduct): FeedProblem[] {
  const out: FeedProblem[] = [];
  if (p.status === "disapproved") out.push({ label: "Disapproved", severity: "critical" });
  else if (p.status === "pending") out.push({ label: "Pending review", severity: "medium" });
  if (!p.image_url) out.push({ label: "Missing image", severity: "high" });
  const title = (p.title ?? "").trim();
  if (!title) out.push({ label: "Missing title", severity: "medium" });
  else if (title.length < 20) out.push({ label: "Short title", severity: "low" });
  if (p.price == null) out.push({ label: "Missing price", severity: "medium" });
  if ((p.availability ?? "").toLowerCase() === "out_of_stock")
    out.push({ label: "Out of stock", severity: "medium" });
  if (!p.gtin) out.push({ label: "No GTIN", severity: "low" });
  return out;
}

export function summarizeFeed(products: CatalogProduct[]): FeedSummary {
  let approved = 0;
  let disapproved = 0;
  let pending = 0;
  let clean = 0;
  const issues: FeedIssueRow[] = [];

  for (const p of products) {
    if (p.status === "approved") approved++;
    else if (p.status === "disapproved") disapproved++;
    else if (p.status === "pending") pending++;

    const problems = problemsFor(p);
    if (problems.length === 0) {
      clean++;
      continue;
    }
    const worst = Math.max(...problems.map((q) => SEV_RANK[q.severity]));
    issues.push({
      id: p.id,
      offer: p.offer_id ?? p.id,
      title: p.title,
      problems,
      rank: worst * 100 + problems.length, // worst severity, then problem count
    });
  }

  issues.sort((a, b) => b.rank - a.rank);
  return { total: products.length, approved, disapproved, pending, clean, issues };
}

export const FEED_SEVERITY_CLASS: Record<FeedSeverity, string> = {
  critical: "border-loss/30 bg-loss/12 text-loss",
  high: "border-loss/30 bg-loss/12 text-loss",
  medium: "border-amber/30 bg-amber/12 text-amber",
  low: "border-edge bg-panel-2 text-faint",
};
