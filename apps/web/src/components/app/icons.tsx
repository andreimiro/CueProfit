/** Lightweight, consistent line-icon set (24×24, 1.7 stroke). Server-safe. */
import type { SVGProps } from "react";

function Svg({ children, ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg
      width={20}
      height={20}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      {...props}
    >
      {children}
    </svg>
  );
}

export type IconProps = SVGProps<SVGSVGElement>;
export type IconName = keyof typeof Icons;

export const Icons = {
  overview: (p: IconProps) => (
    <Svg {...p}>
      <rect x="3" y="3" width="7.5" height="9" rx="1.5" />
      <rect x="13.5" y="3" width="7.5" height="5.5" rx="1.5" />
      <rect x="13.5" y="12" width="7.5" height="9" rx="1.5" />
      <rect x="3" y="15.5" width="7.5" height="5.5" rx="1.5" />
    </Svg>
  ),
  campaigns: (p: IconProps) => (
    <Svg {...p}>
      <path d="M3 11v2a1 1 0 0 0 1 1h2l3.5 3.2a.6.6 0 0 0 1-.45V7.25a.6.6 0 0 0-1-.45L6 10H4a1 1 0 0 0-1 1Z" />
      <path d="M14 8.5a4 4 0 0 1 0 7" />
      <path d="M9.5 18.5 11 22" />
    </Svg>
  ),
  products: (p: IconProps) => (
    <Svg {...p}>
      <path d="M12 3 4 7v10l8 4 8-4V7l-8-4Z" />
      <path d="m4 7 8 4 8-4" />
      <path d="M12 21V11" />
    </Svg>
  ),
  feed: (p: IconProps) => (
    <Svg {...p}>
      <path d="M3 12h4l2.5 6 4-13L17 12h4" />
    </Svg>
  ),
  recommendations: (p: IconProps) => (
    <Svg {...p}>
      <path d="M12 3v1.5M12 19.5V21M4.2 6.2l1 1M18.8 6.2l-1 1M3 12h1.5M19.5 12H21" />
      <path d="M9 16.5a4.5 4.5 0 1 1 6 0c-.6.5-1 1-1 2v.5H10v-.5c0-1-.4-1.5-1-2Z" />
      <path d="M10 21h4" />
    </Svg>
  ),
  settings: (p: IconProps) => (
    <Svg {...p}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 13a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-2.7 1.1V21a2 2 0 1 1-4 0v-.1A1.6 1.6 0 0 0 7 19.4l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1A1.6 1.6 0 0 0 3 13a2 2 0 1 1 0-4h.1A1.6 1.6 0 0 0 4.6 6.4l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1A1.6 1.6 0 0 0 11 3V3a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 2.7 1.1l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8 1.6 1.6 0 0 0 1.5 1H22a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1Z" />
    </Svg>
  ),
  search: (p: IconProps) => (
    <Svg {...p}>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.2-3.2" />
    </Svg>
  ),
  calendar: (p: IconProps) => (
    <Svg {...p}>
      <rect x="3.5" y="4.5" width="17" height="16" rx="2.5" />
      <path d="M3.5 9.5h17M8 3v3M16 3v3" />
    </Svg>
  ),
  chevronDown: (p: IconProps) => (
    <Svg {...p}>
      <path d="m6 9 6 6 6-6" />
    </Svg>
  ),
  chevronRight: (p: IconProps) => (
    <Svg {...p}>
      <path d="m9 6 6 6-6 6" />
    </Svg>
  ),
  trendUp: (p: IconProps) => (
    <Svg {...p}>
      <path d="M4 17 10 11l3 3 7-7" />
      <path d="M15 7h5v5" />
    </Svg>
  ),
  trendDown: (p: IconProps) => (
    <Svg {...p}>
      <path d="M4 7 10 13l3-3 7 7" />
      <path d="M15 17h5v-5" />
    </Svg>
  ),
  plus: (p: IconProps) => (
    <Svg {...p}>
      <path d="M12 5v14M5 12h14" />
    </Svg>
  ),
  check: (p: IconProps) => (
    <Svg {...p}>
      <path d="m5 12 4.5 4.5L19 7" />
    </Svg>
  ),
  spark: (p: IconProps) => (
    <Svg {...p}>
      <path d="M12 3v6M12 15v6M3 12h6M15 12h6" />
      <path d="m6.5 6.5 3 3M14.5 14.5l3 3M17.5 6.5l-3 3M9.5 14.5l-3 3" />
    </Svg>
  ),
  alert: (p: IconProps) => (
    <Svg {...p}>
      <path d="M12 9v4M12 17h.01" />
      <path d="M10.3 3.9 2.4 18a2 2 0 0 0 1.7 3h15.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
    </Svg>
  ),
  link: (p: IconProps) => (
    <Svg {...p}>
      <path d="M9 15 15 9" />
      <path d="M11 6.5 12.6 5a4 4 0 0 1 5.7 5.7l-1.6 1.5" />
      <path d="M13 17.5 11.4 19a4 4 0 0 1-5.7-5.7l1.6-1.5" />
    </Svg>
  ),
};

export function Icon({ name, ...props }: { name: IconName } & IconProps) {
  const Cmp = Icons[name];
  return <Cmp {...props} />;
}
