import type { Metadata } from "next";
import { headers } from "next/headers";
import { TeamManager } from "@/components/team-manager";
import { requireOwner } from "@/lib/workshop";

export const metadata: Metadata = { title: "Equipo" };

export default async function TeamPage() {
  const { supabase, active, user } = await requireOwner();
  const [{ data: members }, { data: invites }] = await Promise.all([
    supabase
      .from("memberships")
      .select("user_id, role, email, created_at")
      .eq("workshop_id", active.workshop_id)
      .order("created_at"),
    supabase
      .from("invites")
      .select("id, email, role, token, expires_at, accepted_at")
      .eq("workshop_id", active.workshop_id)
      .is("accepted_at", null)
      .order("created_at", { ascending: false }),
  ]);

  const h = await headers();
  const origin = process.env.NEXT_PUBLIC_SITE_URL ?? `${h.get("x-forwarded-proto") ?? "https"}://${h.get("host")}`;

  return (
    <TeamManager
      currentUserId={user.id}
      members={members ?? []}
      invites={invites ?? []}
      origin={origin}
    />
  );
}
