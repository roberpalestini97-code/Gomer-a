import { describe, expect, it } from "vitest";
import { guessMapping, mapRows, parseNumber, parseSeason } from "./import";

describe("parseNumber", () => {
  it.each([
    ["1.234,50 €", 1234.5],
    ["1,234.50", 1234.5],
    ["89,90", 89.9],
    ["12", 12],
    [7, 7],
  ])("%s → %s", (input, expected) => {
    expect(parseNumber(input)).toBe(expected);
  });
  it("devuelve null si no hay número", () => {
    expect(parseNumber("")).toBeNull();
    expect(parseNumber(null)).toBeNull();
    expect(parseNumber("n/a")).toBeNull();
  });
});

describe("parseSeason", () => {
  it("reconoce invierno y all-season, verano por defecto", () => {
    expect(parseSeason("Invierno")).toBe("invierno");
    expect(parseSeason("4 estaciones")).toBe("all-season");
    expect(parseSeason("")).toBe("verano");
  });
});

describe("guessMapping", () => {
  it("asocia cabeceras típicas de una tarifa de proveedor", () => {
    const mapping = guessMapping(["Referencia", "Marca", "Modelo", "Medida", "PVP", "Existencias"]);
    expect(mapping).toEqual({
      sku: "Referencia",
      brand: "Marca",
      model: "Modelo",
      size: "Medida",
      price: "PVP",
      stock: "Existencias",
    });
  });
});

describe("mapRows", () => {
  const mapping = { sku: "Ref", brand: "Marca", model: "Modelo", size: "Medida", price: "Precio", stock: "Stock" };

  it("convierte filas válidas usando la medida completa", () => {
    const [r] = mapRows(
      [{ Ref: "A1", Marca: "Michelin", Modelo: "Primacy 4", Medida: "225/45 R17 94W", Precio: "112,50", Stock: "3" }],
      mapping,
    );
    expect(r.error).toBeUndefined();
    expect(r.tire).toMatchObject({ sku: "A1", brand: "Michelin", width: 225, aspect_ratio: 45, rim: 17, price: 112.5, stock: 3 });
  });

  it("informa del número de fila (cabecera = 1) en los errores", () => {
    const results = mapRows(
      [
        { Ref: "A1", Marca: "Michelin", Modelo: "X", Medida: "225/45 R17", Precio: "100", Stock: "1" },
        { Ref: "A2", Marca: "", Modelo: "X", Medida: "225/45 R17", Precio: "100", Stock: "1" },
        { Ref: "A3", Marca: "Pirelli", Modelo: "X", Medida: "sin medida", Precio: "100", Stock: "1" },
      ],
      mapping,
    );
    expect(results[0].tire).toBeDefined();
    expect(results[1]).toMatchObject({ row: 3 });
    expect(results[1].error).toMatch(/brand/);
    expect(results[2]).toMatchObject({ row: 4 });
    expect(results[2].error).toMatch(/width/);
  });

  it("nunca deja stock negativo", () => {
    const [r] = mapRows([{ Marca: "Kumho", Medida: "205/55 R16", Stock: "-4" }], mapping);
    expect(r.tire?.stock).toBe(0);
  });
});
