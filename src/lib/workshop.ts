import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Membership } from "@/lib/types";

export const ACTIVE_WORKSHOP_COOKIE = "ws";

/**
 * Devuelve el usuario, sus talleres y el taller activo.
 * Redirige a /login sin sesión y a /onboarding si aún no pertenece a ningún taller.
 */
export async function requireWorkshop() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data, error } = await supabase
    .from("memberships")
    .select("workshop_id, role, workshop:workshops(id, name)")
    .eq("user_id", user.id)
    .order("created_at");
  if (error) throw new Error(error.message);

  const memberships = (data ?? []) as unknown as Membership[];
  if (memberships.length === 0) redirect("/onboarding");

  const cookieStore = await cookies();
  const wanted = cookieStore.get(ACTIVE_WORKSHOP_COOKIE)?.value;
  const active = memberships.find((m) => m.workshop_id === wanted) ?? memberships[0];

  return { supabase, user, memberships, active, isOwner: active.role === "owner" };
}

/** Igual que requireWorkshop pero exige rol de dueño. */
export async function requireOwner() {
  const ctx = await requireWorkshop();
  if (!ctx.isOwner) redirect("/app");
  return ctx;
}
