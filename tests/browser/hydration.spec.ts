import { test, expect } from "@playwright/test";
import { loadSample, finalStep, submit, openSubmitted } from "./flow-helpers";

test("refresh clears submitted cases, roles and drafts without hydration errors", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => { if (/hydration|hydrated/i.test(message.text())) errors.push(message.text()); });
  await page.goto("/"); await loadSample(page); await finalStep(page); await submit(page); await openSubmitted(page);
  await page.reload();
  await expect(page.getByRole("heading", { name: "Seyahatinizin ilk adımı.", exact: true })).toBeVisible();
  await page.getByRole("link", { name: "Yönetici girişi", exact: true }).click();
  await expect(page.getByText("İlk başvuru için hazır", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Başvuru sahibine geç" }).click();
  await expect(page.locator('[name="reference"]')).toHaveValue("");
  expect(errors).toEqual([]);
});
