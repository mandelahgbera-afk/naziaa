"use client";

import { motion, useReducedMotion } from "motion/react";
import { useEffect } from "react";

/* Moving between pages: the next page settles in softly, like a page turning.
   Never on the first page of a visit (it arrives already painted, nothing waits for JavaScript),
   and not at all for anyone whose phone asks for less motion. Opacity only, so fixed and sticky
   pieces (the bag bar, the ritual player) are never shifted while it plays. */
let arrived = false;

export default function StoreTemplate({ children }: { children: React.ReactNode }) {
  const reduce = useReducedMotion();
  const soft = arrived && !reduce;
  useEffect(() => {
    arrived = true;
  }, []);
  return (
    <motion.div initial={soft ? { opacity: 0 } : false} animate={{ opacity: 1 }} transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}>
      {children}
    </motion.div>
  );
}
