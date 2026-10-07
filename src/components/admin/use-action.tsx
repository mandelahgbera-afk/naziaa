"use client";

import { AnimatePresence, motion } from "motion/react";
import { useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useState, useTransition } from "react";

type R = { ok: true; message?: string } | { ok: false; error: string };
type Toast = { id: number; text: string; tone: "good" | "bad" };

export const ToastCtx = createContext<(t: Omit<Toast, "id">) => void>(() => {});

export function Toaster({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const push = useCallback((t: Omit<Toast, "id">) => {
    const id = Date.now() + Math.random();
    setToasts((all) => [...all, { ...t, id }]);
    window.setTimeout(() => setToasts((all) => all.filter((x) => x.id !== id)), 4200);
  }, []);
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="pointer-events-none fixed inset-x-4 bottom-tabbar z-50 mb-3 space-y-2 lg:inset-x-auto lg:right-6 lg:bottom-6 lg:mb-0" aria-live="polite">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.p
              key={t.id}
              initial={{ opacity: 0, y: 16, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8 }}
              className={`rounded-2xl px-5 py-3 text-sm shadow-float ${t.tone === "good" ? "bg-dark text-paper" : "bg-[#7a2e12] text-paper"}`}
            >
              {t.text}
            </motion.p>
          ))}
        </AnimatePresence>
      </div>
    </ToastCtx.Provider>
  );
}

/** Runs a server action, shows its outcome as a toast and refreshes server data. */
export function useAction() {
  const toast = useContext(ToastCtx);
  const router = useRouter();
  const [pending, start] = useTransition();
  const run = useCallback(
    (fn: () => Promise<R>, okText?: string) =>
      new Promise<boolean>((resolve) =>
        start(async () => {
          const r = await fn();
          if (r.ok) {
            toast({ text: r.message ?? okText ?? "Done", tone: "good" });
            router.refresh();
          } else toast({ text: r.error, tone: "bad" });
          resolve(r.ok);
        }),
      ),
    [router, toast],
  );
  return { run, pending };
}

/** a toast without running an action — e.g. after an upload */
export const useToast = () => useContext(ToastCtx);
