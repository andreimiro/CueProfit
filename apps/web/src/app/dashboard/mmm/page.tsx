import { MeasurementPage } from "@/components/app/measurement-page";

export default function MmmPage() {
  return (
    <MeasurementPage
      title="MMM Model"
      subtitle="Model how spend, seasonality and external factors contribute to revenue and profit."
      eyebrow="Marketing mix"
      icon="trendUp"
      metrics={[
        {
          label: "Model fit",
          value: "0.81",
          hint: "Backtest quality after seasonality and lag effects.",
          tone: "profit",
        },
        {
          label: "Google ROI",
          value: "2.7×",
          hint: "Modeled profit return from Google Ads spend.",
          tone: "profit",
        },
        {
          label: "Saturation",
          value: "High",
          hint: "More spend is likely to face diminishing returns.",
          tone: "amber",
        },
        {
          label: "Data span",
          value: "52w",
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
    />
  );
}
