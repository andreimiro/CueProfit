"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import { SignOutButton } from "@/components/sign-out-button";
import { ThemeToggle } from "@/components/theme-toggle";
import { Icon, type IconName } from "./icons";

type NavItem = { href: string; label: string; icon: IconName };

const NAV: NavItem[] = [
  { href: "/dashboard", label: "Overview", icon: "overview" },
  { href: "/dashboard/campaigns", label: "Campaigns", icon: "campaigns" },
  { href: "/dashboard/products", label: "Products", icon: "products" },
  { href: "/dashboard/costs", label: "Product costs", icon: "products" },
  { href: "/dashboard/feed-health", label: "Feed health", icon: "feed" },
  { href: "/dashboard/recommendations", label: "Recommendations", icon: "recommendations" },
];

function isActive(pathname: string, href: string) {
  if (href === "/dashboard") return pathname === "/dashboard";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function Brand() {
  return (
    <Link href="/dashboard" className="group flex items-center gap-2.5">
      <span className="grid h-9 w-9 place-items-center rounded-xl border border-edge bg-fg text-canvas transition group-hover:border-profit/50">
        <span className="h-2.5 w-2.5 rounded-full bg-profit shadow-[0_0_10px_2px] shadow-profit/50" />
      </span>
      <span className="font-display text-[17px] font-semibold tracking-tight">
        Cue<span className="text-profit">Profit</span>
      </span>
    </Link>
  );
}

export function SidebarNav({ pathname }: { pathname: string }) {
  return (
    <nav className="flex flex-col gap-1">
      {NAV.map((item) => {
        const active = isActive(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={`group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
              active
                ? "bg-profit/12 text-profit"
                : "text-muted hover:bg-panel-2 hover:text-fg"
            }`}
          >
            <span
              className={`absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-profit transition-opacity ${
                active ? "opacity-100" : "opacity-0"
              }`}
              aria-hidden
            />
            <Icon
              name={item.icon}
              className={active ? "text-profit" : "text-faint transition group-hover:text-fg"}
            />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function MobileNav() {
  const pathname = usePathname();
  return (
    <nav className="flex gap-1.5 overflow-x-auto pb-0.5">
      {NAV.map((item) => {
        const active = isActive(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={`inline-flex shrink-0 items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition ${
              active ? "bg-profit/12 text-profit" : "text-muted hover:text-fg"
            }`}
          >
            <Icon
              name={item.icon}
              width={16}
              height={16}
              className={active ? "text-profit" : "text-faint"}
            />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function Sidebar({
  workspaceName,
  userEmail,
}: {
  workspaceName: string;
  userEmail: string;
}) {
  const pathname = usePathname();
  const initial = (userEmail.trim()[0] ?? "?").toUpperCase();
  const settingsActive = isActive(pathname, "/dashboard/settings");

  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-edge bg-panel/70 px-4 pb-4 pt-5 backdrop-blur-xl lg:flex">
      <div className="shrink-0 px-1">
        <Brand />
      </div>

      <button
        type="button"
        className="mt-5 flex w-full shrink-0 items-center justify-between rounded-xl border border-edge bg-canvas/60 px-3 py-2.5 text-left transition hover:border-profit/30"
      >
        <span className="flex min-w-0 items-center gap-2.5">
          <span className="grid h-6 w-6 shrink-0 place-items-center rounded-md bg-profit/15 font-display text-xs font-semibold text-profit">
            {workspaceName.trim()[0]?.toUpperCase() ?? "W"}
          </span>
          <span className="truncate text-sm font-medium text-fg">{workspaceName}</span>
        </span>
        <Icon name="chevronDown" className="shrink-0 text-faint" width={16} height={16} />
      </button>

      <div className="mt-6 shrink-0 px-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-faint">
        Workspace
      </div>

      {/* Scrollable nav so Settings + account stay pinned at the bottom at any height */}
      <div className="-mx-1 mt-2 min-h-0 flex-1 overflow-y-auto px-1">
        <SidebarNav pathname={pathname} />
      </div>

      <div className="shrink-0 space-y-2 pt-3">
        <Link
          href="/dashboard/settings"
          aria-current={settingsActive ? "page" : undefined}
          className={`group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
            settingsActive ? "bg-profit/12 text-profit" : "text-muted hover:bg-panel-2 hover:text-fg"
          }`}
        >
          <Icon
            name="settings"
            className={settingsActive ? "text-profit" : "text-faint transition group-hover:text-fg"}
          />
          Settings
        </Link>

        <div className="flex items-center gap-3 rounded-xl border border-edge bg-canvas/50 p-2.5">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-panel-2 font-display text-sm font-semibold text-fg">
            {initial}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-fg">{userEmail || "Signed in"}</p>
            <p className="text-xs text-faint">Account</p>
          </div>
          <ThemeToggle />
        </div>
        <SignOutButton className="w-full justify-center" />
      </div>
    </aside>
  );
}
