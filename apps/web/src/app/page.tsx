import Link from "next/link";
import type { ReactNode } from "react";

import { Icon } from "@/components/app/icons";
import { GoogleGlyph } from "@/components/google-glyph";
import { ThemeToggle } from "@/components/theme-toggle";

const appBaseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://app.captioncue.shop";

const METRICS = [
  { v: "+14.7%", k: "incremental profit surfaced in the first audit" },
  { v: "2.4M+ RON", k: "ad spend modeled down to true margin" },
  { v: "3.8×", k: "break-even ROAS exposed on thin-margin SKUs" },
] as const;

const TRUST = ["Read-only Google Ads access", "Live in minutes", "No card to start"];

const WASTE = [
  ["PMax / outlet inventory", "−740 RON"],
  ["Shopping / clearance set", "−312 RON"],
  ["Search / broad match", "−188 RON"],
] as const;

const FEED = [
  ["Disapproved items", "4", "loss"],
  ["Weak / truncated titles", "12", "amber"],
  ["Conversion tracking gaps", "2", "amber"],
] as const;

const MOVES = [
  ["Pause PMax outlet group", "+740 RON / wk", "Pause"],
  ["Scale hero SKU shopping", "+1,960 RON / wk", "Scale"],
  ["Cap broad-match search", "+430 RON / wk", "Cap"],
] as const;

