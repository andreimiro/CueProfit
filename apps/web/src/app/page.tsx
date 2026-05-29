import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center gap-8 px-6">
      <div>
        <p className="mb-3 text-sm font-medium uppercase tracking-widest text-emerald-400">
          CueProfit
        </p>
        <h1 className="text-4xl font-semibold leading-tight sm:text-5xl">
          Stop optimizing for ROAS.
          <br />
          Start optimizing for profit.
        </h1>
        <p className="mt-5 max-w-xl text-lg text-neutral-400">
          Connect Google Ads, Merchant Center, and your product costs to see true
          campaign and product profit, wasted spend, feed and tracking issues, and
          AI-recommended next actions.
        </p>
      </div>
      <div className="flex gap-4">
        <Link
          href="/login"
          className="rounded-lg bg-emerald-500 px-5 py-3 font-medium text-black transition hover:bg-emerald-400"
        >
          Get started
        </Link>
        <Link
          href="/dashboard"
          className="rounded-lg border border-neutral-700 px-5 py-3 font-medium text-neutral-200 transition hover:border-neutral-500"
        >
          Go to dashboard
        </Link>
      </div>
    </main>
  );
}
