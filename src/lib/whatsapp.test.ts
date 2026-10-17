import { describe, expect, it } from "vitest";
import { buildOrderMessage, buildWhatsAppLink, normalizePhone } from "./whatsapp";

describe("normalizePhone", () => {
  it("deja solo dígitos", () => {
    expect(normalizePhone("+34 600-123 456")).toBe("34600123456");
  });
  it("rechaza números imposibles", () => {
    expect(normalizePhone("123")).toBeNull();
    expect(normalizePhone("1234567890123456")).toBeNull();
  });
});

describe("buildOrderMessage", () => {
  it("incluye taller, cantidad, neumático y referencia", () => {
    const msg = buildOrderMessage({
      workshopName: "Talleres Paco",
      salesRepName: "Marta",
      brand: "Michelin",
      model: "Primacy 4+",
      width: 225,
      aspect_ratio: 45,
      rim: 17,
      quantity: 4,
      sku: "MIC-2254517",
    });
    expect(msg).toContain("Hola Marta,");
    expect(msg).toContain("Talleres Paco");
    expect(msg).toContain("4 ud. de Michelin Primacy 4+ 225/45 R17 (ref. MIC-2254517)");
  });
});

describe("buildWhatsAppLink", () => {
  it("genera un enlace wa.me con el texto codificado", () => {
    const link = buildWhatsAppLink("+34 600 123 456", "Hola, ¿stock?");
    expect(link).toBe(`https://wa.me/34600123456?text=${encodeURIComponent("Hola, ¿stock?")}`);
  });
  it("devuelve null con teléfono inválido", () => {
    expect(buildWhatsAppLink("12", "x")).toBeNull();
  });
});
