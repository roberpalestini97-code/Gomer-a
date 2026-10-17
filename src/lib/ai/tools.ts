import type Anthropic from "@anthropic-ai/sdk";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { formatTireSize, normalizeText } from "@/lib/tires";
import type { RecommendedTire } from "@/lib/types";

/** Contexto con el que se ejecutan las herramientas: cliente con la sesión del usuario (RLS). */
export interface ToolContext {
  supabase: SupabaseClient;
  workshopId: string;
  /** Neumáticos que el modelo ha decidido recomendar; se envían a la UI como tarjetas. */
  recommended: RecommendedTire[];
}

const LookupVehicleInput = z.object({
  make: z.string().trim().min(1).max(60),
  model: z.string().trim().min(1).max(60),
  year: z.number().int().min(1950).max(2100).optional(),
});

const SearchTiresInput = z.object({
  width: z.number().int().min(100).max(400),
  aspect_ratio: z.number().int().min(20).max(100),
  rim: z.number().min(10).max(26),
  season: z.enum(["verano", "invierno", "all-season"]).optional(),
  brand: z.string().trim().max(60).optional(),
  max_price: z.number().min(0).optional(),
  in_stock_only: z.boolean().optional(),
});

const RecommendInput = z.object({
  tire_ids: z.array(z.string().uuid()).min(1).max(6),
});

export const TOOLS: Anthropic.Tool[] = [
  {
    name: "lookup_vehicle_tire_size",
    description:
      "Devuelve las medidas de neumático homologadas habituales para un vehículo (marca, modelo y opcionalmente año). " +
      "Úsala cuando el mecánico diga el coche pero no la medida. Puede devolver varias medidas según versión/llanta.",
    eager_input_streaming: true,
    input_schema: {
      type: "object",
      properties: {
        make: { type: "string", description: "Marca, p. ej. Audi" },
        model: { type: "string", description: "Modelo, p. ej. A3" },
        year: { type: "integer", description: "Año de fabricación si se conoce" },
      },
      required: ["make", "model"],
    },
  },
  {
    name: "search_tires",
    description:
      "Busca en el catálogo del taller los neumáticos de una medida concreta, con precio, stock actual y proveedor. " +
      "Devuelve como máximo 15 resultados ordenados por stock disponible y precio.",
    eager_input_streaming: true,
    input_schema: {
      type: "object",
      properties: {
        width: { type: "integer", description: "Ancho en mm, p. ej. 225" },
        aspect_ratio: { type: "integer", description: "Perfil, p. ej. 45" },
        rim: { type: "number", description: "Diámetro de llanta en pulgadas, p. ej. 17" },
        season: { type: "string", enum: ["verano", "invierno", "all-season"] },
        brand: { type: "string", description: "Filtrar por marca" },
        max_price: { type: "number", description: "Precio máximo por unidad en euros" },
        in_stock_only: { type: "boolean", description: "Solo con stock > 0" },
      },
      required: ["width", "aspect_ratio", "rim"],
    },
  },
  {
    name: "recommend_tires",
    description:
      "Marca los neumáticos (ids devueltos por search_tires) que recomiendas al mecánico, del más al menos recomendable. " +
      "La app los mostrará como tarjetas con stock en vivo y botón de pedido por WhatsApp si no hay stock. " +
      "Llámala siempre que hayas encontrado neumáticos adecuados, antes de tu respuesta final.",
    eager_input_streaming: true,
    input_schema: {
      type: "object",
      properties: {
        tire_ids: { type: "array", items: { type: "string" }, description: "Ids de neumáticos, máximo 6" },
      },
      required: ["tire_ids"],
    },
  },
];

const TIRE_COLUMNS =
  "id, workshop_id, supplier_id, sku, brand, model, width, aspect_ratio, rim, load_index, speed_rating, season, price, stock, notes, updated_at";

interface FitmentRow {
  make: string;
  model: string;
  year_from: number | null;
  year_to: number | null;
  tire_size: string;
  workshop_id: string | null;
}

