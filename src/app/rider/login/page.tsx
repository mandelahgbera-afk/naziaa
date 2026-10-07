import type { Metadata } from "next";
import { Suspense } from "react";
import { LoginForm } from "@/components/admin/login-form";

export const metadata: Metadata = { title: "Rider sign in", robots: { index: false } };

export default function RiderLogin() {
  return (
    <Suspense>
      <LoginForm area="rider" home="/rider" />
    </Suspense>
  );
}
