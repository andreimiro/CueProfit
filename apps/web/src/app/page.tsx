import Link from "next/link";

import { GoogleGlyph } from "@/components/google-glyph";
import { ThemeToggle } from "@/components/theme-toggle";

const appBaseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://app.captioncue.shop";

const features = [
  {
    n: "01",
    k: "Margin truth",
    d: "Blend ad spend, product cost, shipping, returns, and fees into one profit view.",
  },
  {
    n: "02",
    k: "Waste radar",
    d: "Spot products and campaigns that look healthy in ROAS but lose money after costs.",
  },
  {
    n: "03",
    k: "Feed pressure",
    d: "Catch Merchant Center issues, weak titles, and tracking breaks before spend drifts.",
  },
  {
    n: "04",
    k: "Next move",
    d: "Rank what to stop, fix, or scale with profit impact and confidence attached.",
  },
] as const;

const rows = [
  ["Shopping / hero sku set", "+8,420 RON", "3.12", "Scale"],
  ["PMax / outlet inventory", "-740 RON", "1.04", "Cap"],
  ["Search / brand defense", "+1,960 RON", "4.88", "Hold"],
  ["Shopping / low margin", "-310 RON", "0.82", "Pause"],
] as const;

const bars = [42, 56, 49, 68, 61, 74, 58, 84, 76, 92, 72, 88];

function Logo() {
  return (
    <Link href="/" className="group flex items-center gap-3">
      <span className="grid h-8 w-8 place-items-center rounded-[8px] border border-edge bg-fg text-canvas transition group-hover:border-profit">
        <span className="h-2.5 w-2.5 rounded-full bg-profit" />
      </span>
      <span className="font-display text-base font-semibold tracking-normal">
        Cue<span className="text-profit">Profit</span>
      </span>
    </Link>
  );
}