async function lookupVehicle(ctx: ToolContext, input: z.infer<typeof LookupVehicleInput>) {
  const { data, error } = await ctx.supabase
    .from("vehicle_fitments")
    .select("make, model, year_from, year_to, tire_size, workshop_id")
    .or(`workshop_id.is.null,workshop_id.eq.${ctx.workshopId}`);
  if (error) throw new Error(error.message);

  const make = normalizeText(input.make);
  const model = normalizeText(input.model);
  const rows = (data as FitmentRow[]).filter((r) => {
    const rMake = normalizeText(r.make);
    const rModel = normalizeText(r.model);
    const makeOk = rMake === make || rMake.startsWith(make) || make.startsWith(rMake);
    const modelOk = rModel === model || model.startsWith(rModel) || rModel.startsWith(model);
    const yearOk =
      input.year == null ||
      ((r.year_from == null || input.year >= r.year_from) && (r.year_to == null || input.year <= r.year_to));
    return makeOk && modelOk && yearOk;
  });

  // Las medidas propias del taller van primero.
  rows.sort((a, b) => Number(b.workshop_id != null) - Number(a.workshop_id != null));
  const sizes = [...new Set(rows.map((r) => r.tire_size))];
  return {
    found: sizes.length > 0,
    sizes,
    note:
      sizes.length > 0
        ? "Medidas orientativas: pide confirmar la medida exacta en el flanco del neumático actual."
        : "No hay medidas registradas para este vehículo. Pide la medida que aparece en el flanco del neumático.",
  };
}

async function searchTires(ctx: ToolContext, input: z.infer<typeof SearchTiresInput>) {
  let query = ctx.supabase
    .from("tires")
    .select(`${TIRE_COLUMNS}, supplier:suppliers(name, sales_rep_name, whatsapp_phone)`)
    .eq("workshop_id", ctx.workshopId)
    .eq("width", input.width)
    .eq("aspect_ratio", input.aspect_ratio)
    .eq("rim", input.rim)
    .order("stock", { ascending: false })
    .order("price", { ascending: true })
    .limit(15);
  if (input.season) query = query.eq("season", input.season);
  if (input.brand) query = query.ilike("brand", `%${input.brand.replace(/[%_]/g, "")}%`);
  if (input.max_price != null) query = query.lte("price", input.max_price);
  if (input.in_stock_only) query = query.gt("stock", 0);

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  const tires = (data ?? []) as unknown as RecommendedTire[];
  return {
    size: formatTireSize(input),
    count: tires.length,
    tires: tires.map((t) => ({
      id: t.id,
      brand: t.brand,
      model: t.model,
      load_speed: [t.load_index, t.speed_rating].filter(Boolean).join(""),
      season: t.season,
      price_eur: Number(t.price),
      stock: t.stock,
      supplier: t.supplier?.name ?? null,
      can_order_whatsapp: Boolean(t.supplier?.whatsapp_phone),
    })),
  };
}

async function recommendTires(ctx: ToolContext, input: z.infer<typeof RecommendInput>) {
  const { data, error } = await ctx.supabase
    .from("tires")
    .select(`${TIRE_COLUMNS}, supplier:suppliers(name, sales_rep_name, whatsapp_phone)`)
    .eq("workshop_id", ctx.workshopId)
    .in("id", input.tire_ids);
  if (error) throw new Error(error.message);
  const byId = new Map((data as unknown as RecommendedTire[]).map((t) => [t.id, t]));
  const ordered = input.tire_ids.map((id) => byId.get(id)).filter((t): t is RecommendedTire => Boolean(t));
  for (const t of ordered) {
    if (!ctx.recommended.some((r) => r.id === t.id)) ctx.recommended.push(t);
  }
  return { shown: ordered.length, missing: input.tire_ids.length - ordered.length };
}

/** Ejecuta una herramienta validando su entrada. Nunca lanza: devuelve un tool_result. */
export async function runTool(
  ctx: ToolContext,
  block: Anthropic.ToolUseBlock,
): Promise<Anthropic.ToolResultBlockParam> {
  const fail = (message: string): Anthropic.ToolResultBlockParam => ({
    type: "tool_result",
    tool_use_id: block.id,
    is_error: true,
    content: message,
  });
  try {
    let result: unknown;
    switch (block.name) {
      case "lookup_vehicle_tire_size": {
        const parsed = LookupVehicleInput.safeParse(block.input);
        if (!parsed.success) return fail(`Entrada inválida: ${parsed.error.issues[0].message}`);
        result = await lookupVehicle(ctx, parsed.data);
        break;
      }
      case "search_tires": {
        const parsed = SearchTiresInput.safeParse(block.input);
        if (!parsed.success) return fail(`Entrada inválida: ${parsed.error.issues[0].message}`);
        result = await searchTires(ctx, parsed.data);
        break;
      }
      case "recommend_tires": {
        const parsed = RecommendInput.safeParse(block.input);
        if (!parsed.success) return fail(`Entrada inválida: ${parsed.error.issues[0].message}`);
        result = await recommendTires(ctx, parsed.data);
        break;
      }
      default:
        return fail(`Herramienta desconocida: ${block.name}`);
    }
    return { type: "tool_result", tool_use_id: block.id, content: JSON.stringify(result) };
  } catch (err) {
    return fail(err instanceof Error ? err.message : "Error ejecutando la herramienta");
  }
}

