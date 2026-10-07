import type { Metadata } from "next";
import { Suspense } from "react";
import { LoginForm } from "@/components/admin/login-form";
import { adminHref } from "@/lib/admin-path";

export const metadata: Metadata = { title: "Studio sign in", robots: { index: false } };

export default function AdminLogin() {
  return (
    <Suspense>
      <LoginForm area="admin" home={adminHref()} />
    </Suspense>
  );
}
