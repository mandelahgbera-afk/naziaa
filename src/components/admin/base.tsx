"use client";

import { createContext, useContext } from "react";

/* Client components learn the Studio's private base path from the server
   (through AdminShell), so it never has to be baked into public JavaScript. */
const AdminBase = createContext("/admin");

export const AdminBaseProvider = AdminBase.Provider;

export function useAdminHref() {
  const base = useContext(AdminBase);
  return (path = "") => `${base}${path}`;
}