export default function Home() {
  return (
    <main className="relative min-h-[100dvh] overflow-x-clip bg-canvas">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[80vh] bg-paper-grid" aria-hidden />
      <div className="grain pointer-events-none fixed inset-0 z-50" aria-hidden />

      <SiteNav />

      {/* ── Hero — asymmetric split ─────────────────────────────────── */}
      <section className="relative mx-auto grid max-w-7xl items-center gap-14 px-5 pb-20 pt-10 sm:px-8 lg:grid-cols-[0.95fr_1.05fr] lg:gap-10 lg:pb-28 lg:pt-16">
        <div className="max-w-xl">
          <span className="animate-reveal inline-flex items-center gap-2 rounded-full border border-edge bg-panel/70 px-3 py-1.5 text-xs font-medium text-muted">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-profit/70" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-profit" />
            </span>
            Profit intelligence for Google Ads &amp; Merchant Center
          </span>

          <h1
            className="animate-reveal mt-7 text-4xl font-semibold leading-[1.04] tracking-tight md:text-6xl"
            style={{ animationDelay: "80ms" }}
          >
            <span className="block font-normal text-faint">Stop optimizing for ROAS.</span>
            <span className="block">
              Start optimizing for <span className="text-profit">profit</span>.
            </span>
          </h1>

          <p
            className="animate-reveal mt-6 max-w-[56ch] text-lg leading-relaxed text-muted"
            style={{ animationDelay: "160ms" }}
          >
            CueProfit blends ad spend, product cost, shipping, returns and fees into one true
            profit view — so you scale what earns margin and cap what quietly bleeds it.
          </p>

          <div
            className="animate-reveal mt-9 flex flex-wrap items-center gap-3"
            style={{ animationDelay: "240ms" }}
          >
            <Link
              href={`${appBaseUrl}/login`}
              className="inline-flex items-center gap-2 rounded-xl bg-profit px-5 py-3 text-sm font-semibold text-on-profit shadow-[0_18px_35px_-22px_var(--color-profit)] transition duration-300 hover:bg-profit-strong active:translate-y-px"
            >
              <GoogleGlyph size={16} />
              Connect Google Ads
            </Link>
            <Link
              href={`${appBaseUrl}/dashboard`}
              className="inline-flex items-center gap-2 rounded-xl border border-edge bg-panel px-5 py-3 text-sm font-semibold text-fg transition duration-300 hover:border-profit/40 active:translate-y-px"
            >
              See the dashboard
              <Icon name="chevronRight" width={15} height={15} className="text-faint" />
            </Link>
          </div>

          <ul
            className="animate-reveal mt-8 flex flex-wrap gap-x-6 gap-y-2"
            style={{ animationDelay: "320ms" }}
          >
            {TRUST.map((t) => (
              <li key={t} className="flex items-center gap-2 text-sm text-faint">
                <Icon name="check" width={15} height={15} className="text-profit" />
                {t}
              </li>
            ))}
          </ul>
        </div>

        <div className="animate-reveal relative" style={{ animationDelay: "200ms" }}>
          <div
            className="pointer-events-none absolute -inset-10 -z-10 opacity-70"
            style={{
              background:
                "radial-gradient(60% 55% at 60% 30%, color-mix(in oklab, var(--color-profit) 18%, transparent), transparent 70%)",
            }}
            aria-hidden
          />
          <div className="animate-float lg:translate-x-2">
            <ProductPanel />
          </div>
        </div>
      </section>

      {/* ── Proof strip ─────────────────────────────────────────────── */}
      <section className="relative border-y border-edge bg-panel/60">
        <div className="mx-auto grid max-w-7xl divide-y divide-edge px-5 sm:px-8 md:grid-cols-3 md:divide-x md:divide-y-0">
          {METRICS.map((m) => (
            <div key={m.v} className="py-10 md:px-10 md:first:pl-0">
              <p className="font-display text-4xl font-semibold tracking-tight nums sm:text-5xl">
                {m.v}
              </p>
              <p className="mt-3 max-w-xs text-sm leading-6 text-muted">{m.k}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Feature bento (asymmetric) ──────────────────────────────── */}
      <section id="product" className="relative mx-auto max-w-7xl px-5 py-24 sm:px-8 lg:py-32">
        <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-end">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.14em] text-profit">
              The operating view
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-5xl">
              Every panel answers one question: will this make money?
            </h2>
          </div>
          <p className="max-w-xl text-lg leading-relaxed text-muted lg:justify-self-end">
            Built around a merchant&apos;s real constraints — margin, stock, feed health and
            confidence — not the vanity metrics that hide losses.
          </p>
        </div>

        <div className="mt-14 grid gap-4 md:grid-cols-3">
          <FeatureTile
            className="md:col-span-2"
            icon="overview"
            title="Margin truth"
            desc="Blend ad spend, product cost, shipping, returns and fees into one profit number — per campaign and per SKU."
          >
            <div className="grid gap-2.5 rounded-xl border border-edge bg-canvas/60 p-4 font-mono text-sm nums">
              <PLine k="conversion value" v="300.00" />
              <PLine k="product cost" v="−220.00" tone="loss" />
              <PLine k="ad spend" v="−100.00" tone="loss" />
              <div className="my-1 border-t border-edge" />
              <PLine k="net profit" v="−20.00" tone="loss" strong />
            </div>
          </FeatureTile>

          <FeatureTile
            icon="trendDown"
            title="Waste radar"
            desc="Products and campaigns that look fine on ROAS but lose money after costs."
          >
            <div className="space-y-2">
              {WASTE.map(([name, val]) => (
                <div
                  key={name}
                  className="flex items-center justify-between rounded-lg border border-edge bg-canvas/60 px-3 py-2 text-sm"
                >
                  <span className="truncate pr-3 text-muted">{name}</span>
                  <span className="shrink-0 font-mono nums text-loss">{val}</span>
                </div>
              ))}
            </div>
          </FeatureTile>

          <FeatureTile
            icon="feed"
            title="Feed pressure"
            desc="Catch Merchant Center issues and tracking breaks before they drain spend."
          >
            <div className="space-y-2">
              {FEED.map(([name, count, tone]) => (
                <div
                  key={name}
                  className="flex items-center justify-between rounded-lg border border-edge bg-canvas/60 px-3 py-2 text-sm"
                >
                  <span className="flex items-center gap-2 text-muted">
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${tone === "loss" ? "bg-loss" : "bg-amber"}`}
                    />
                    {name}
                  </span>
                  <span className="font-mono nums text-fg">{count}</span>
                </div>
              ))}
            </div>
          </FeatureTile>

          <FeatureTile
            className="md:col-span-2"
            icon="recommendations"
            title="Next move"
            desc="A ranked list of what to stop, fix or scale — each with estimated weekly impact and confidence."
          >
            <div className="grid gap-2 sm:grid-cols-3">
              {MOVES.map(([name, impact, tag]) => (
                <div
                  key={name}
                  className="flex flex-col justify-between gap-3 rounded-xl border border-edge bg-canvas/60 p-3"
                >
                  <p className="text-sm leading-5 text-fg">{name}</p>
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs nums text-profit">{impact}</span>
                    <ActionTag tag={tag} />
                  </div>
                </div>
              ))}
            </div>
          </FeatureTile>
        </div>
      </section>

      {/* ── Break-even proof (zig-zag) ──────────────────────────────── */}
      <section id="proof" className="relative mx-auto max-w-7xl px-5 pb-24 sm:px-8 lg:pb-32">
        <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="flex flex-col justify-between gap-10 rounded-3xl border border-edge bg-fg p-8 text-canvas sm:p-10">
            <p className="text-sm font-semibold uppercase tracking-[0.14em] text-profit">
              The break-even model
            </p>
            <div>
              <h2 className="text-3xl font-semibold tracking-tight sm:text-5xl">
                A 3.0× ROAS can still be a loss.
              </h2>
              <p className="mt-5 max-w-md text-base leading-relaxed text-canvas/70">
                Margin, not multiples, decides profit. CueProfit computes the real number for
                every campaign and product, then ranks the decisions by expected impact.
              </p>
            </div>
          </div>

          <div className="rounded-3xl border border-edge bg-panel p-8 shadow-card sm:p-10">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-muted">Single order, 3.0× ROAS</p>
              <span className="rounded-full border border-loss/30 bg-loss/12 px-2.5 py-1 text-xs font-semibold text-loss">
                Net loss
              </span>
            </div>
            <div className="mt-6 space-y-4 font-mono text-sm nums">
              <PLine k="conversion value" v="300.00 RON" />
              <PLine k="product cost" v="−220.00 RON" tone="loss" />
              <PLine k="gross profit" v="80.00 RON" tone="profit" />
              <PLine k="ad spend" v="−100.00 RON" tone="loss" />
              <div className="border-t border-edge" />
              <PLine k="net profit" v="−20.00 RON" tone="loss" strong big />
            </div>
          </div>
        </div>
      </section>

      {/* ── Closing CTA ─────────────────────────────────────────────── */}
      <section className="relative mx-auto max-w-7xl px-5 pb-24 sm:px-8 lg:pb-32">
        <div className="relative overflow-hidden rounded-3xl border border-edge bg-panel px-6 py-14 text-center sm:px-10 sm:py-20">
          <div
            className="pointer-events-none absolute inset-0 -z-10 opacity-80"
            style={{
              background:
                "radial-gradient(60% 120% at 50% 0%, color-mix(in oklab, var(--color-profit) 12%, transparent), transparent 70%)",
            }}
            aria-hidden
          />
          <h2 className="mx-auto max-w-2xl text-3xl font-semibold tracking-tight sm:text-5xl">
            See your true profit in one sync.
          </h2>
          <p className="mx-auto mt-4 max-w-md text-base leading-relaxed text-muted">
            Connect a read-only Google Ads account and watch the placeholders fill with real margin.
          </p>
          <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
            <Link
              href={`${appBaseUrl}/login`}
              className="inline-flex items-center gap-2 rounded-xl bg-profit px-5 py-3 text-sm font-semibold text-on-profit shadow-[0_18px_35px_-22px_var(--color-profit)] transition duration-300 hover:bg-profit-strong active:translate-y-px"
            >
              <GoogleGlyph size={16} />
              Connect Google Ads
            </Link>
            <Link
              href={`${appBaseUrl}/dashboard`}
              className="inline-flex items-center gap-2 rounded-xl border border-edge bg-canvas px-5 py-3 text-sm font-semibold text-fg transition duration-300 hover:border-profit/40 active:translate-y-px"
            >
              View the dashboard
            </Link>
          </div>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}

function SiteNav() {
  return (
    <header className="sticky top-0 z-40 border-b border-edge/60 bg-canvas/70 backdrop-blur-xl">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 sm:px-8">
        <Logo />
        <div className="hidden items-center gap-8 text-sm text-muted md:flex">
          <a href="#product" className="transition hover:text-fg">Product</a>
          <a href="#proof" className="transition hover:text-fg">Break-even</a>
          <Link href={`${appBaseUrl}/login`} className="transition hover:text-fg">Log in</Link>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Link
            href={`${appBaseUrl}/login`}
            className="inline-flex items-center gap-2 rounded-xl bg-profit px-4 py-2.5 text-sm font-semibold text-on-profit transition duration-300 hover:bg-profit-strong active:translate-y-px"
          >
            <GoogleGlyph size={15} />
            <span className="hidden sm:inline">Connect</span>
            <span className="sm:hidden">Start</span>
          </Link>
        </div>
      </nav>
    </header>
  );
}

function Logo() {
  return (
    <Link href="/" className="group flex items-center gap-2.5">
      <span className="grid h-9 w-9 place-items-center rounded-xl border border-edge bg-fg text-canvas transition group-hover:border-profit/50">
        <span className="h-2.5 w-2.5 rounded-full bg-profit shadow-[0_0_10px_2px] shadow-profit/50" />
      </span>
      <span className="font-display text-[17px] font-semibold tracking-tight">
        Cue<span className="text-profit">Profit</span>
      </span>
    </Link>
  );
}

function FeatureTile({
  className = "",
  icon,
  title,
  desc,
  children,
}: {
  className?: string;
  icon: "overview" | "trendDown" | "feed" | "recommendations";
  title: string;
  desc: string;
  children: ReactNode;
}) {
  return (
    <article
      className={`group flex flex-col rounded-3xl border border-edge bg-panel p-6 shadow-card transition duration-300 hover:-translate-y-1 hover:border-profit/30 sm:p-7 ${className}`}
    >
      <div className="flex items-center gap-3">
        <span className="grid h-9 w-9 place-items-center rounded-xl border border-edge bg-panel-2 text-profit">
          <Icon name={icon} width={18} height={18} />
        </span>
        <h3 className="font-display text-lg font-semibold tracking-tight">{title}</h3>
      </div>
      <p className="mt-3 max-w-md text-sm leading-6 text-muted">{desc}</p>
      <div className="mt-5">{children}</div>
    </article>
  );
}

function PLine({
  k,
  v,
  tone,
  strong,
  big,
}: {
  k: string;
  v: string;
  tone?: "profit" | "loss";
  strong?: boolean;
  big?: boolean;
}) {
  const color = tone === "profit" ? "text-profit" : tone === "loss" ? "text-loss" : "text-muted";
  return (
    <div className={`flex items-center justify-between ${big ? "text-base" : ""}`}>
      <span className="text-muted">{k}</span>
      <span className={`${color} ${strong ? "font-semibold" : ""}`}>{v}</span>
    </div>
  );
}

const ACTION = {
  Scale: "border-profit/30 bg-profit/12 text-profit",
  Cap: "border-amber/30 bg-amber/12 text-amber",
  Pause: "border-loss/30 bg-loss/12 text-loss",
} as const;

function ActionTag({ tag }: { tag: keyof typeof ACTION }) {
  return (
    <span className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${ACTION[tag]}`}>
      {tag}
    </span>
  );
}

function ProductPanel() {
  const bars = [42, 56, 49, 64, 58, 74, 60, 84, 76, 92, 70, 86];
  const rows = [
    ["Shopping / hero SKUs", "+8,420", "Scale"],
    ["PMax / outlet", "−740", "Pause"],
    ["Search / brand", "+1,960", "Hold"],
  ] as const;
  return (
    <div className="overflow-hidden rounded-2xl border border-edge bg-panel shadow-design">
      <div className="flex items-center justify-between border-b border-edge bg-panel-2 px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-loss" />
          <span className="h-2.5 w-2.5 rounded-full bg-amber" />
          <span className="h-2.5 w-2.5 rounded-full bg-profit" />
        </div>
        <span className="font-mono text-xs text-faint">cueprofit / overview · last 7 days</span>
      </div>
      <div className="grid sm:grid-cols-[148px_1fr]">
        <aside className="hidden border-r border-edge bg-canvas/40 p-3 sm:block">
          {["Overview", "Campaigns", "Products", "Feed", "Actions"].map((item, i) => (
            <div
              key={item}
              className={`mb-1 flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm ${
                i === 0 ? "bg-profit/12 text-profit" : "text-muted"
              }`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${i === 0 ? "bg-profit" : "bg-edge"}`} />
              {item}
            </div>
          ))}
        </aside>
        <div className="p-4 sm:p-5">
          <div className="grid grid-cols-3 gap-2.5">
            <MiniKpi k="Net profit" v="+18,420" tone="profit" />
            <MiniKpi k="POAS" v="2.94" tone="neutral" />
            <MiniKpi k="Wasted" v="−740" tone="loss" />
          </div>
          <div className="mt-3 rounded-xl border border-edge bg-canvas/60 p-4">
            <div className="mb-4 flex items-center justify-between">
              <p className="text-xs font-medium text-muted">Daily net profit</p>
              <span className="rounded-full bg-profit/12 px-2 py-0.5 font-mono text-[11px] text-profit">
                +18%
              </span>
            </div>
            <div className="flex h-28 items-end gap-1.5">
              {bars.map((h, i) => (
                <span
                  key={i}
                  className={`flex-1 rounded-t ${i === 2 || i === 6 ? "bg-loss/70" : "bg-profit/70"}`}
                  style={{ height: `${h}%` }}
                />
              ))}
            </div>
          </div>
          <div className="mt-3 overflow-hidden rounded-xl border border-edge">
            {rows.map(([name, profit, action]) => (
              <div
                key={name}
                className="grid grid-cols-[1.5fr_0.8fr_0.7fr] items-center gap-2 border-b border-edge px-3 py-2.5 text-sm last:border-b-0"
              >
                <span className="truncate text-muted">{name}</span>
                <span className={`font-mono nums ${profit.startsWith("−") ? "text-loss" : "text-profit"}`}>
                  {profit}
                </span>
                <span className="text-right text-xs font-medium text-fg">{action}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function MiniKpi({ k, v, tone }: { k: string; v: string; tone: "profit" | "loss" | "neutral" }) {
  const color = tone === "profit" ? "text-profit" : tone === "loss" ? "text-loss" : "text-fg";
  return (
    <div className="rounded-xl border border-edge bg-panel p-3">
      <p className="text-[11px] text-faint">{k}</p>
      <p className={`mt-2 font-mono text-lg font-semibold nums ${color}`}>{v}</p>
    </div>
  );
}

function SiteFooter() {
  return (
    <footer className="relative border-t border-edge">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-5 py-10 text-sm text-muted sm:flex-row sm:items-center sm:justify-between sm:px-8">
        <Logo />
        <p className="font-mono text-xs text-faint">Built in Bucharest · {new Date().getFullYear()}</p>
        <div className="flex items-center gap-6">
          <a href="#product" className="transition hover:text-fg">Product</a>
          <a href="#proof" className="transition hover:text-fg">Break-even</a>
          <Link href={`${appBaseUrl}/login`} className="transition hover:text-fg">Log in</Link>
        </div>
      </div>
    </footer>
  );
}
