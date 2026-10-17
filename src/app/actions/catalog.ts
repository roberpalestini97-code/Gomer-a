"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { TireInputSchema } from "@/lib/import";
import { requireOwner, requireWorkshop } from "@/lib/workshop";
import type { FormState } from "./workshop";

const uuid = z.string().uuid();

/** Ajuste atómico +/- de stock (solo dueños, lo garantiza RLS). */
export async function adjustStock(tireId: string, delta: number): Promise<{ stock?: number; error?: string }> {
  const { supabase, isOwner } = await requireWorkshop();
  if (!isOwner) return { error: "Solo el dueño puede cambiar el stock." };
  if (!uuid.safeParse(tireId).success || !Number.isInteger(delta) || Math.abs(delta) > 1000) {
    return { error: "Valor no válido." };
  }
  const { data, error } = await supabase.rpc("adjust_stock", { p_tire_id: tireId, p_delta: delta });
  if (error) return { error: "No se pudo actualizar el stock." };
  return { stock: data as number };
}

export async function setStock(tireId: string, stock: number): Promise<{ error?: string }> {
  const { supabase, active } = await requireOwner();
  if (!uuid.safeParse(tireId).success || !Number.isInteger(stock) || stock < 0 || stock > 100000) {
    return { error: "Valor no válido." };
  }
  const { error } = await supabase
    .from("tires")
    .update({ stock })
    .eq("id", tireId)
    .eq("workshop_id", active.workshop_id);
  return error ? { error: "No se pudo actualizar el stock." } : {};
}

function tireFromForm(formData: FormData) {
  const num = (k: string) => {
    const v = formData.get(k);
    return v == null || v === "" ? null : Number(String(v).replace(",", "."));
  };
  const text = (k: string) => {
    const v = formData.get(k);
    return v == null || String(v).trim() === "" ? null : String(v).trim();
  };
  return TireInputSchema.safeParse({
    sku: text("sku"),
    brand: text("brand") ?? "",
    model: text("model") ?? "",
    width: num("width"),
    aspect_ratio: num("aspect_ratio"),
    rim: num("rim"),
    load_index: num("load_index"),
    speed_rating: text("speed_rating")?.toUpperCase() ?? null,
    season: text("season") ?? "verano",
    price: num("price") ?? 0,
    stock: num("stock") ?? 0,
    supplier_id: text("supplier_id"),
  });
}

export async function saveTire(_prev: FormState, formData: FormData): Promise<FormState> {
  const { supabase, active } = await requireOwner();
  const parsed = tireFromForm(formData);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return { error: `Revisa el campo «${issue.path.join(".")}»: ${issue.message}` };
  }
  const id = formData.get("id");
  const row = { ...parsed.data, workshop_id: active.workshop_id };
  const { error } =
    id && uuid.safeParse(id).success
      ? await supabase.from("tires").update(row).eq("id", String(id)).eq("workshop_id", active.workshop_id)
      : await supabase.from("tires").insert(row);
  if (error) {
    return { error: error.code === "23505" ? "Ya existe un neumático con esa referencia." : "No se pudo guardar." };
  }
  revalidatePath("/app/catalogo");
  return { ok: "Guardado." };
}

export async function deleteTire(tireId: string): Promise<{ error?: string }> {
  const { supabase, active } = await requireOwner();
  if (!uuid.safeParse(tireId).success) return { error: "Valor no válido." };
  const { error } = await supabase.from("tires").delete().eq("id", tireId).eq("workshop_id", active.workshop_id);
  if (error) return { error: "No se pudo borrar." };
  revalidatePath("/app/catalogo");
  return {};
}

const ImportSchema = z.object({
  supplierId: z.string().uuid().nullable(),
  tires: z.array(TireInputSchema).min(1).max(5000),
});

/** Importa un catálogo: las filas con referencia se actualizan (upsert), el resto se insertan. */
export async function importTires(input: z.infer<typeof ImportSchema>): Promise<{ imported?: number; error?: string }> {
  const { supabase, active } = await requireOwner();
  const parsed = ImportSchema.safeParse(input);
  if (!parsed.success) return { error: "Datos de importación no válidos." };
  const { supplierId, tires } = parsed.data;

  const rows = tires.map((t) => ({ ...t, supplier_id: supplierId, workshop_id: active.workshop_id }));
  // Deduplica por SKU dentro del propio fichero (gana la última fila).
  const withSku = [...new Map(rows.filter((r) => r.sku).map((r) => [r.sku, r])).values()];
  const withoutSku = rows.filter((r) => !r.sku);

  for (let i = 0; i < withSku.length; i += 500) {
    const { error } = await supabase
      .from("tires")
      .upsert(withSku.slice(i, i + 500), { onConflict: "workshop_id,sku" });
    if (error) return { error: `Error importando: ${error.message}` };
  }
  for (let i = 0; i < withoutSku.length; i += 500) {
    const { error } = await supabase.from("tires").insert(withoutSku.slice(i, i + 500));
    if (error) return { error: `Error importando: ${error.message}` };
  }
  revalidatePath("/app/catalogo");
  revalidatePath("/app/stock");
  return { imported: withSku.length + withoutSku.length };
}

export async function seedDemoCatalog(): Promise<{ imported?: number; error?: string }> {
  const { supabase, active } = await requireOwner();
  const { data, error } = await supabase.rpc("seed_demo_catalog", { p_workshop: active.workshop_id });
  if (error) return { error: "No se pudo cargar el catálogo de demostración." };
  revalidatePath("/app", "layout");
  return { imported: data as number };
}

const SupplierSchema = z.object({
  name: z.string().trim().min(1, "nombre obligatorio").max(120),
  sales_rep_name: z.string().trim().max(120).nullable(),
  whatsapp_phone: z
    .string()
    .transform((s) => s.replace(/[\s\-().]/g, ""))
    .pipe(z.string().regex(/^\+?[0-9]{8,15}$/, "teléfono con prefijo de país, p. ej. +34600123456"))
    .nullable(),
});

export async function saveSupplier(_prev: FormState, formData: FormData): Promise<FormState> {
  const { supabase, active } = await requireOwner();
  const text = (k: string) => {
    const v = formData.get(k);
    return v == null || String(v).trim() === "" ? null : String(v).trim();
  };
  const parsed = SupplierSchema.safeParse({
    name: text("name") ?? "",
    sales_rep_name: text("sales_rep_name"),
    whatsapp_phone: text("whatsapp_phone"),
  });
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return { error: `Revisa «${issue.path.join(".")}»: ${issue.message}` };
  }
  const id = formData.get("id");
  const row = { ...parsed.data, workshop_id: active.workshop_id };
  const { error } =
    id && uuid.safeParse(id).success
      ? await supabase.from("suppliers").update(row).eq("id", String(id)).eq("workshop_id", active.workshop_id)
      : await supabase.from("suppliers").insert(row);
  if (error) return { error: "No se pudo guardar el proveedor." };
  revalidatePath("/app/proveedores");
  return { ok: "Proveedor guardado." };
}

export async function deleteSupplier(id: string): Promise<{ error?: string }> {
  const { supabase, active } = await requireOwner();
  if (!uuid.safeParse(id).success) return { error: "Valor no válido." };
  const { error } = await supabase.from("suppliers").delete().eq("id", id).eq("workshop_id", active.workshop_id);
  if (error) return { error: "No se pudo borrar el proveedor." };
  revalidatePath("/app/proveedores");
  return {};
}
