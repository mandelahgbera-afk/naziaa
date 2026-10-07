"use client";

import { createContext, useContext } from "react";
import { mergeCopy, type Copy } from "@/lib/content";

/* Website text for interactive (client) components. Server components call getCopy(). */
const CopyContext = createContext<Copy>(mergeCopy(null));

export function CopyProvider({ value, children }: { value: Copy; children: React.ReactNode }) {
  return <CopyContext.Provider value={value}>{children}</CopyContext.Provider>;
}

export const useCopy = () => useContext(CopyContext);
