import { describe, expect, it } from "vitest";
import { formatTireSize, normalizeText, parseTireSize } from "./tires";

describe("parseTireSize", () => {
  it.each([
    ["225/45 R17", { width: 225, aspect_ratio: 45, rim: 17 }],
    ["225/45R17", { width: 225, aspect_ratio: 45, rim: 17 }],
    ["225 45 17", { width: 225, aspect_ratio: 45, rim: 17 }],
    ["225/45ZR17 94W", { width: 225, aspect_ratio: 45, rim: 17 }],
    ["me entra un 205/55 r16", { width: 205, aspect_ratio: 55, rim: 16 }],
  ])("interpreta %s", (input, expected) => {
    expect(parseTireSize(input)).toEqual(expected);
  });

  it("rechaza texto sin medida o fuera de rango", () => {
    expect(parseTireSize("Audi A3")).toBeNull();
    expect(parseTireSize("999/99 R99")).toBeNull();
  });
});

describe("formatTireSize", () => {
  it("formatea sin decimales innecesarios", () => {
    expect(formatTireSize({ width: 225, aspect_ratio: 45, rim: 17 })).toBe("225/45 R17");
    expect(formatTireSize({ width: 215, aspect_ratio: 75, rim: 17.5 })).toBe("215/75 R17.5");
  });
});

describe("normalizeText", () => {
  it("ignora tildes, mayúsculas y signos", () => {
    expect(normalizeText("  León-ST ")).toBe("leon st");
    expect(normalizeText("Citroën C3")).toBe("citroen c3");
  });
});
