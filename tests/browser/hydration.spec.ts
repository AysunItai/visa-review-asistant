import { test, expect } from "@playwright/test";
import { loadSample, finalStep, next } from "./flow-helpers";

test("reload resets form controls without hydration errors or unlocked steps", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error" || /hydration|hydrated/i.test(message.text()))
      errors.push(message.text());
  });
  await page.goto("/");
  await expect(page.locator("form")).toHaveAttribute("autocomplete", "off");
  await loadSample(page);
  await finalStep(page);
  const steps = page.locator(".step-navigation button");
  for (let index = 0; index < 4; index++) await expect(steps.nth(index)).toBeEnabled();
  await page.getByRole("radio", { name: "Yerel kontroller + OpenAI gözlemleri", exact: true }).check();
  await page.getByRole("checkbox", { name: /Gönderilecek açıklamaları kontrol ettim/ }).check();

  await page.reload();
  await expect(page.getByText("Adım 1 / 4", { exact: true })).toBeVisible();
  await expect(page.getByLabel("Başvuru referansı")).toHaveValue("");
  await expect(page.getByLabel("Gidiş tarihi")).toHaveValue("");
  await expect(page.locator('input[name="analysis-mode"]').first()).toBeChecked();
  await expect(page.locator('input[name="ai-consent"]')).toHaveCount(0);
  await expect(steps.first()).toBeEnabled();
  for (let index = 1; index < 4; index++) await expect(steps.nth(index)).toBeDisabled();
  await expect(page.getByRole("button", { name: "Geri", exact: true })).toBeDisabled();
  await next(page);
  await expect(page.getByLabel("Gidiş tarihi")).toBeFocused();
  await expect(page.locator("#review-report")).toHaveCount(0);
  expect(errors).toEqual([]);
});
