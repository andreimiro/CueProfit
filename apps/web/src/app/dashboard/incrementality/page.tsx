import { MeasurementPage } from "@/components/app/measurement-page";

export default function IncrementalityPage() {
  return (
    <MeasurementPage
      title="Incrementality Test"
      subtitle="Measure whether a campaign creates profit that would not have happened anyway."
      eyebrow="Lift testing"
      icon="spark"
      metrics={[
        {
          label: "Incremental lift",
          value: "+12.4%",
          hint: "Modeled test-group profit above control.",
          tone: "profit",
        },
        {
          label: "Confidence",
          value: "89%",
          hint: "Current certainty based on variance and sample size.",
          tone: "amber",
        },
        {
          label: "Holdout share",
          value: "15%",
          hint: "Traffic, geo or audience kept as control.",
        },
        {
          label: "Payback",
          value: "9d",
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
    />
  );
}
