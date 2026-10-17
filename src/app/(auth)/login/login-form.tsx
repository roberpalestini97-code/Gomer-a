"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { FormMessage } from "@/components/auth-shell";
import { createClient } from "@/lib/supabase/client";
import { safeNext } from "@/lib/safe-next";

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = safeNext(params.get("next"));
  const [error, setError] = useState<string | null>(params.get("error") ? "El enlace no es válido o ha caducado." : null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(null);
    const form = new FormData(e.currentTarget);
    const { error } = await createClient().auth.signInWithPassword({
      email: String(form.get("email")),
      password: String(form.get("password")),
    });
    if (error) {
      setPending(false);
      setError(
        error.message.includes("Email not confirmed")
          ? "Confirma tu email antes de entrar (revisa tu bandeja de entrada)."
          : "Email o contraseña incorrectos.",
      );
      return;
    }
    router.replace(next);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label htmlFor="email" className="label">
          Email
        </label>
        <input id="email" name="email" type="email" autoComplete="email" required className="input" />
      </div>
      <div>
        <label htmlFor="password" className="label">
          Contraseña
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          minLength={8}
          className="input"
        />
      </div>
      <FormMessage error={error} />
      <button type="submit" disabled={pending} className="btn-primary w-full py-3 text-base">
        {pending ? "Entrando…" : "Entrar"}
      </button>
      <p className="text-center text-sm text-ink-soft">
        ¿Taller nuevo?{" "}
        <Link href={`/signup${next !== "/app" ? `?next=${encodeURIComponent(next)}` : ""}`} className="font-semibold text-ink underline">
          Crea una cuenta
        </Link>
      </p>
    </form>
  );
}
