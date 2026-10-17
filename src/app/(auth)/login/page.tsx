import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthShell } from "@/components/auth-shell";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Entrar" };

export default function LoginPage() {
  return (
    <AuthShell title="Entrar" subtitle="Accede al asistente de tu taller.">
      <Suspense>
        <LoginForm />
      </Suspense>
    </AuthShell>
  );
}
