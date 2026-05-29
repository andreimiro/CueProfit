import Link from "next/link";

import { GoogleGlyph } from "@/components/google-glyph";
import { ThemeToggle } from "@/components/theme-toggle";

const appBaseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://app.captioncue.shop";

const features = [
  { n: "01", k: "PROFIT", t: "Profit by campaign & product", d: "True net profit after COGS, shipping, returns, fees and ad spend — not vanity ROAS." },
  { n: "02", k: "WASTE", t: "Wasted-spend radar", d: "Surface the products quietly burning budget with zero or negative return." },
  { n: "03", k: "POAS", t: "ROAS vs POAS", d: "See exactly where a “healthy” ROAS still loses money against its break-even." },
  { n: "04", k: "FEED", t: "Merchant feed health", d: "Disapprovals, missing GTINs and weak titles — caught before they cost you sales." },
  { n: "05", k: "SIGNAL", t: "Tracking health", d: "Conversion drops, value shifts and broken purchase tracking, flagged early." },
  { n: "06", k: "COPILOT", t: "AI action plans", d: "Ask why profit dropped and get a ranked plan of what to stop, fix and scale." },
];

const ticker = [
  "NET PROFIT", "POAS", "WASTED SPEND", "BREAK-EVEN ROAS",
  "FEED HEALTH", "TRACKING HEALTH", "PROJECTED INCREMENTAL PROFIT",
];

const bars = [38, 52, 30, 64, 47, 71, 58, 80, 44];

function Logo() {
  return (
    <Link href="/" className="group flex items-center gap-2.5">
      <span className="grid h-7 w-7 place-items-center rounded-md border border-profit/40 bg-profit/10 transition group-hover:bg-profit/20">
        <span className="h-2.5 w-2.5 rounded-full bg-profit shadow-[0_0_12px_2px] shadow-profit/60" />
      </span>
      <span className="font-display text-[15px] font-extrabold tracking-tight">
        Cue<span className="text-profit">Profit</span>
      </span>
    </Link>
  );
}

