import Link from "next/link";
import type { ReactNode } from "react";

import { Panel, PanelHeader } from "./cards";
import { Icon, type IconName } from "./icons";
import { PageHeader } from "./page-header";

type Metric = {
  label: string;
  value: string;
  hint: string;
  tone?: "profit" | "loss" | "amber" | "muted";
};

type RequirementGroup = {
  title: string;
  items: string[];
};

type Output = {
  title: string;
  description: string;
  icon: IconName;
};

type TimelineStep = {
  label: string;
  value: string;
  detail: string;
};

const toneClass = {
  profit: "text-profit",
  loss: "text-loss",
  amber: "text-amber",
  muted: "text-muted",
};

export function MeasurementPage({
  title,
  subtitle,
  eyebrow,
  icon,
  metrics,
  requirements,
  outputs,
  timeline,
  children,
}: {
  title: string;
  subtitle: string;
  eyebrow: string;
  icon: IconName;
  metrics: Metric[];
  requirements: RequirementGroup[];
  outputs: Output[];
  timeline: TimelineStep[];
  children?: ReactNode;
}) {
  return (
    <div className="px-5 py-6 sm:px-8 lg:px-10 lg:py-8">
      <div className="mx-auto w-full max-w-[1760px] animate-reveal space-y-7">
        <PageHeader
          title={title}
          subtitle={subtitle}
          actions={
            <Link
              href="/dashboard/settings"
              className="inline-flex items-center gap-2 rounded-xl border border-edge bg-panel px-3.5 py-2 text-sm font-semibold text-muted transition hover:border-profit/40 hover:text-fg"
            >
              Configure data
              <Icon name="chevronRight" width={15} height={15} />
            </Link>
          }
        />

        <section className="grid gap-5 xl:grid-cols-[1.25fr_0.75fr]">
          <Panel className="overflow-hidden">
            <div className="border-b border-edge bg-profit/[0.06] px-5 py-5">
              <div className="flex items-start gap-4">
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl border border-profit/20 bg-profit/15 text-profit">
                  <Icon name={icon} width={24} height={24} />
                </span>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-profit">
                    {eyebrow}
                  </p>
                  <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight">
                    What this page needs to display
                  </h2>
                  <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">
                    This is the operating view for the model: inputs, confidence, outputs and
                    the next decision a marketer can make from the result.
                  </p>
                </div>
              </div>
            </div>
            <div className="grid gap-px bg-edge md:grid-cols-2 xl:grid-cols-4">
              {metrics.map((metric) => (
                <div key={metric.label} className="bg-panel p-5">
                  <p className="text-xs font-semibold uppercase tracking-wide text-faint">
                    {metric.label}
                  </p>
                  <p
                    className={`mt-3 font-mono text-2xl font-semibold nums ${toneClass[metric.tone ?? "muted"]}`}
                  >
                    {metric.value}
                  </p>
                  <p className="mt-2 text-sm leading-5 text-muted">{metric.hint}</p>
                </div>
              ))}
            </div>
          </Panel>

          <Panel>
            <PanelHeader title="Readiness flow" hint="How the page becomes trustworthy" />
            <div className="p-5">
              <div className="space-y-4">
                {timeline.map((step, index) => (
                  <div key={step.label} className="flex gap-3">
                    <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full border border-edge bg-panel-2 font-mono text-xs text-faint nums">
                      {index + 1}
                    </span>
                    <div className="min-w-0 border-b border-edge pb-4 last:border-b-0 last:pb-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium text-fg">{step.label}</p>
                        <span className="rounded-full border border-edge bg-canvas px-2 py-0.5 text-xs text-faint">
                          {step.value}
                        </span>
                      </div>
                      <p className="mt-1 text-sm leading-6 text-muted">{step.detail}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Panel>
        </section>

        <section className="grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
          <Panel>
            <PanelHeader title="Required data" hint="Google Ads plus first-party business data" />
            <div className="grid gap-px bg-edge md:grid-cols-2">
              {requirements.map((group) => (
                <div key={group.title} className="bg-panel p-5">
                  <h3 className="font-display text-base font-semibold">{group.title}</h3>
                  <ul className="mt-4 space-y-2.5">
                    {group.items.map((item) => (
                      <li key={item} className="flex gap-2.5 text-sm leading-5 text-muted">
                        <Icon name="check" width={15} height={15} className="mt-0.5 shrink-0 text-profit" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </Panel>

          <Panel>
            <PanelHeader title="Outputs" hint="The useful decisions this page should produce" />
            <div className="grid gap-3 p-5 md:grid-cols-2">
              {outputs.map((output) => (
                <div key={output.title} className="rounded-xl border border-edge bg-canvas/60 p-4">
                  <span className="grid h-9 w-9 place-items-center rounded-xl border border-edge bg-panel text-faint">
                    <Icon name={output.icon} width={18} height={18} />
                  </span>
                  <h3 className="mt-4 font-display text-base font-semibold">{output.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-muted">{output.description}</p>
                </div>
              ))}
            </div>
          </Panel>
        </section>

        {children}
      </div>
    </div>
  );
}
