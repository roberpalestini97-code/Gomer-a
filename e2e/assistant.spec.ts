import { expect, test } from "@playwright/test";

/**
 * Flujo completo contra un proyecto Supabase real con ANTHROPIC_API_KEY.
 * Requiere un usuario dueño (E2E_EMAIL / E2E_PASSWORD) con el catálogo de demostración cargado.
 */
const email = process.env.E2E_EMAIL;
const password = process.env.E2E_PASSWORD;

test.describe("asistente y stock en vivo", () => {
  test.skip(!email || !password, "Define E2E_EMAIL y E2E_PASSWORD para ejecutar el flujo completo");

  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill(email!);
    await page.getByLabel("Contraseña").fill(password!);
    await page.getByRole("button", { name: "Entrar" }).click();
    await expect(page).toHaveURL(/\/app$/);
  });

  test("recomienda neumáticos para un Audi A3", async ({ page }) => {
    await page.getByLabel("Consulta").fill("Me acaba de entrar un Audi A3 de 2018");
    await page.getByRole("button", { name: "Enviar" }).click();
    const card = page.getByTestId("tire-card").first();
    await expect(card).toBeVisible({ timeout: 45_000 });
    await expect(card).toContainText(/R1[678]/);
  });

  test("el stock se sincroniza entre pestañas", async ({ page, context }) => {
    await page.goto("/app/stock");
    await page.getByLabel("Buscar en el stock").fill("225/45 R17");
    const row = page.getByTestId("stock-row").first();
    const before = Number(await row.getByTestId("stock-value").textContent());

    const other = await context.newPage();
    await other.goto("/app/stock");
    await other.getByLabel("Buscar en el stock").fill("225/45 R17");
    const otherValue = other.getByTestId("stock-row").first().getByTestId("stock-value");
    await expect(otherValue).toHaveText(String(before));

    await row.getByRole("button", { name: /Sumar uno/ }).click();
    await expect(otherValue).toHaveText(String(before + 1), { timeout: 10_000 });

    // Deja el stock como estaba.
    await row.getByRole("button", { name: /Restar uno/ }).click();
    await expect(otherValue).toHaveText(String(before), { timeout: 10_000 });
  });
});
