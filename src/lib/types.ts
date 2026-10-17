export type Role = "owner" | "mechanic";

export type Season = "verano" | "invierno" | "all-season";

export interface Supplier {
  id: string;
  workshop_id: string;
  name: string;
  sales_rep_name: string | null;
  whatsapp_phone: string | null;
}

export interface Tire {
  id: string;
  workshop_id: string;
  supplier_id: string | null;
  sku: string | null;
  brand: string;
  model: string;
  width: number;
  aspect_ratio: number;
  rim: number;
  load_index: number | null;
  speed_rating: string | null;
  season: Season;
  price: number;
  stock: number;
  notes: string | null;
  updated_at: string;
}

export interface Membership {
  workshop_id: string;
  role: Role;
  workshop: { id: string; name: string };
}

/** Neumático recomendado por el asistente, listo para pintar en una tarjeta. */
export interface RecommendedTire extends Tire {
  supplier: Pick<Supplier, "name" | "sales_rep_name" | "whatsapp_phone"> | null;
}

/** Eventos NDJSON que emite /api/assistant. */
export type AssistantEvent =
  | { type: "text"; delta: string }
  | { type: "status"; message: string }
  | { type: "tires"; tires: RecommendedTire[] }
  | { type: "error"; message: string }
  | { type: "done" };
