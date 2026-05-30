import { Panel } from "./cards";
import { DataSourceEmpty, GoogleAdsHeaderAction } from "./data-source-empty";
import type { IconName } from "./icons";
import { PageHeader } from "./page-header";
import type { WorkspaceSources } from "@/lib/workspace";

/** Shared scaffold for sections that light up after the first data sync. */
export function PlaceholderPage({
  title,
  subtitle,
  icon,
  emptyTitle,
  emptyDescription,
  sources,
  source = "google_ads",
}: {
  title: string;
  subtitle: string;
  icon: IconName;
  emptyTitle: string;
  emptyDescription: string;
  sources: WorkspaceSources;
  source?: "google_ads" | "merchant" | "profit";
}) {
  return (
    <div className="px-5 py-6 sm:px-8 lg:px-10 lg:py-8">
      <div className="mx-auto w-full max-w-[1760px] animate-reveal space-y-7">
        <PageHeader
          title={title}
          subtitle={subtitle}
          actions={<GoogleAdsHeaderAction sources={sources} />}
        />
        <Panel>
          <DataSourceEmpty
            sources={sources}
            source={source}
            icon={icon}
            title={emptyTitle}
            description={emptyDescription}
          />
        </Panel>
      </div>
    </div>
  );
}
