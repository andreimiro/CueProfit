import { MeasurementPage } from "@/components/app/measurement-page";
import { Panel, PanelHeader } from "@/components/app/cards";
import { formatMoney } from "@/lib/dashboard";
import { loadDashboardWorkspace } from "@/lib/dashboard-workspace";
import {
  loadMmmData,
  metricValue,
  num,
  periodLabel,
  signedMoney,
} from "@/lib/measurement";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function MmmPage() {
  const { workspaceId, currency } = await loadDashboardWorkspace();
  const supabase = await createClient();
  const data = await loadMmmData(supabase, workspaceId);
  const run = data.run;
  const rowCurrency = data.rows[0]?.currency ?? currency;
  const modelFit = metricValue(run, "model_fit");
  const googleRoi =
    metricValue(run, "google_ads_roi") ??
    data.rows.find((row) => row.channel.toLowerCase().includes("google"))?.roi;
  const saturation =
    metricValue(run, "saturation_level") ??
    data.rows.find((row) => row.channel.toLowerCase().includes("google"))?.saturation_level;
  const weeks = metricValue(run, "data_weeks");

  return (
    <MeasurementPage
      title="MMM Model"
      subtitle="Model how spend, seasonality and external factors contribute to revenue and profit."
      eyebrow="Marketing mix"
      icon="trendUp"
      status={{
        label: data.error ? "Schema missing" : run?.status === "ready" ? "Ready" : "Needs history",
        detail: data.error
          ? `The MMM tables are not queryable yet: ${data.error}`
          : run
            ? `Latest MMM run covers ${periodLabel(run)}.`
            : "MMM needs a clean daily or weekly time series across Google Ads, other channels and business outcomes.",
        tone: data.error ? "error" : run?.status === "ready" ? "ready" : "pending",
      }}
      metrics={[
        {
          label: "Model fit",
          value: modelFit == null ? "—" : num(modelFit).toFixed(2),
          hint: "Backtest quality after seasonality and lag effects.",
          tone: "profit",
        },
        {
          label: "Google ROI",
          value: googleRoi == null ? "—" : `${num(googleRoi).toFixed(1)}×`,
          hint: "Modeled profit return from Google Ads spend.",
          tone: "profit",
        },
        {
          label: "Saturation",
          value: saturation == null ? "—" : String(saturation),
          hint: "More spend is likely to face diminishing returns.",
          tone: "amber",
        },
        {
          label: "Data span",
          value: weeks == null ? "—" : `${Math.round(num(weeks))}w`,
          hint: "Recommended minimum for a stable weekly model.",
        },
      ]}
      requirements={[
        {
          title: "Google Ads data",
          items: [
            "Daily or weekly spend by campaign, campaign type and network",
            "Impressions, clicks, conversions and conversion value",
            "Device and geo segments where spend is material",
            "Campaign status, budget and bidding strategy changes",
            "Search, Shopping, Performance Max, Display and YouTube breakdowns",
            "Change history for major launches, pauses and budget shifts",
          ],
        },
        {
          title: "Business and market data",
          items: [
            "Total orders, revenue, gross profit and net profit by day or week",
            "Spend and performance from Meta, TikTok, email, affiliates and other channels",
            "Promotions, discounts, launches and pricing changes",
            "Stockouts, product availability and catalog changes",
            "Holiday, payday, weekday and seasonal calendar features",
            "Optional market signals such as demand trends or competitor events",
          ],
        },
      ]}
      outputs={[
        {
          title: "Contribution by channel",
          description: "Estimate how much revenue and profit each channel contributed beyond baseline demand.",
          icon: "overview",
        },
        {
          title: "Diminishing returns curve",
          description: "Show whether more Google spend is likely to scale profit or hit saturation.",
          icon: "trendDown",
        },
        {
          title: "Budget optimizer",
          description: "Suggest a weekly spend allocation across channels using profit as the objective.",
          icon: "recommendations",
        },
        {
          title: "Scenario planner",
          description: "Let the user test what happens if Google Ads spend moves up or down next month.",
          icon: "spark",
        },
      ]}
      timeline={[
        {
          label: "Build time series",
          value: "Daily/weekly",
          detail: "Aggregate all marketing inputs and business outcomes into one clean date-indexed table.",
        },
        {
          label: "Add controls",
          value: "Context",
          detail: "Add holidays, promotions, price changes, stockouts and seasonality before fitting spend effects.",
        },
        {
          label: "Fit response curves",
          value: "Model",
          detail: "Estimate lag, adstock and saturation so the model reflects delayed and diminishing effects.",
        },
        {
          label: "Backtest",
          value: "Trust",
          detail: "Display error, confidence bands and periods where the model failed to explain outcomes.",
        },
      ]}
    >
      <Panel>
        <PanelHeader
          title="Channel contribution"
          hint={data.rows.length ? "Modeled profit contribution and recommended spend movement" : "No MMM contribution output stored yet"}
        />
        {data.rows.length ? (
          <div className="overflow-x-auto">
            <div className="min-w-[780px] divide-y divide-edge">
              {data.rows.map((row) => (
                <div
                  key={row.channel}
                  className="grid grid-cols-[1.25fr_1fr_1fr_0.7fr_0.8fr_0.8fr] items-center gap-4 px-5 py-4 text-sm"
                >
                  <p className="truncate font-medium text-fg">{row.channel}</p>
                  <p className="text-right font-mono text-muted nums">{formatMoney(num(row.spend), row.currency ?? currency)}</p>
                  <p className="text-right font-mono text-profit nums">
                    {formatMoney(num(row.contribution_profit), row.currency ?? currency)}
                  </p>
                  <p className="text-right font-mono text-muted nums">{row.roi == null ? "—" : `${num(row.roi).toFixed(2)}×`}</p>
                  <p className="text-right text-muted capitalize">{row.saturation_level ?? "—"}</p>
                  <p className="text-right font-mono text-muted nums">
                    {row.recommended_spend_change == null
                      ? "—"
                      : signedMoney(row.recommended_spend_change, row.currency ?? rowCurrency)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <p className="px-5 py-8 text-sm leading-6 text-muted">
            This table will show modeled channel contribution once a worker writes
            `mmm_channel_contributions` for the latest MMM run.
          </p>
        )}
      </Panel>
    </MeasurementPage>
  );
}
