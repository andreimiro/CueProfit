import type { Metadata } from "next";
import { Inter, JetBrains_Mono, Space_Grotesk } from "next/font/google";
import type { ReactNode } from "react";

import { Providers } from "@/components/providers";
import "./globals.css";

// Display — confident, slightly technical grotesk for headlines & big numbers.
const display = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-display-face",
  display: "swap",
});
// Body — Inter: the most legible, business-grade UI sans. Easy to read at any size.
const body = Inter({
  subsets: ["latin"],
  variable: "--font-body-face",
  display: "swap",
});
// Mono — reserved for tabular figures (money, ratios) so columns line up.
const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono-face",
  display: "swap",
});

export const metadata: Metadata = {
  title: "CueProfit — stop optimizing for ROAS. Start optimizing for profit.",
  description:
    "Profit intelligence for Google Ads & Merchant Center. See true campaign and product profit, wasted spend, feed and tracking issues, and AI-recommended next actions.",
};

// Runs before paint to set the theme class from storage/system — avoids a flash.
const themeInit = `(function(){try{var t=localStorage.getItem('theme');if(t!=='light'&&t!=='dark'){t=window.matchMedia('(prefers-color-scheme: light)').matches?'light':'dark';}document.documentElement.classList.add(t);document.documentElement.style.colorScheme=t;}catch(e){document.documentElement.classList.add('dark');}})();`;

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="en"
      className={`${display.variable} ${body.variable} ${mono.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInit }} />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
