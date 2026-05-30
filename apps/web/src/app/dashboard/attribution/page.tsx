import { MeasurementPage } from "@/components/app/measurement-page";

export default function AttributionPage() {
  return (
    <MeasurementPage
      title="Multi-Touch Attribution"
      subtitle="Trace the path from ad click to order and assign credit across touchpoints."
      eyebrow="Journey model"
      icon="link"
      metrics={[
        {
          label: "Matched revenue",
          value: "82%",
          hint: "Orders tied back to at least one paid touch.",
          tone: "profit",
        },
        {
          label: "Avg touches",
          value: "3.4",
          hint: "Paid and onsite steps before purchase.",
        },
        {
          label: "Assisted profit",
          value: "41k",
          hint: "Profit influenced before the final click.",
          tone: "profit",
        },
        {
          label: "Unmatched orders",
          value: "18%",
          hint: "Needs click IDs, UTMs or event identity.",
          tone: "amber",
        },
      ]}
      requirements={[
        {
          title: "Google Ads data",
          items: [
            "Campaign, ad group, ad, keyword, asset and product IDs",
            "Daily clicks, impressions, cost, conversions and conversion value",
            "Conversion actions, categories, status and primary goal flags",
            "Segments by date, device, network and product item ID",
            "Search terms and keyword match type for query-level paths",
            "Customer timezone and currency for correct journey windows",
          ],
        },
        {
          title: "First-party data",
          items: [
            "Website sessions, landing pages, UTMs and referrers",
            "Click identifiers such as GCLID, GBRAID and WBRAID when available",
            "Orders, revenue, gross margin, COGS, shipping, fees and returns",
            "User, customer or anonymous visitor IDs across sessions",
            "Event timestamps for view, click, cart, checkout and purchase",
            "Consent state so attribution respects tracking permissions",
          ],
        },
      ]}
      outputs={[
        {
          title: "Channel and campaign credit",
          description: "Show first-touch, last-touch, linear and data-driven-style credit side by side.",
          icon: "overview",
        },
        {
          title: "Assisted profit",
          description: "Reveal campaigns that start or assist profitable journeys but rarely close them.",
          icon: "trendUp",
        },
        {
          title: "Path explorer",
          description: "Display the common sequence of touchpoints before high-margin and low-margin orders.",
          icon: "link",
        },
        {
          title: "Tracking gaps",
          description: "Flag missing UTMs, missing click IDs and orders that cannot be attributed.",
          icon: "alert",
        },
      ]}
      timeline={[
        {
          label: "Collect touchpoints",
          value: "Ads + onsite",
          detail: "Sync Google Ads clicks/performance and capture session-level source data in the webapp.",
        },
        {
          label: "Match orders",
          value: "Identity",
          detail: "Join orders to users, sessions, click IDs and campaign metadata inside the warehouse.",
        },
        {
          label: "Assign credit",
          value: "Model",
          detail: "Calculate first-touch, last-touch, linear and margin-weighted assisted credit.",
        },
        {
          label: "Explain confidence",
          value: "QA",
          detail: "Show match rate, missing data and the share of revenue excluded from the model.",
        },
      ]}
    />
  );
}
