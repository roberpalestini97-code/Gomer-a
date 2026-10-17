import { z } from "zod";
import { parseTireSize } from "./tires";

/** Campos del catálogo que se pueden mapear desde un CSV/XLSX. */
export const IMPORT_FIELDS = [
  { key: "sku", label: "Referencia / SKU" },
  { key: "brand", label: "Marca" },
  { key: "model", label: "Modelo" },
  { key: "size", label: "Medida completa (225/45 R17)" },
  { key: "width", label: "Ancho" },
  { key: "aspect_ratio", label: "Perfil" },
  { key: "rim", label: "Llanta" },
  { key: "load_index", label: "Índice de carga" },
  { key: "speed_rating", label: "Código de velocidad" },
  { key: "season", label: "Temporada" },
  { key: "price", label: "Precio" },
  { key: "stock", label: "Stock" },
] as const;

export type ImportField = (typeof IMPORT_FIELDS)[number]["key"];
export type ColumnMapping = Partial<Record<ImportField, string>>;

const HINTS: Record<ImportField, string[]> = {
  sku: ["sku", "ref", "referencia", "codigo", "code", "ean"],
  brand: ["marca", "brand", "fabricante"],
  model: ["modelo", "model", "dibujo", "pattern", "descripcion"],
  size: ["medida", "size", "dimension"],
  width: ["ancho", "width", "anchura"],
  aspect_ratio: ["perfil", "serie", "aspect", "profile"],
  rim: ["llanta", "rim", "diametro", "pulgadas"],
  load_index: ["carga", "load"],
  speed_rating: ["velocidad", "speed"],
  season: ["temporada", "season"],
  price: ["precio", "price", "pvp", "importe", "coste"],
  stock: ["stock", "cantidad", "existencias", "unidades", "uds", "qty"],
};

const norm = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

/** Propone un mapeo columna→campo a partir de las cabeceras. */
export function guessMapping(headers: string[]): ColumnMapping {
  const mapping: ColumnMapping = {};
  const used = new Set<string>();
  // Primero coincidencias exactas para todos los campos, luego parciales.
  for (const pass of ["exact", "partial"] as const) {
    for (const field of IMPORT_FIELDS) {
      if (mapping[field.key]) continue;
      const hints = HINTS[field.key];
      const match = headers.find((h) => {
        if (used.has(h)) return false;
        const n = norm(h);
        return pass === "exact" ? hints.includes(n) : hints.some((x) => n.includes(x));
      });
      if (match) {
        mapping[field.key] = match;
        used.add(match);
      }
    }
  }
  return mapping;
}

/** Convierte "1.234,50 €" o "1234.5" en número. */
export function parseNumber(value: unknown): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (value == null) return null;
  let s = String(value).replace(/[^\d,.\-]/g, "");
  if (!s) return null;
  if (s.includes(",") && s.includes(".")) {
    // El último separador es el decimal.
    s = s.lastIndexOf(",") > s.lastIndexOf(".") ? s.replace(/\./g, "").replace(",", ".") : s.replace(/,/g, "");
  } else if (s.includes(",")) {
    s = s.replace(",", ".");
  }
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

export function parseSeason(value: unknown): "verano" | "invierno" | "all-season" {
  const v = norm(String(value ?? ""));
  if (/invierno|winter|nieve/.test(v)) return "invierno";
  if (/all|4 ?estaciones|todo tiempo/.test(v)) return "all-season";
  return "verano";
}

export const TireInputSchema = z.object({
  sku: z.string().trim().max(80).nullable(),
  brand: z.string().trim().min(1, "marca obligatoria").max(80),
  model: z.string().trim().max(120),
  width: z.number().int().min(100).max(400),
  aspect_ratio: z.number().int().min(20).max(100),
  rim: z.number().min(10).max(26),
  load_index: z.number().int().min(0).max(200).nullable(),
  speed_rating: z.string().trim().max(3).nullable(),
  season: z.enum(["verano", "invierno", "all-season"]),
  price: z.number().min(0).max(100000),
  stock: z.number().int().min(0).max(100000),
  supplier_id: z.string().uuid().nullable().optional(),
});
export type TireInput = z.infer<typeof TireInputSchema>;

export interface RowResult {
  row: number;
  tire?: TireInput;
  error?: string;
}

const str = (v: unknown) => (v == null || String(v).trim() === "" ? null : String(v).trim());

/** Aplica el mapeo a filas crudas y valida cada una. `row` es la fila de la hoja (cabecera = 1). */
export function mapRows(rows: Record<string, unknown>[], mapping: ColumnMapping): RowResult[] {
  return rows.map((raw, i) => {
    const get = (f: ImportField) => {
      const col = mapping[f];
      return col ? raw[col] : undefined;
    };
    let width = parseNumber(get("width"));
    let aspect = parseNumber(get("aspect_ratio"));
    let rim = parseNumber(get("rim"));
    const sizeText = get("size");
    if ((width == null || aspect == null || rim == null) && sizeText != null) {
      const parsed = parseTireSize(String(sizeText));
      if (parsed) {
        width = parsed.width;
        aspect = parsed.aspect_ratio;
        rim = parsed.rim;
      }
    }
    const loadIndex = parseNumber(get("load_index"));
    const candidate = {
      sku: str(get("sku")),
      brand: str(get("brand")) ?? "",
      model: str(get("model")) ?? "",
      width: width ?? Number.NaN,
      aspect_ratio: aspect ?? Number.NaN,
      rim: rim ?? Number.NaN,
      load_index: loadIndex == null ? null : Math.round(loadIndex),
      speed_rating: str(get("speed_rating"))?.toUpperCase() ?? null,
      season: parseSeason(get("season")),
      price: parseNumber(get("price")) ?? 0,
      stock: Math.max(0, Math.round(parseNumber(get("stock")) ?? 0)),
    };
    const result = TireInputSchema.safeParse(candidate);
    if (!result.success) {
      const issue = result.error.issues[0];
      return { row: i + 2, error: `${issue.path.join(".") || "fila"}: ${issue.message}` };
    }
    return { row: i + 2, tire: result.data };
  });
}
