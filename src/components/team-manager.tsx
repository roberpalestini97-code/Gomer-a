"use client";

import { useActionState, useState, useTransition } from "react";
import { createInvite, removeMember, revokeInvite } from "@/app/actions/team";
import { FormMessage } from "@/components/auth-shell";

interface Member {
  user_id: string;
  role: "owner" | "mechanic";
  email: string | null;
}
interface Invite {
  id: string;
  email: string;
  role: "owner" | "mechanic";
  token: string;
  expires_at: string;
}

const ROLE = { owner: "Dueño", mechanic: "Mecánico" } as const;

export function TeamManager({
  currentUserId,
  members,
  invites,
  origin,
}: {
  currentUserId: string;
  members: Member[];
  invites: Invite[];
  origin: string;
}) {
  const [state, action, pending] = useActionState(createInvite, undefined);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const link = (token: string) => `${origin}/invite/${token}`;

  async function copy(token: string) {
    try {
      await navigator.clipboard.writeText(link(token));
      setCopied(token);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      setError("No se pudo copiar. Mantén pulsado el enlace para copiarlo.");
    }
  }

  return (
    <div className="space-y-5">
      <h1 className="font-display text-3xl font-extrabold uppercase">Equipo</h1>

      <section className="space-y-2">
        <h2 className="label">Miembros</h2>
        <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
          {members.map((m) => (
            <li key={m.user_id} className="flex items-center gap-3 px-4 py-3">
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{m.email ?? "—"}</p>
                <p className="text-xs text-ink-soft">
                  {ROLE[m.role]}
                  {m.user_id === currentUserId && " · tú"}
                </p>
              </div>
              {m.user_id !== currentUserId && (
                <button
                  type="button"
                  className="btn-danger px-3 py-1.5 text-xs"
                  onClick={() => {
                    if (!confirm(`¿Quitar a ${m.email ?? "este miembro"} del taller?`)) return;
                    startTransition(async () => setError((await removeMember(m.user_id)).error ?? null));
                  }}
                >
                  Quitar
                </button>
              )}
            </li>
          ))}
        </ul>
      </section>

      {invites.length > 0 && (
        <section className="space-y-2">
          <h2 className="label">Invitaciones pendientes</h2>
          <ul className="space-y-2">
            {invites.map((i) => {
              const expired = new Date(i.expires_at) < new Date();
              return (
                <li key={i.id} className="card space-y-2 p-4">
                  <p className="font-semibold">
                    {i.email} <span className="text-sm font-normal text-ink-soft">· {ROLE[i.role]}</span>
                    {expired && <span className="ml-2 text-xs font-bold text-danger uppercase">caducada</span>}
                  </p>
                  <p className="font-mono text-xs break-all text-ink-soft">{link(i.token)}</p>
                  <div className="flex flex-wrap gap-2">
                    <button type="button" className="btn-ghost px-3 py-1.5 text-xs" onClick={() => copy(i.token)}>
                      {copied === i.token ? "¡Copiado!" : "Copiar enlace"}
                    </button>
                    <a
                      className="btn-ghost px-3 py-1.5 text-xs"
                      href={`https://wa.me/?text=${encodeURIComponent(`Únete al taller en Neumáticos IA: ${link(i.token)}`)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Enviar por WhatsApp
                    </a>
                    <button
                      type="button"
                      className="btn-danger px-3 py-1.5 text-xs"
                      onClick={() => startTransition(async () => setError((await revokeInvite(i.id)).error ?? null))}
                    >
                      Revocar
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <FormMessage error={error} />

      <form action={action} className="card space-y-3 p-4">
        <h2 className="font-display text-xl font-bold uppercase">Invitar</h2>
        <p className="text-sm text-ink-soft">Se genera un enlace válido 7 días para ese email.</p>
        <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
          <input name="email" type="email" required placeholder="mecanico@taller.com" aria-label="Email" className="input" />
          <select name="role" defaultValue="mechanic" aria-label="Rol" className="input">
            <option value="mechanic">Mecánico</option>
            <option value="owner">Dueño</option>
          </select>
        </div>
        <FormMessage error={state?.error} ok={state?.ok} />
        <button type="submit" disabled={pending} className="btn-primary w-full">
          {pending ? "Creando…" : "Crear invitación"}
        </button>
      </form>
    </div>
  );
}
