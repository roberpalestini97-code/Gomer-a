"use client";

import { useActionState } from "react";
import { acceptInvite } from "@/app/actions/workshop";
import { FormMessage } from "@/components/auth-shell";

export function AcceptInviteForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState(acceptInvite, undefined);
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="token" value={token} />
      <FormMessage error={state?.error} />
      <button type="submit" disabled={pending} className="btn-primary w-full py-3 text-base">
        {pending ? "Uniéndote…" : "Aceptar invitación"}
      </button>
    </form>
  );
}
