"use client";

import { motion } from "motion/react";
import type { SVGProps } from "react";

/* Nazia's own icon set: 1.25 stroke, round caps, slightly organic curves.
   Every icon inherits currentColor so it sits in any surface. */

type P = SVGProps<SVGSVGElement> & { size?: number };

const base = (size = 22) => ({
  width: size,
  height: size,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.25,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
});

export const SearchIcon = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <circle cx="10.5" cy="10.5" r="6.25" />
    <path d="M15.2 15.2 20 20" />
    <path d="M8 8.6c.6-.9 1.6-1.4 2.6-1.4" opacity=".6" />
  </svg>
);

export const UserIcon = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <circle cx="12" cy="8.2" r="3.7" />
    <path d="M4.8 20c.9-3.6 3.8-5.6 7.2-5.6s6.3 2 7.2 5.6" />
  </svg>
);

export const HeartIcon = ({ size, filled, ...p }: P & { filled?: boolean }) => (
  <svg {...base(size)} {...p}>
    <path
      d="M12 19.5s-7.2-4.3-7.2-9.6A4 4 0 0 1 12 7.6a4 4 0 0 1 7.2 2.3c0 5.3-7.2 9.6-7.2 9.6Z"
      fill={filled ? "currentColor" : "none"}
    />
  </svg>
);

export const CloseIcon = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <path d="M6 6l12 12M18 6 6 18" />
  </svg>
);

export const PlusIcon = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <path d="M12 5.5v13M5.5 12h13" />
  </svg>
);

export const MinusIcon = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <path d="M5.5 12h13" />
  </svg>
);

export const ArrowIcon = ({ size, ...p }: P) => (
  <svg {...base(size)} viewBox="0 0 32 24" width={(size ?? 22) * 1.33} {...p}>
    <path d="M2 12h27M22 5l7 7-7 7" />
  </svg>
);

export const ArrowUpRightIcon = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <path d="M7 17 17 7M9 7h8v8" />
  </svg>
);

export const MenuIcon = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <path d="M3.5 8.5h17M3.5 15.5h11" />
  </svg>
);

export const LeafIcon = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <path d="M5 19c0-8 5-13.5 14-14-.4 9-6 14-14 14Z" />
    <path d="M5 19 13 11" />
  </svg>
);

export const DropIcon = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <path d="M12 3.5s6 6.4 6 10.6a6 6 0 0 1-12 0C6 9.9 12 3.5 12 3.5Z" />
    <path d="M9.2 14.6a2.9 2.9 0 0 0 2.4 2.6" opacity=".6" />
  </svg>
);

export const CheckIcon = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <path d="m5 12.5 4.5 4.5L19 7.5" />
  </svg>
);

export const ChatIcon = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <path d="M4.5 19.5 5.6 16A7.8 7.8 0 1 1 8.4 18.6Z" />
    <path d="M9.3 9.4c.2 2.7 2.6 5.1 5.3 5.3l1-1.3-1.8-.9-.8.8c-1-.4-1.8-1.2-2.2-2.2l.8-.8-.9-1.8Z" />
  </svg>
);

export const RiderIcon = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <circle cx="6" cy="17" r="2.6" />
    <circle cx="18" cy="17" r="2.6" />
    <path d="M8.6 17h6.6l2.2-6H13l-2 4H6.5" />
    <path d="M15 7.5h2.5l1.5 3.5" />
  </svg>
);

export const BreathIcon = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <path d="M3 9.5c3 0 3-2.5 6-2.5s3 2.5 6 2.5 3-2.5 6-2.5" />
    <path d="M3 14.5c3 0 3-2.5 6-2.5s3 2.5 6 2.5 3-2.5 6-2.5" opacity=".7" />
    <path d="M6 19.5c2 0 2-1.5 4-1.5s2 1.5 4 1.5" opacity=".45" />
  </svg>
);

export const RootIcon = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <path d="M12 3v9" />
    <path d="M12 12c0 3-3 3.5-4.5 6.5M12 12c0 3 3 3.5 4.5 6.5M12 13.5v7" />
    <path d="M12 6c-2.2-1.6-4.6-1.2-5.6.4 2 .9 4 .7 5.6-.4Zm0 0c2.2-1.6 4.6-1.2 5.6.4-2 .9-4 .7-5.6-.4Z" />
  </svg>
);

export const HandsIcon = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <path d="M7 20v-4.5L4.4 11a1.3 1.3 0 0 1 2.2-1.3L9 13V5.5a1.3 1.3 0 0 1 2.6 0V11" />
    <path d="M17 20v-4.5l2.6-4.5a1.3 1.3 0 0 0-2.2-1.3L15 13V5.5a1.3 1.3 0 0 0-2.6 0" />
  </svg>
);

/** Shopping bag that fills with amber oil as the bag fills. level: 0..1 */
export function BagIcon({ size = 22, level = 0, ...p }: P & { level?: number }) {
  const clamped = Math.max(0, Math.min(1, level));
  const top = 9;
  const bottom = 20.2;
  const y = bottom - (bottom - top) * clamped;
  return (
    <svg {...base(size)} {...p}>
      <defs>
        <clipPath id="bag-body">
          <path d="M5.2 9h13.6l-.9 10a1.4 1.4 0 0 1-1.4 1.2H7.5A1.4 1.4 0 0 1 6.1 19Z" />
        </clipPath>
      </defs>
      <g clipPath="url(#bag-body)">
        <motion.path
          initial={false}
          animate={{ y }}
          transition={{ type: "spring", stiffness: 90, damping: 14 }}
          d="M2 0c2.5-1.2 5-1.2 7.5 0s5 1.2 7.5 0 5-1.2 7.5 0V14H2Z"
          fill="var(--color-honey)"
          stroke="none"
          opacity={0.85}
        />
      </g>
      <path d="M5.2 9h13.6l-.9 10a1.4 1.4 0 0 1-1.4 1.2H7.5A1.4 1.4 0 0 1 6.1 19Z" />
      <path d="M9 9V7.2a3 3 0 0 1 6 0V9" />
    </svg>
  );
}
