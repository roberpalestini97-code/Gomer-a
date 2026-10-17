import { formatTireSize } from "./tires";

export interface OrderInfo {
  workshopName: string;
  salesRepName?: string | null;
  brand: string;
  model: string;
  width: number;
  aspect_ratio: number;
  rim: number;
  quantity: number;
  sku?: string | null;
}

/** Deja solo dígitos (formato que exige wa.me). */
export function normalizePhone(phone: string): string | null {
  const digits = phone.replace(/\D/g, "");
  return digits.length >= 8 && digits.length <= 15 ? digits : null;
}

export function buildOrderMessage(o: OrderInfo): string {
  const greeting = o.salesRepName ? `Hola ${o.salesRepName},` : "Hola,";
  const ref = o.sku ? ` (ref. ${o.sku})` : "";
  return [
    greeting,
    `desde ${o.workshopName} queremos pedir ${o.quantity} ud. de ${o.brand} ${o.model} ${formatTireSize(o)}${ref}.`,
    "¿Tenéis disponibilidad y plazo de entrega? Gracias.",
  ].join("\n");
}

export function buildWhatsAppLink(phone: string, message: string): string | null {
  const normalized = normalizePhone(phone);
  if (!normalized) return null;
  return `https://wa.me/${normalized}?text=${encodeURIComponent(message)}`;
}
