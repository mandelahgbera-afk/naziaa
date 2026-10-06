"use client";

import { motion, useScroll, useTransform, useReducedMotion, type MotionValue } from "motion/react";
import { useRef, type ReactNode } from "react";

const silk = [0.22, 1, 0.36, 1] as const;

/** Fade + lift into view, once. */
export function Reveal({
  children,
  delay = 0,
  y = 28,
  className,
  as = "div",
}: {
  children: ReactNode;
  delay?: number;
  y?: number;
  className?: string;
  as?: "div" | "li" | "section" | "article" | "p";
}) {
  const reduce = useReducedMotion();
  const M = motion[as];
  return (
    <M
      className={className}
      initial={reduce ? false : { opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-12% 0px" }}
      transition={{ duration: 1.1, ease: silk, delay }}
    >
      {children}
    </M>
  );
}

/** Headline words rise out of a mask, one after another. */
export function RiseWords({
  text,
  className,
  delay = 0,
  stagger = 0.07,
  italic = [],
  immediate = false,
}: {
  text: string;
  className?: string;
  delay?: number;
  stagger?: number;
  /** words (exact match) set in italic for the serif accent */
  italic?: string[];
  /** animate on mount instead of on scroll-into-view */
  immediate?: boolean;
}) {
  const reduce = useReducedMotion();
  const words = text.split(" ");
  const trigger = immediate ? { animate: "show" } : { whileInView: "show", viewport: { once: true, margin: "-10% 0px" } };
  return (
    <motion.span className={className} initial={reduce ? false : "hide"} {...trigger} aria-label={text} role="text">
      {words.map((w, i) => (
        <span key={i} aria-hidden className="inline-block overflow-hidden pb-[0.12em] align-bottom">
          <motion.span
            className={`inline-block ${italic.includes(w.replace(/[.,]/g, "")) ? "italic" : ""}`}
            variants={{ hide: { y: "110%", rotate: 4 }, show: { y: "0%", rotate: 0 } }}
            transition={{ duration: 1.2, ease: silk, delay: delay + i * stagger }}
          >
            {w}
            {i < words.length - 1 ? " " : ""}
          </motion.span>
        </span>
      ))}
    </motion.span>
  );
}

function InkWord({ word, progress, range }: { word: string; progress: MotionValue<number>; range: [number, number] }) {
  const opacity = useTransform(progress, range, [0.16, 1]);
  return (
    <motion.span style={{ opacity }} className="transition-none">
      {word}{" "}
    </motion.span>
  );
}

/** A statement whose words fill with ink as it scrolls through the viewport. */
export function ScrollInk({ text, className }: { text: string; className?: string }) {
  const ref = useRef<HTMLParagraphElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 85%", "end 45%"] });
  const words = text.split(" ");
  if (reduce) return <p className={className}>{text}</p>;
  return (
    <p ref={ref} className={className} aria-label={text}>
      <span aria-hidden>
        {words.map((w, i) => (
          <InkWord key={i} word={w} progress={scrollYProgress} range={[i / words.length, (i + 1) / words.length]} />
        ))}
      </span>
    </p>
  );
}

/** Moves children on the y axis at a fraction of scroll speed. */
export function Parallax({ children, speed = 0.15, className }: { children: ReactNode; speed?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], [`${speed * 100}%`, `${-speed * 100}%`]);
  return (
    <motion.div ref={ref} className={className} style={reduce ? undefined : { y }}>
      {children}
    </motion.div>
  );
}
