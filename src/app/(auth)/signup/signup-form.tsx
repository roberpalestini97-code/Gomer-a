"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { FormMessage } from "@/components/auth-shell";
import { createClient } from "@/lib/supabase/client";
import { safeNext } from "@/lib/safe-next";

export function SignupForm() {
  const router = useRouter();
  const params = useSearchParams();
  const rawNext = params.get("next");
  // Si viene de una invitación no crea taller propio.
  const fromInvite = Boolean(rawNext?.startsWith("/invite/"));
  const next = safeNext(rawNext, "/onboarding");
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(null);
    const form = new FormData(e.currentTarget);
    const workshopName = String(form.get("workshop") ?? "").trim();
    const supabase = createClient();
    const { data, error } = await supabase.auth.signUp({
      email: String(form.get("email")),
      password: String(form.get("password")),
      options: {
        data: workshopName ? { workshop_name: workshopName } : undefined,
        emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });
    if (error) {
      setPending(false);
      setError(
        error.message.toLowerCase().includes("already")
          ? "Ya existe una cuenta con ese email. Entra con tu contraseña."
          : "No se pudo crear la cuenta. Revisa los datos (contraseña mínima de 8 caracteres).",
      );
      return;
    }
    if (!data.session) {
      // Confirmación por email activada en Supabase.
      setSent(true);
      setPending(false);
      return;
    }
    if (!fromInvite && workshopName) {
      const { error: wsError } = await supabase.rpc("create_workshop", { p_name: workshopName });
      if (wsError) {
        router.replace("/onboarding");
        return;
      }
      router.replace("/app/catalogo?nuevo=1");
    } else {
      router.replace(next);
    }
    router.refresh();
  }

  if (sent) {
    return (
      <FormMessage ok="Te hemos enviado un email de confirmación. Ábrelo desde este dispositivo para terminar el alta." />
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {!fromInvite && (
        <div>
          <label htmlFor="workshop" className="label">
            Nombre del taller
          </label>
          <input id="workshop" name="workshop" required minLength={2} maxLength={80} className="input" placeholder="Talleres Paco" />
        </div>
      )}
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
          autoComplete="new-password"
          required
          minLength={8}
          className="input"
        />
      </div>
      <FormMessage error={error} />
      <button type="submit" disabled={pending} className="btn-primary w-full py-3 text-base">
        {pending ? "Creando…" : fromInvite ? "Crear cuenta y unirme" : "Crear taller"}
      </button>
      <p className="text-center text-sm text-ink-soft">
        ¿Ya tienes cuenta?{" "}
        <Link href={`/login${rawNext ? `?next=${encodeURIComponent(next)}` : ""}`} className="font-semibold text-ink underline">
          Entra
        </Link>
      </p>
    </form>
  );
}
