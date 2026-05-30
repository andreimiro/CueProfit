import { EmptyState, Panel } from "./cards";
import { ConnectGoogleButton } from "./controls";
import type { IconName } from "./icons";
import { PageHeader } from "./page-header";

/** Shared scaffold for sections that light up after the first data sync. */
export function PlaceholderPage({
  title,
  subtitle,
  icon,
  emptyTitle,
  emptyDescription,
}: {
  title: string;
  subtitle: string;
  icon: IconName;
  emptyTitle: string;
  emptyDescription: string;
}) {
  return (
    <div className="px-5 py-6 sm:px-8 lg:px-10 lg:py-8">
      <div className="mx-auto w-full max-w-[1760px] animate-reveal space-y-7">
        <PageHeader title={title} subtitle={subtitle} actions={<ConnectGoogleButton />} />
        <Panel>
          <EmptyState
            icon={icon}
            title={emptyTitle}
            description={emptyDescription}
            action={<ConnectGoogleButton variant="secondary" />}
          />
        </Panel>
      </div>
    </div>
  );
}
