export interface TireSize {
  width: number;
  aspect_ratio: number;
  rim: number;
}

const SIZE_RE = /(\d{3})\s*[\/\-\s]\s*(\d{2})\s*(?:Z?R|-|\s)?\s*(\d{2}(?:[.,]\d)?)/i;

/** Interpreta medidas como "225/45 R17", "225 45 17", "225/45ZR17". */
export function parseTireSize(input: string): TireSize | null {
  const m = SIZE_RE.exec(input);
  if (!m) return null;
  const width = Number(m[1]);
  const aspect_ratio = Number(m[2]);
  const rim = Number(m[3].replace(",", "."));
  if (width < 100 || width > 400 || aspect_ratio < 20 || aspect_ratio > 100 || rim < 10 || rim > 26) {
    return null;
  }
  return { width, aspect_ratio, rim };
}

export function formatTireSize(t: TireSize): string {
  const rim = Number.isInteger(Number(t.rim)) ? String(Number(t.rim)) : String(t.rim);
  return `${t.width}/${t.aspect_ratio} R${rim}`;
}

export function formatPrice(value: number): string {
  return new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(value);
}

/** Normaliza texto para comparar marcas/modelos ("León" == "leon"). */
export function normalizeText(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}
