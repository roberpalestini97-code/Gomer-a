"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireOwner } from "@/lib/workshop";
import type { FormState } from "./workshop";

const InviteSchema = z.object({
  email: z.string().trim().toLowerCase().email("email no válido"),
  role: z.enum(["owner", "mechanic"]),
});

export async function createInvite(_prev: FormState, formData: FormData): Promise<FormState> {
  const { supabase, active } = await requireOwner();
  const parsed = InviteSchema.safeParse({ email: formData.get("email"), role: formData.get("role") ?? "mechanic" });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { error } = await supabase.from("invites").insert({ ...parsed.data, workshop_id: active.workshop_id });
  if (error) return { error: "No se pudo crear la invitación." };
  revalidatePath("/app/equipo");
  return { ok: "Invitación creada. Copia el enlace y envíaselo." };
}

export async function revokeInvite(id: string): Promise<{ error?: string }> {
  const { supabase, active } = await requireOwner();
  if (!z.string().uuid().safeParse(id).success) return { error: "Valor no válido." };
  const { error } = await supabase.from("invites").delete().eq("id", id).eq("workshop_id", active.workshop_id);
  if (error) return { error: "No se pudo revocar." };
  revalidatePath("/app/equipo");
  return {};
}

export async function removeMember(userId: string): Promise<{ error?: string }> {
  const { supabase, active, user } = await requireOwner();
  if (!z.string().uuid().safeParse(userId).success || userId === user.id) return { error: "No permitido." };
  const { error } = await supabase
    .from("memberships")
    .delete()
    .eq("user_id", userId)
    .eq("workshop_id", active.workshop_id);
  if (error) return { error: "No se pudo quitar al miembro." };
  revalidatePath("/app/equipo");
  return {};
}
