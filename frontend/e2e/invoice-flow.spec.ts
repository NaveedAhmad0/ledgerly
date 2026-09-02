import { test, expect } from "@playwright/test";

test("landing page states the product clearly", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /messy notes/i })).toBeVisible();
  await expect(page.getByRole("link", { name: "Create account" })).toBeVisible();
});

test("demo user can log in, create an invoice, and see it in the list", async ({ page }) => {
  const client = `Playwright Client ${Date.now()}`;

  await page.goto("/login");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();

  await page.getByRole("link", { name: "New invoice" }).click();
  await expect(page.getByRole("heading", { name: "New invoice" })).toBeVisible();

  await page.getByLabel("Client").fill(client);
  await page.getByLabel("Description").fill("Playwright integration work");
  await page.getByLabel("Qty").fill("2");
  await page.getByLabel("Unit price").fill("100");
  await page.getByRole("button", { name: "Save invoice" }).click();

  await expect(page.getByRole("heading", { name: "Invoices" })).toBeVisible();
  await expect(page.getByText(client)).toBeVisible();
});
