"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { Icon } from "./icons";

/** Debounced search box. Writes `?q=` after a pause; the page filters its rows
 *  server-side (fuzzy). Local state keeps typing snappy. */
export function SearchField({
  placeholder = "Search campaigns, products…",
  debounceMs = 300,
}: {
  placeholder?: string;
  debounceMs?: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [value, setValue] = useState(params.get("q") ?? "");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Keep in sync when the URL changes elsewhere (e.g. back/forward).
  useEffect(() => {
    setValue(params.get("q") ?? "");
  }, [params]);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  function onChange(next: string) {
    setValue(next);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      const sp = new URLSearchParams(params.toString());
      if (next.trim()) sp.set("q", next.trim());
      else sp.delete("q");
      const qs = sp.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    }, debounceMs);
  }

  return (
    <div className="relative hidden md:block">
      <Icon
        name="search"
        width={16}
        height={16}
        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-faint"
      />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label="Search"
        className="w-52 rounded-xl border border-edge bg-panel py-2.5 pl-9 pr-3 text-sm text-fg outline-none transition placeholder:text-faint focus:border-profit/40 lg:w-64"
      />
    </div>
  );
}
