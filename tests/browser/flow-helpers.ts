import { expect, type Page } from "@playwright/test";

export async function enterApplicant(page: Page) {
  await page.getByRole("button", { name: "Başvuruya başla", exact: true }).click();
}
export async function loadSample(page: Page, sample = "consistent") {
  const entry = page.getByRole("button", { name: "Başvuruya başla", exact: true });
  if (await entry.isVisible()) await entry.click();
  await page.getByLabel("Örnek başvuru seçin").selectOption(sample);
  await page.getByRole("button", { name: "Örnek Başvuru Yükle" }).click();
  await expect(page.getByText("Adım 1 / 4", { exact: true })).toBeVisible();
}
export async function next(page: Page) { await page.getByRole("button", { name: "Devam", exact: true }).click(); }
export async function finalStep(page: Page) {
  for (let i = 0; i < 3; i++) await next(page);
  await expect(page.getByText("Adım 4 / 4", { exact: true })).toBeVisible();
}
export async function submit(page: Page) {
  await page.getByLabel(/Yanıtlarımı kontrol ettim/).check();
  await page.getByRole("button", { name: "Başvuruyu gönder", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Başvurunuz alındı." })).toBeVisible();
}
export async function openSubmitted(page: Page, reference = "ÖRNEK-002") {
  await page.getByRole("link", { name: "Yönetici girişi", exact: true }).click();
  await page.getByRole("button", { name: `${reference} başvurusunu incele` }).click();
  await expect(page.locator("#case-title")).toHaveText(reference);
}
export async function seedAdmin(page: Page) {
  await page.goto("/");
  await page.getByRole("link", { name: "Yönetici girişi", exact: true }).click();
  await page.getByRole("button", { name: "Kurgusal başvuruları yükle" }).click();
}
export async function editStep(page: Page, step: number) {
  await page.getByRole("button", { name: new RegExp(`^${step}\\. adım:`) }).click();
  await expect(page.getByText(`Adım ${step} / 4`, { exact: true })).toBeVisible();
}
