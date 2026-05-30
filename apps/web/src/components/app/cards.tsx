import type { ReactNode } from "react";

import { Icon, type IconName } from "./icons";

export function Panel({
  className = "",
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={`rounded-2xl border border-edge bg-panel shadow-card ${className}`}>
      {children}
    </div>
  );
}

export function PanelHeader({
  title,
  hint,
  action,
}: {
  title: string;
  hint?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-edge px-5 py-4">
      <div className="min-w-0">
        <h2 className="font-display text-lg font-semibold tracking-tight">{title}</h2>
        {hint ? <p className="mt-0.5 text-sm text-muted">{hint}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

export function EmptyState({
  icon = "spark",
  title,
  description,
  action,
  children,
}: {
  icon?: IconName;
  title: string;
  description: string;
  action?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-12 text-center">
      <span className="grid h-12 w-12 place-items-center rounded-2xl border border-edge bg-panel-2 text-faint">
        <Icon name={icon} width={22} height={22} />
      </span>
      <div>
        <p className="font-display text-base font-semibold">{title}</p>
        <p className="mx-auto mt-1 max-w-md text-sm leading-6 text-muted">{description}</p>
      </div>
      {action ? <div className="mt-1">{action}</div> : null}
      {children ? <div className="mt-1">{children}</div> : null}
    </div>
  );
}

const STATUS = {
  Scale: "border-profit/30 bg-profit/12 text-profit",
  Hold: "border-edge bg-panel-2 text-muted",
  Cap: "border-amber/30 bg-amber/12 text-amber",
  Pause: "border-loss/30 bg-loss/12 text-loss",
} as const;

export type StatusName = keyof typeof STATUS;

export function StatusTag({ status }: { status: StatusName }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${STATUS[status]}`}
    >
      {status}
    </span>
  );
}