export default function Home() {
  return (
    <main className="relative min-h-screen overflow-x-clip bg-canvas">
      <div className="pointer-events-none absolute inset-0 bg-paper-grid" aria-hidden />
      <div className="pointer-events-none absolute inset-0 grain" aria-hidden />

      <div className="relative mx-auto max-w-7xl px-5 sm:px-8">
        <nav className="flex items-center justify-between py-5">
          <Logo />
          <div className="hidden items-center gap-8 text-sm text-muted md:flex">
            <a href="#product" className="transition hover:text-fg">Product</a>
            <a href="#proof" className="transition hover:text-fg">Proof</a>
            <Link href={`${appBaseUrl}/login`} className="transition hover:text-fg">Log in</Link>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Link
              href={`${appBaseUrl}/login`}
              className="inline-flex items-center gap-2 rounded-[8px] bg-profit px-4 py-2.5 text-sm font-semibold text-on-profit shadow-[0_18px_35px_-22px_var(--color-profit)] transition hover:bg-profit-strong"
            >
              <GoogleGlyph size={15} />
              Connect
            </Link>
          </div>
        </nav>

        <section className="grid min-h-[calc(100vh-76px)] items-center gap-12 pb-12 pt-8 lg:grid-cols-[0.82fr_1.18fr] lg:pb-16">
          <div className="max-w-xl">
            <p className="mb-7 inline-flex border-b border-profit pb-2 font-mono text-[11px] uppercase tracking-[0.18em] text-muted">
              Google Ads profit intelligence
            </p>
            <h1 className="max-w-[16ch] text-[clamp(3.8rem,7.3vw,7.2rem)] font-semibold leading-[0.88] tracking-normal">
              Profit before the play
            </h1>
            <p className="mt-8 max-w-md text-lg leading-7 text-muted">
              CueProfit turns ads, feed quality, and product costs into a clear operating
              view for ecommerce teams that care about margin, not vanity ROAS.
            </p>
            <div className="mt-10 flex flex-wrap items-center gap-3">
              <Link
                href={`${appBaseUrl}/login`}
                className="rounded-[8px] bg-fg px-6 py-3 text-sm font-semibold text-canvas transition hover:bg-profit hover:text-on-profit"
              >
                Start with Google Ads
              </Link>
              <Link
                href={`${appBaseUrl}/dashboard`}
                className="rounded-[8px] border border-edge bg-panel px-6 py-3 text-sm font-semibold text-fg transition hover:border-profit"
              >
                View dashboard
              </Link>
            </div>
          </div>

          <DashboardPreview />
        </section>
      </div>

      <section id="proof" className="relative border-y border-edge bg-panel">
        <div className="mx-auto grid max-w-7xl divide-y divide-edge px-5 sm:px-8 md:grid-cols-3 md:divide-x md:divide-y-0">
          <MetricStat value="+18.4%" label="incremental profit found in first audit" />
          <MetricStat value="34" label="waste pockets grouped by product margin" />
          <MetricStat value="3.75" label="break-even ROAS exposed for low-margin SKUs" />
        </div>
      </section>

      <section id="product" className="relative mx-auto max-w-7xl px-5 py-24 sm:px-8 lg:py-32">
        <div className="grid gap-10 lg:grid-cols-[0.95fr_1.05fr] lg:items-end">
          <div>
            <p className="mb-4 font-mono text-xs uppercase tracking-[0.18em] text-profit">Operating system</p>
            <h2 className="max-w-2xl text-4xl font-semibold sm:text-6xl">
              A calmer way to decide what deserves spend.
            </h2>
          </div>
          <p className="max-w-xl text-lg leading-8 text-muted lg:justify-self-end">
            The product is designed around a merchant's real constraints: margin,
            stock, feed health, and confidence. Every panel answers whether a move
            will create profit.
          </p>
        </div>

        <div className="mt-14 grid gap-px overflow-hidden rounded-[8px] border border-edge bg-edge md:grid-cols-2 lg:grid-cols-4">
          {features.map((feature) => (
            <article key={feature.n} className="min-h-64 bg-panel p-6 transition hover:bg-panel-2">
              <div className="flex items-center justify-between font-mono text-xs text-faint">
                <span>{feature.n}</span>
                <span>{feature.k}</span>
              </div>
              <p className="mt-24 text-base leading-6 text-muted">{feature.d}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="relative mx-auto grid max-w-7xl gap-8 px-5 pb-28 sm:px-8 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-[8px] border border-edge bg-fg p-6 text-canvas sm:p-8">
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-profit">Break-even model</p>
          <h2 className="mt-24 max-w-xl text-4xl font-semibold sm:text-6xl">
            A 3.0 ROAS can still be a loss.
          </h2>
        </div>
        <div className="rounded-[8px] border border-edge bg-panel p-6 sm:p-8">
          <Line k="conversion value" v="300.00 RON" />
          <Line k="product cost" v="-220.00 RON" tone="loss" />
          <Line k="gross profit" v="80.00 RON" tone="profit" />
          <Line k="ad spend" v="-100.00 RON" tone="loss" />
          <div className="my-5 border-t border-edge" />
          <Line k="net profit" v="-20.00 RON" tone="loss" big />
          <p className="mt-8 text-sm leading-6 text-muted">
            CueProfit calculates this for every campaign and product, then ranks the
            decisions by expected profit impact.
          </p>
        </div>
      </section>

      <footer className="relative border-t border-edge">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-5 py-8 text-sm text-muted sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <Logo />
          <p className="font-mono text-xs">Built in Bucharest · {new Date().getFullYear()}</p>
          <div className="flex items-center gap-6">
            <a href="#product" className="hover:text-fg">Product</a>
            <Link href={`${appBaseUrl}/login`} className="hover:text-fg">Log in</Link>
          </div>
        </div>
      </footer>
    </main>
  );
}

function DashboardPreview() {
  return (
    <div className="relative">
      <div className="absolute -left-6 top-12 hidden h-48 w-28 rounded-[8px] border border-edge bg-panel shadow-design md:block" />
      <div className="relative overflow-hidden rounded-[10px] border border-edge bg-panel shadow-design">
        <div className="flex items-center justify-between border-b border-edge bg-panel-2 px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-loss" />
            <span className="h-2.5 w-2.5 rounded-full bg-amber" />
            <span className="h-2.5 w-2.5 rounded-full bg-profit" />
          </div>
          <span className="font-mono text-xs text-faint">cueprofit / last 7 days</span>
        </div>
        <div className="grid min-h-[620px] md:grid-cols-[172px_1fr]">
          <aside className="hidden border-r border-edge bg-canvas/55 p-4 md:block">
            {["Overview", "Campaigns", "Products", "Feed", "Actions"].map((item, index) => (
              <div
                key={item}
                className={`mb-2 rounded-[8px] px-3 py-2 text-sm ${index === 0 ? "bg-fg text-canvas" : "text-muted"}`}
              >
                {item}
              </div>
            ))}
          </aside>
          <div className="p-4 sm:p-6">
            <div className="grid gap-3 sm:grid-cols-3">
              <MiniCard label="NET PROFIT" value="+12,480" tone="profit" />
              <MiniCard label="POAS" value="2.94" tone="profit" />
              <MiniCard label="WASTED" value="-740" tone="loss" />
            </div>

            <div className="mt-4 rounded-[8px] border border-edge bg-canvas p-5">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted">Profit curve</p>
                  <p className="mt-1 text-sm text-faint">Spend-weighted contribution by day</p>
                </div>
                <span className="rounded-full bg-profit/12 px-3 py-1 font-mono text-xs text-profit">+18%</span>
              </div>
              <div className="flex h-48 items-end gap-2">
                {bars.map((bar, index) => (
                  <span
                    key={index}
                    className={`flex-1 rounded-t-[5px] ${index === 2 || index === 7 ? "bg-loss/70" : "bg-profit/75"}`}
                    style={{ height: `${bar}%` }}
                  />
                ))}
              </div>
            </div>

            <div className="mt-4 overflow-hidden rounded-[8px] border border-edge bg-panel">
              {rows.map(([name, profit, poas, action]) => (
                <div key={name} className="grid grid-cols-[1.6fr_1fr_0.7fr_0.8fr] gap-3 border-b border-edge px-4 py-3 text-sm last:border-b-0">
                  <span className="truncate text-fg">{name}</span>
                  <span className={profit.startsWith("-") ? "text-loss" : "text-profit"}>{profit}</span>
                  <span className="text-muted">{poas}</span>
                  <span className="text-right font-medium text-fg">{action}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricStat({ value, label }: { value: string; label: string }) {
  return (
    <div className="py-10 md:px-10">
      <p className="font-display text-5xl font-semibold text-fg sm:text-6xl">{value}</p>
      <p className="mt-3 max-w-xs text-sm leading-6 text-muted">{label}</p>
    </div>
  );
}

function MiniCard({ label, value, tone }: { label: string; value: string; tone: "profit" | "loss" }) {
  return (
    <div className="rounded-[8px] border border-edge bg-panel p-4">
      <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-faint">{label}</p>
      <p className={`mt-5 font-mono text-2xl font-semibold nums ${tone === "profit" ? "text-profit" : "text-loss"}`}>
        {value}
      </p>
    </div>
  );
}

function Line({ k, v, tone, big }: { k: string; v: string; tone?: "profit" | "loss"; big?: boolean }) {
  const color = tone === "profit" ? "text-profit" : tone === "loss" ? "text-loss" : "text-muted";
  return (
    <div className={`flex items-center justify-between border-b border-edge py-4 last:border-b-0 ${big ? "text-lg" : "text-sm"}`}>
      <span className="text-muted">{k}</span>
      <span className={`font-mono font-semibold ${color}`}>{v}</span>
    </div>
  );
}
