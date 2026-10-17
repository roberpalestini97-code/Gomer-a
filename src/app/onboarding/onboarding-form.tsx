"use client";

import { useActionState } from "react";
import { createWorkshop } from "@/app/actions/workshop";
import { FormMessage } from "@/components/auth-shell";

export function OnboardingForm({ defaultName }: { defaultName: string }) {
  const [state, action, pending] = useActionState(createWorkshop, undefined);
  return (
    <form action={action} className="space-y-4">
      <div>
        <label htmlFor="name" className="label">
          Nombre del taller
        </label>
        <input id="name" name="name" defaultValue={defaultName} required minLength={2} maxLength={80} className="input" />
      </div>
      <FormMessage error={state?.error} />
      <button type="submit" disabled={pending} className="btn-primary w-full py-3 text-base">
        {pending ? "Creando…" : "Crear taller"}
      </button>
    </form>
  );
}
