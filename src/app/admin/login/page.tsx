import type { Metadata } from "next";
import { Suspense } from "react";
import { LoginForm } from "@/components/admin/login-form";

export const metadata: Metadata = { title: "Studio sign in", robots: { index: false } };

export default function AdminLogin() {
  return (
    <Suspense>
      <LoginForm area="admin" />
    </Suspense>
  );
}
