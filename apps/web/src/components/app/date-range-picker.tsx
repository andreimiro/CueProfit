"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { Icon } from "./icons";

const OPTIONS = [
  { days: 7, label: "Last 7 days" },
  { days: 14, label: "Last 14 days" },
  { days: 30, label: "Last 30 days" },
  { days: 90, label: "Last 90 days" },
] as const;

/** Functional date-range picker. Writes `?range=N` (omitted when default); pages
 *  read it server-side to size their query window. */
export function DateRangePicker({ defaultDays = 30 }: { defaultDays?: number }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const current = [7, 14, 30, 90].includes(Number(params.get("range")))
    ? Number(params.get("range"))
    : defaultDays;
  const active = OPTIONS.find((o) => o.days === current) ?? OPTIONS[2];

  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  function select(days: number) {
    const sp = new URLSearchParams(params.toString());
    if (days === defaultDays) sp.delete("range");
    else sp.set("range", String(days));
    const qs = sp.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    setOpen(false);
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="inline-flex items-center gap-2 rounded-xl border border-edge bg-panel px-3.5 py-2.5 text-sm font-medium text-muted transition hover:border-profit/30 hover:text-fg"
      >
        <Icon name="calendar" width={16} height={16} className="text-faint" />
        {active.label}
        <Icon name="chevronDown" width={15} height={15} className="text-faint" />
      </button>
      {open ? (
        <div
          role="listbox"
          className="absolute right-0 z-40 mt-1.5 w-40 overflow-hidden rounded-xl border border-edge bg-panel shadow-card"
        >
          {OPTIONS.map((o) => (
            <button
              key={o.days}
              type="button"
              role="option"
              aria-selected={o.days === current}
              onClick={() => select(o.days)}
              className={`flex w-full items-center justify-between px-3.5 py-2.5 text-left text-sm transition hover:bg-panel-2 ${
                o.days === current ? "text-profit" : "text-muted"
              }`}
            >
              {o.label}
              {o.days === current ? <Icon name="check" width={14} height={14} /> : null}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