export default function Home() {
  return (
    <main className="relative min-h-screen overflow-x-clip">
      <div className="pointer-events-none absolute inset-0 bg-ambient" aria-hidden />
      <div className="pointer-events-none absolute inset-0 grain" aria-hidden />

      <div className="relative mx-auto max-w-6xl px-6">
        {/* nav */}
        <nav className="flex items-center justify-between py-6">
          <Logo />
          <div className="hidden items-center gap-8 text-sm text-muted md:flex">
            <a href="#features" className="transition hover:text-fg">Product</a>
            <a href="#thesis" className="transition hover:text-fg">Why profit</a>
            <Link href={`${appBaseUrl}/login`} className="transition hover:text-fg">Log in</Link>
          </div>
          <div className="flex items-center gap-2.5">
            <ThemeToggle />
            <Link
              href={`${appBaseUrl}/login`}
              className="flex items-center gap-2 rounded-lg border border-profit/30 bg-profit/10 px-4 py-2 text-sm font-semibold text-profit transition hover:bg-profit/20"
            >
              <GoogleGlyph size={15} />
              Connect Google Ads
            </Link>
          </div>
        </nav>

        {/* hero */}
        <section className="grid items-center gap-12 pt-10 pb-20 lg:grid-cols-[1.05fr_0.95fr] lg:pt-16">
          <div>
            <p className="animate-reveal mb-6 inline-flex items-center gap-2 rounded-full border border-edge bg-panel/60 px-3 py-1 font-mono text-[11px] uppercase tracking-[0.18em] text-muted" style={{ animationDelay: "40ms" }}>
              <span className="h-1.5 w-1.5 rounded-full bg-signal" />
              Profit intelligence · Google Ads
            </p>
            <h1 className="animate-reveal text-5xl font-extrabold sm:text-6xl" style={{ animationDelay: "120ms" }}>
              Your ROAS<br />is lying.
              <span className="mt-2 block text-muted">
                See the profit <span className="text-profit caret">underneath</span>
              </span>
            </h1>
            <p className="animate-reveal mt-7 max-w-md text-lg leading-relaxed text-muted" style={{ animationDelay: "220ms" }}>
              Connect Google Ads, Merchant Center and your product costs to see true
              campaign and product profit, wasted spend, and the AI-recommended next move.
            </p>
            <div className="animate-reveal mt-9 flex flex-wrap items-center gap-3" style={{ animationDelay: "320ms" }}>
              <Link
                href={`${appBaseUrl}/login`}
                className="rounded-lg bg-profit px-6 py-3 font-semibold text-on-profit shadow-lg shadow-profit/30 transition hover:bg-profit-strong"
              >
                Start free
              </Link>
              <Link
                href={`${appBaseUrl}/dashboard`}
                className="rounded-lg border border-edge px-6 py-3 font-medium text-muted transition hover:border-profit/40 hover:text-fg"
              >
                Go to dashboard
              </Link>
            </div>
            <p className="animate-reveal mt-6 font-mono text-xs text-faint" style={{ animationDelay: "420ms" }}>
              ./no card required · connect in 2 minutes
            </p>
          </div>

          {/* command-center panel */}
          <div className="animate-reveal" style={{ animationDelay: "260ms" }}>
            <div className="overflow-hidden rounded-2xl border border-edge bg-panel/80 shadow-[0_30px_80px_-30px_rgba(0,0,0,0.55)] backdrop-blur">
              <div className="flex items-center gap-2 border-b border-edge bg-panel-2 px-4 py-3">
                <span className="h-2.5 w-2.5 rounded-full bg-loss/70" />
                <span className="h-2.5 w-2.5 rounded-full bg-amber/70" />
                <span className="h-2.5 w-2.5 rounded-full bg-profit/70" />
                <span className="ml-3 font-mono text-xs text-muted">command-center · last 7 days</span>
              </div>
              <div className="space-y-3 p-5">
                <Metric label="NET PROFIT" value="+12,480 RON" tone="profit" trend="▲ 18%" />
                <Metric label="POAS" value="2.94" tone="profit" trend="▲ 0.3" />
                <Metric label="WASTED SPEND" value="−740 RON" tone="loss" trend="34 products" />

                <div className="rounded-xl border border-edge bg-panel-2/60 p-4">
                  <div className="mb-3 flex items-center justify-between font-mono text-[11px] text-muted">
                    <span>DAILY NET PROFIT</span>
                    <span className="text-profit">+RON</span>
                  </div>
                  <div className="flex h-20 items-end gap-1.5">
                    {bars.map((h, i) => (
                      <div
                        key={i}
                        className={`animate-bar flex-1 rounded-sm ${i === 2 ? "bg-loss/70" : "bg-profit/70"}`}
                        style={{ height: `${h}%`, animationDelay: `${500 + i * 70}ms` }}
                      />
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-3 rounded-xl border border-loss/30 bg-loss/5 px-4 py-3 font-mono text-xs">
                  <span className="text-loss">⚠</span>
                  <span className="text-muted">
                    ROAS <span className="text-profit">3.0 ✓</span> · break-even{" "}
                    <span className="text-loss">3.75 ✗</span> — losing money
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* ticker */}
      <div className="relative border-y border-edge bg-panel/40 py-3">
        <div className="flex w-max animate-ticker gap-10 font-mono text-xs uppercase tracking-[0.2em] text-faint">
          {[...ticker, ...ticker].map((t, i) => (
            <span key={i} className="flex items-center gap-10">
              {t}
              <span className="text-profit/50">◆</span>
            </span>
          ))}
        </div>
      </div>

      {/* features */}
      <section id="features" className="relative mx-auto max-w-6xl px-6 py-24">
        <div className="mb-14 max-w-xl">
          <p className="mb-3 font-mono text-xs uppercase tracking-[0.2em] text-profit">What you get</p>
          <h2 className="text-3xl font-bold sm:text-4xl">
            Every metric, rebuilt around the only number that matters.
          </h2>
        </div>
        <div className="grid gap-px overflow-hidden rounded-2xl border border-edge bg-edge sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <div key={f.n} className="group bg-panel p-7 transition hover:bg-panel-2">
              <div className="mb-5 flex items-center justify-between font-mono text-xs text-faint">
                <span>{f.n}</span>
                <span className="text-profit/70">{f.k}</span>
              </div>
              <h3 className="text-lg font-semibold text-fg">{f.t}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{f.d}</p>
              <span className="mt-5 inline-block h-px w-8 bg-profit/40 transition-all group-hover:w-16" />
            </div>
          ))}
        </div>
      </section>

      {/* thesis */}
      <section id="thesis" className="relative border-y border-edge bg-panel/40">
        <div className="relative mx-auto max-w-5xl px-6 py-24 text-center">
          <p className="mb-5 font-mono text-xs uppercase tracking-[0.2em] text-muted">The thesis</p>
          <h2 className="mx-auto max-w-3xl text-4xl font-bold sm:text-5xl">
            A <span className="text-profit">3.0 ROAS</span> can still
            <br className="hidden sm:block" /> lose you money.
          </h2>
          <div className="mx-auto mt-10 max-w-md rounded-2xl border border-edge bg-canvas/70 p-6 text-left font-mono text-sm nums">
            <Line k="conversion value" v="300.00" />
            <Line k="− product cost (22 ea ×10)" v="220.00" tone="loss" />
            <Line k="= gross profit" v="80.00" tone="profit" />
            <Line k="− ad spend" v="100.00" tone="loss" />
            <div className="my-3 border-t border-edge" />
            <Line k="net profit" v="−20.00" tone="loss" big />
            <p className="mt-4 text-xs text-faint">
              break-even ROAS for this product is <span className="text-loss">3.75</span>,
              not 3.0. CueProfit shows you this for every product.
            </p>
          </div>
        </div>
      </section>

      {/* cta */}
      <section className="relative mx-auto max-w-6xl px-6 py-28 text-center">
        <h2 className="mx-auto max-w-2xl text-4xl font-bold sm:text-5xl">See your real profit.</h2>
        <p className="mx-auto mt-5 max-w-md text-lg text-muted">
          Stop optimizing for ROAS. Start optimizing for profit.
        </p>
        <Link
          href={`${appBaseUrl}/login`}
          className="mt-9 inline-block rounded-lg bg-profit px-8 py-3.5 font-semibold text-on-profit shadow-lg shadow-profit/30 transition hover:bg-profit-strong"
        >
          Connect Google Ads
        </Link>
      </section>

      {/* footer */}
      <footer className="relative border-t border-edge">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 py-10 text-sm text-faint sm:flex-row">
          <Logo />
          <p className="font-mono text-xs">© {new Date().getFullYear()} CueProfit · built in Bucharest</p>
          <div className="flex items-center gap-6">
            <Link href={`${appBaseUrl}/login`} className="transition hover:text-fg">Log in</Link>
            <a href="#features" className="transition hover:text-fg">Product</a>
            <ThemeToggle />
          </div>
        </div>
      </footer>
    </main>
  );
}

function Metric({ label, value, tone, trend }: { label: string; value: string; tone: "profit" | "loss"; trend: string }) {
  const color = tone === "profit" ? "text-profit" : "text-loss";
  return (
    <div className="flex items-center justify-between rounded-xl border border-edge bg-panel-2/60 px-4 py-3">
      <span className="font-mono text-[11px] uppercase tracking-wider text-muted">{label}</span>
      <span className="flex items-baseline gap-3">
        <span className={`font-mono text-lg font-semibold nums ${color}`}>{value}</span>
        <span className="font-mono text-[11px] text-faint">{trend}</span>
      </span>
    </div>
  );
}

function Line({ k, v, tone, big }: { k: string; v: string; tone?: "profit" | "loss"; big?: boolean }) {
  const color = tone === "profit" ? "text-profit" : tone === "loss" ? "text-loss" : "text-muted";
  return (
    <div className="flex items-center justify-between py-1">
      <span className={`text-faint ${big ? "font-semibold text-fg" : ""}`}>{k}</span>
      <span className={`${color} ${big ? "text-base font-bold" : ""}`}>{v}</span>
    </div>
  );
}
