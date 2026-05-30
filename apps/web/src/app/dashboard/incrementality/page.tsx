import { MeasurementPage } from "@/components/app/measurement-page";
import { Panel, PanelHeader, StatusTag } from "@/components/app/cards";
import { formatMoney } from "@/lib/dashboard";
import { loadDashboardWorkspace } from "@/lib/dashboard-workspace";
import {
  loadIncrementalityData,
  metricValue,
  num,
  pct,
  periodLabel,
} from "@/lib/measurement";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function decisionStatus(decision: string | null): "Scale" | "Hold" | "Cap" | "Pause" {
  if (decision === "scale") return "Scale";
  if (decision === "stop") return "Pause";
  if (decision === "hold") return "Hold";
  return "Cap";
}

export default async function IncrementalityPage() {
  const { workspaceId, currency } = await loadDashboardWorkspace();
  const supabase = await createClient();
  const data = await loadIncrementalityData(supabase, workspaceId);
  const run = data.run;
  const latest = data.rows[0];
  const lift = metricValue(run, "lift_pct") ?? latest?.lift_pct;
  const confidence = metricValue(run, "confidence_pct") ?? latest?.confidence_pct;
  const holdout = metricValue(run, "holdout_share") ?? latest?.holdout_share;
  const payback = metricValue(run, "payback_days") ?? latest?.payback_days;

  return (
    <MeasurementPage
      title="Incrementality Test"
      subtitle="Measure whether a campaign creates profit that would not have happened anyway."
      eyebrow="Lift testing"
      icon="spark"
      status={{
        label: data.error ? "Schema missing" : latest || run?.status === "ready" ? "Ready" : "Needs test",
        detail: data.error
          ? `The incrementality tables are not queryable yet: ${data.error}`
          : run
            ? `Latest incrementality run covers ${periodLabel(run)}.`
            : "Create a test/control definition and collect enough pre/post profit data before lift can be calculated.",
        tone: data.error ? "error" : latest || run?.status === "ready" ? "ready" : "pending",
      }}
      metrics={[
        {
          label: "Incremental lift",
          value: lift == null ? "—" : `+${pct(lift, 1)}`,
          hint: "Modeled test-group profit above control.",
          tone: "profit",
        },
        {
          label: "Confidence",
          value: confidence == null ? "—" : pct(confidence),
          hint: "Current certainty based on variance and sample size.",
          tone: "amber",
        },
        {
          label: "Holdout share",
          value: holdout == null ? "—" : pct(holdout),
          hint: "Traffic, geo or audience kept as control.",
        },
        {
          label: "Payback",
          value: payback == null ? "—" : `${Math.round(num(payback))}d`,
          hint: "Estimated time to recover test spend.",
          tone: "profit",
        },
      ]}
      requirements={[
        {
          title: "Google Ads data",
          items: [
            "Campaign, ad group, product or geo-level spend before, during and after the test",
            "Impressions, clicks, conversions, conversion value and cost",
            "Geo, device, network or audience segments for test/control design",
            "Campaign budgets, status and serving changes during the test",
            "Search impression share and lost impression share where available",
            "Google Ads experiment, draft or change-history data when used",
          ],
        },
        {
          title: "Experiment data",
          items: [
            "Test and control group definition with start and end dates",
            "Orders, revenue, gross profit and net profit for both groups",
            "Baseline history for the same geos, audiences or products",
            "Guardrail metrics such as CAC, AOV, refund rate and stock availability",
            "External changes during the test, including promos and price changes",
            "Decision thresholds for minimum lift, confidence and profit impact",
          ],
        },
      ]}
      outputs={[
        {
          title: "Lift result",
          description: "Show incremental revenue, incremental profit and confidence interval for the test.",
          icon: "trendUp",
        },
        {
          title: "Test health",
          description: "Display sample size, variance, contamination risks and whether the test is mature.",
          icon: "alert",
        },
        {
          title: "Control comparison",
          description: "Compare test and control performance before, during and after the experiment window.",
          icon: "overview",
        },
        {
          title: "Decision recommendation",
          description: "Recommend scale, hold or stop based on incremental profit, not attributed ROAS.",
          icon: "recommendations",
        },
      ]}
      timeline={[
        {
          label: "Design test",
          value: "Setup",
          detail: "Choose geo, audience, product or campaign split and define success thresholds before launch.",
        },
        {
          label: "Monitor exposure",
          value: "Live",
          detail: "Track spend, impressions and contamination between test and control groups.",
        },
        {
          label: "Estimate lift",
          value: "Stats",
          detail: "Compare actual profit to the control-adjusted counterfactual during the test window.",
        },
        {
          label: "Decide",
          value: "Action",
          detail: "Turn the result into a budget, pause or scale recommendation with expected profit impact.",
        },
      ]}
    >
      <Panel>
        <PanelHeader
          title="Tests"
          hint={data.rows.length ? "Latest lift tests and decisions" : "No incrementality tests stored yet"}
        />
        {data.rows.length ? (
          <div className="overflow-x-auto">
            <div className="min-w-[840px] divide-y divide-edge">
              {data.rows.map((row) => (
                <div
                  key={`${row.name}:${row.test_start ?? ""}`}
                  className="grid grid-cols-[1.4fr_0.9fr_0.8fr_0.9fr_0.9fr_0.7fr] items-center gap-4 px-5 py-4 text-sm"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium text-fg">{row.name}</p>
                    <p className="mt-0.5 text-xs text-faint">
                      {row.test_start ?? "—"} to {row.test_end ?? "—"}
                    </p>
                  </div>
                  <p className="text-right font-mono text-profit nums">
                    {formatMoney(num(row.incremental_profit), row.currency ?? currency)}
                  </p>
                  <p className="text-right font-mono text-muted nums">{row.lift_pct == null ? "—" : pct(row.lift_pct, 1)}</p>
                  <p className="text-right font-mono text-muted nums">{row.confidence_pct == null ? "—" : pct(row.confidence_pct)}</p>
                  <p className="text-right font-mono text-muted nums">{row.payback_days == null ? "—" : `${row.payback_days}d`}</p>
                  <div className="flex justify-end">
                    <StatusTag status={decisionStatus(row.decision)} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <p className="px-5 py-8 text-sm leading-6 text-muted">
            This table will show live holdout, geo or campaign experiments once
            `incrementality_tests` contains test definitions and modeled lift results.
          </p>
        )}
      </Panel>
    </MeasurementPage>
  );
}
