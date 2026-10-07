"use client";

import { AnimatePresence, motion, useDragControls, type PanInfo } from "motion/react";
import { useEffect, useRef } from "react";
import { useIsMobile } from "@/lib/use-media";

/* Native-feeling bottom sheet: slides up, drag the handle (or anywhere on the
   header) down to dismiss, backdrop tap or Escape closes. Focus is trapped
   while open and returned on close. */
export function BottomSheet({
  open,
  onClose,
  title,
  children,
  footer,
  tone = "light",
  maxHeight = "88dvh",
  desktop = "sheet",
}: {
  open: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  tone?: "light" | "dark";
  maxHeight?: string;
  /** on larger screens: keep the bottom sheet, or slide in from the right as a side panel */
  desktop?: "sheet" | "panel";
}) {
  const panel = useRef<HTMLDivElement>(null);
  const drag = useDragControls();
  const mobile = useIsMobile();
  const side = desktop === "panel" && !mobile;

  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    const html = document.documentElement;
    const overflow = html.style.overflow;
    html.style.overflow = "hidden";
    panel.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "Tab" && panel.current) {
        const f = panel.current.querySelectorAll<HTMLElement>('a,button,input,textarea,select,[tabindex]:not([tabindex="-1"])');
        if (!f.length) return;
        if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
        else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      html.style.overflow = overflow;
      window.removeEventListener("keydown", onKey);
      prev?.focus();
    };
  }, [open, onClose]);

  const onDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.y > 110 || info.velocity.y > 600) onClose();
  };

  const dark = tone === "dark";

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[55]">
          <motion.div
            className="absolute inset-0 bg-darker/45 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            ref={panel}
            role="dialog"
            aria-modal="true"
            aria-label={typeof title === "string" ? title : undefined}
            tabIndex={-1}
            data-lenis-prevent
            drag={side ? false : "y"}
            dragControls={drag}
            dragListener={false}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0.05, bottom: 0.6 }}
            onDragEnd={onDragEnd}
            initial={side ? { x: "100%" } : { y: "100%" }}
            animate={side ? { x: 0 } : { y: 0 }}
            exit={side ? { x: "100%" } : { y: "100%" }}
            transition={{ type: "spring", stiffness: 380, damping: 38 }}
            className={`absolute flex flex-col outline-none ${side ? "inset-y-0 right-0 w-full max-w-[500px] rounded-l-[28px] shadow-float" : "inset-x-0 bottom-0 rounded-t-[28px] shadow-[0_-20px_60px_-20px_rgba(31,21,17,.45)]"} ${dark ? "bg-darker text-paper" : "bg-paper text-ink"}`}
            style={side ? undefined : { maxHeight }}
          >
            {side ? (
              <div className="flex items-start justify-between gap-4 px-7 pt-7 pb-3">
                <div>{title}</div>
                <button type="button" onClick={onClose} aria-label="Close" className="rounded-full p-2 text-muted transition hover:bg-cream-deep hover:text-ink">✕</button>
              </div>
            ) : (
              <div className="cursor-grab touch-none px-5 pt-3 pb-2 active:cursor-grabbing" onPointerDown={(e) => drag.start(e)}>
                <div className={`mx-auto h-1.5 w-11 rounded-full ${dark ? "bg-paper/25" : "bg-ink/15"}`} />
                {title && <div className="mt-4">{title}</div>}
              </div>
            )}
            <div className={`min-h-0 flex-1 overflow-y-auto overscroll-contain ${side ? "px-7" : "px-5"}`}>{children}</div>
            {footer && <div className={`border-t ${side ? "px-7" : "px-5"} pt-4 pb-[calc(1rem+env(safe-area-inset-bottom))] ${dark ? "border-paper/10" : "border-line"}`}>{footer}</div>}
            {!footer && <div className="pb-[calc(1rem+env(safe-area-inset-bottom))]" />}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
