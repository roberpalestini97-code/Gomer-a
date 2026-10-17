import type { Metadata } from "next";
import Link from "next/link";
import { AuthShell, FormMessage } from "@/components/auth-shell";
import { createClient } from "@/lib/supabase/server";
import { AcceptInviteForm } from "./accept-form";

export const metadata: Metadata = { title: "Invitación" };

interface InviteInfo {
  workshop_name: string;
  email: string;
  role: "owner" | "mechanic";
  expired: boolean;
  accepted: boolean;
}

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const supabase = await createClient();
  const valid = /^[a-f0-9]{48}$/.test(token);
  const { data } = valid ? await supabase.rpc("get_invite", { p_token: token }) : { data: null };
  const invite = (Array.isArray(data) ? data[0] : null) as InviteInfo | null;

  if (!invite) {
    return (
      <AuthShell title="Invitación">
        <FormMessage error="Esta invitación no existe. Pide un enlace nuevo al dueño del taller." />
      </AuthShell>
    );
  }
  if (invite.expired || invite.accepted) {
    return (
      <AuthShell title="Invitación">
        <FormMessage error={invite.accepted ? "Esta invitación ya se ha usado." : "Esta invitación ha caducado."} />
      </AuthShell>
    );
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const next = `/invite/${token}`;
  const roleLabel = invite.role === "owner" ? "dueño" : "mecánico";

  return (
    <AuthShell title="Te han invitado" subtitle={`Únete a ${invite.workshop_name} como ${roleLabel}.`}>
      <p className="mb-4 text-sm text-ink-soft">
        Invitación para <strong className="text-ink">{invite.email}</strong>.
      </p>
      {user ? (
        user.email?.toLowerCase() === invite.email.toLowerCase() ? (
          <AcceptInviteForm token={token} />
        ) : (
          <FormMessage error={`Has entrado como ${user.email}. Cierra sesión y entra con ${invite.email}.`} />
        )
      ) : (
        <div className="grid gap-3">
          <Link href={`/signup?next=${encodeURIComponent(next)}`} className="btn-primary py-3 text-base">
            Crear cuenta
          </Link>
          <Link href={`/login?next=${encodeURIComponent(next)}`} className="btn-ghost py-3 text-base">
            Ya tengo cuenta
          </Link>
        </div>
      )}
    </AuthShell>
  );
}
