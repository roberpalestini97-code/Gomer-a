import { expect, test } from "@playwright/test";

test("la portada explica el producto y lleva al alta", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("comando de voz");
  await page.getByRole("link", { name: "Crear mi taller" }).click();
  await expect(page).toHaveURL(/\/signup/);
  await expect(page.getByLabel("Nombre del taller")).toBeVisible();
});

test("las rutas privadas redirigen al login", async ({ page }) => {
  await page.goto("/app/stock");
  await expect(page).toHaveURL(/\/login\?next=%2Fapp%2Fstock/);
});

test("la API del asistente exige sesión", async ({ request }) => {
  const res = await request.post("/api/assistant", { data: { workshopId: "x", messages: [] } });
  expect(res.status()).toBe(401);
});

test("cabeceras de seguridad presentes", async ({ request }) => {
  const res = await request.get("/");
  expect(res.headers()["x-frame-options"]).toBe("DENY");
  expect(res.headers()["content-security-policy"]).toContain("frame-ancestors 'none'");
});
