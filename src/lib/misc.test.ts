import { describe, expect, it } from "vitest";
import { limitMessage } from "./rate-limit";
import { safeNext } from "./safe-next";

describe("safeNext", () => {
  it("acepta rutas internas", () => {
    expect(safeNext("/app/stock")).toBe("/app/stock");
    expect(safeNext("/invite/abc")).toBe("/invite/abc");
  });
  it("bloquea redirecciones externas", () => {
    expect(safeNext("https://evil.com")).toBe("/app");
    expect(safeNext("//evil.com")).toBe("/app");
    expect(safeNext("/\\evil.com")).toBe("/app");
    expect(safeNext(null, "/onboarding")).toBe("/onboarding");
  });
});

describe("limitMessage", () => {
  const limits = { perMinute: 8, perDay: 300 };
  it("deja pasar por debajo del límite", () => {
    expect(limitMessage(7, 299, limits)).toBeNull();
  });
  it("frena ráfagas y el tope diario", () => {
    expect(limitMessage(8, 10, limits)).toMatch(/minuto/);
    expect(limitMessage(0, 300, limits)).toMatch(/diario/);
  });
});
