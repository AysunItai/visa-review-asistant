import { test, expect } from "@playwright/test";
import { loadSample, next, finalStep, submit, openSubmitted, seedAdmin } from "./flow-helpers";

async function noOverflow(page: import("@playwright/test").Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
}

test("role entry, applicant steps, admin cards and complete detail reflow without overflow", async ({ page }, testInfo) => {
  await page.goto("/"); await noOverflow(page);
  await page.screenshot({ path: testInfo.outputPath("role-entry.png"), fullPage: true });
  await loadSample(page); await noOverflow(page);
  await next(page); await noOverflow(page); await next(page); await noOverflow(page);
  await page.getByRole("button", { name: "Konaklama ekle", exact: true }).click();
  await expect(page.getByLabel("2. konaklamayı kaldır")).toBeVisible();
  await page.getByLabel("2. konaklamayı kaldır").click();
  await next(page); await noOverflow(page); await submit(page); await noOverflow(page);
  await openSubmitted(page); await noOverflow(page);
  await page.getByLabel("İç inceleme notu", { exact: true }).fill("Uzun kurgusal not. ".repeat(80));
  await noOverflow(page);
  await page.getByRole("button", { name: "Başvurulara dön" }).click();
  await page.getByRole("button", { name: "Kurgusal başvuruları yükle" }).click();
  await noOverflow(page);
  const actionHeights = await page.locator(".case-table tbody button").evaluateAll((buttons) => buttons.map((button) => button.getBoundingClientRect().height));
  expect(actionHeights.every((height) => height <= 52)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath("admin-dashboard.png"), fullPage: true });
  const original = page.viewportSize()!;
  await page.setViewportSize({ width: original.height, height: original.width }); await noOverflow(page);
});

test("keyboard focus, validation, required acknowledgment and draft summary editing", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await page.keyboard.press("Tab"); await expect(page.getByRole("link", { name: "İçeriğe geç" })).toBeFocused();
  await loadSample(page); await page.locator('[name="reference"]').fill(""); await next(page);
  await expect(page.locator('[name="reference"]')).toBeFocused();
  await page.locator('[name="reference"]').fill("KLAVYE-DEMO"); await finalStep(page);
  await page.getByRole("button", { name: "Başvuru ve seyahat: Düzenle" }).click();
  await expect(page.locator('[name="reference"]')).toHaveValue("KLAVYE-DEMO");
  await finalStep(page); await submit(page); await openSubmitted(page, "KLAVYE-DEMO");
  await expect(page.locator("#main")).toBeFocused();
});

test("admin empty state and mobile form controls remain usable", async ({ page }) => {
  await seedAdmin(page);
  await page.getByLabel("Başvuru referansı ara").fill("missing");
  await expect(page.getByText("Eşleşen başvuru bulunamadı", { exact: true })).toBeVisible();
  await noOverflow(page);
  const controls = await page.locator("input:visible, select:visible, button:visible").evaluateAll((nodes) => nodes.map((node) => ({ height: node.getBoundingClientRect().height, font: parseFloat(getComputedStyle(node).fontSize), tag: node.tagName })));
  expect(controls.every((control) => control.height >= 44)).toBe(true);
  if (page.viewportSize()!.width <= 600) expect(controls.filter((c) => c.tag !== "BUTTON").every((c) => c.font >= 16)).toBe(true);
});
