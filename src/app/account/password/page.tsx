import type { Metadata } from "next";
import { PasswordReset } from "@/components/admin/password-reset";
import { adminHref } from "@/lib/admin-path";

export const metadata: Metadata = { title: "Set a new password", robots: { index: false } };

export default async function PasswordPage({ searchParams }: PageProps<"/account/password">) {
  const expired = (await searchParams).expired === "1";
  return <PasswordReset expired={expired} studio={adminHref()} />;
}
