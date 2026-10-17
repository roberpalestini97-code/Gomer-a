"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { ACTIVE_WORKSHOP_COOKIE } from "@/lib/workshop";

export type FormState = { error?: string; ok?: string } | undefined;

const COOKIE_OPTS = { httpOnly: true, sameSite: "lax" as const, secure: process.env.NODE_ENV === "production", path: "/" };

export async function createWorkshop(_prev: FormState, formData: FormData): Promise<FormState> {
  const name = z.string().trim().min(2).max(80).safeParse(formData.get("name"));
  if (!name.success) return { error: "El nombre del taller debe tener entre 2 y 80 caracteres." };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_workshop", { p_name: name.data });
  if (error) return { error: "No se pudo crear el taller. Inténtalo de nuevo." };

  (await cookies()).set(ACTIVE_WORKSHOP_COOKIE, data as string, COOKIE_OPTS);
  redirect("/app/catalogo?nuevo=1");
}

export async function switchWorkshop(formData: FormData) {
  const id = z.string().uuid().safeParse(formData.get("workshopId"));
  if (id.success) (await cookies()).set(ACTIVE_WORKSHOP_COOKIE, id.data, COOKIE_OPTS);
  redirect("/app");
}

export async function acceptInvite(_prev: FormState, formData: FormData): Promise<FormState> {
  const token = z.string().regex(/^[a-f0-9]{48}$/).safeParse(formData.get("token"));
  if (!token.success) return { error: "Invitación no válida." };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("accept_invite", { p_token: token.data });
  if (error) {
    const msg = error.message;
    if (msg.includes("mismatch")) return { error: "Esta invitación es para otro email. Entra con la cuenta invitada." };
    if (msg.includes("expired")) return { error: "La invitación ha caducado. Pide una nueva al dueño del taller." };
    if (msg.includes("already")) return { error: "Esta invitación ya se ha usado." };
    return { error: "No se pudo aceptar la invitación." };
  }
  (await cookies()).set(ACTIVE_WORKSHOP_COOKIE, data as string, COOKIE_OPTS);
  redirect("/app");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  (await cookies()).delete(ACTIVE_WORKSHOP_COOKIE);
  redirect("/login");
}
