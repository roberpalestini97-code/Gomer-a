import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthShell } from "@/components/auth-shell";
import { SignupForm } from "./signup-form";

export const metadata: Metadata = { title: "Crear cuenta" };

export default function SignupPage() {
  return (
    <AuthShell title="Crear cuenta" subtitle="Da de alta tu taller en un minuto.">
      <Suspense>
        <SignupForm />
      </Suspense>
    </AuthShell>
  );
}
