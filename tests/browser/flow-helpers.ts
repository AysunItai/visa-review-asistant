import { expect, type Page } from "@playwright/test";

export async function loadSample(page: Page, sample = "consistent") {
  if (await page.getByRole("button", { name: "Başvuruyu düzenle", exact: true }).isVisible())
    await page.getByRole("button", { name: "Başvuruyu düzenle", exact: true }).click();
  await page.getByLabel("Örnek başvuru seçin").selectOption(sample);
  await page.getByRole("button", { name: "Örnek Başvuru Yükle" }).click();
  await expect(page.getByText("Adım 1 / 4", { exact: true })).toBeVisible();
}
export async function next(page: Page) {
  await page.getByRole("button", { name: "Devam", exact: true }).click();
}
export async function finalStep(page: Page) {
  for (let i = 0; i < 3; i++) await next(page);
  await expect(page.getByText("Adım 4 / 4", { exact: true })).toBeVisible();
}
export async function generate(page: Page) {
  await page.getByRole("button", { name: "İnceleme raporu oluştur", exact: true }).click();
  await expect(page.locator("#review-report")).toBeVisible();
}
export async function editStep(page: Page, step: number) {
  if (await page.getByRole("button", { name: "Başvuruyu düzenle", exact: true }).isVisible())
    await page.getByRole("button", { name: "Başvuruyu düzenle", exact: true }).click();
  await page.getByRole("button", { name: new RegExp(`^${step}\\. adım:`) }).click();
  await expect(page.getByText(`Adım ${step} / 4`, { exact: true })).toBeVisible();
}
export async function enableAI(page: Page) {
  await page.getByRole("radio", { name: "Yerel kontroller + OpenAI gözlemleri", exact: true }).check();
  await page.getByRole("checkbox", { name: /Gönderilecek açıklamaları kontrol ettim/ }).check();
}
