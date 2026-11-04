import { test, expect } from "@playwright/test";
import { loadSample, next, generate } from "./flow-helpers";

test("required fields block every step, with visible errors and focus", async ({ page }) => {
  await page.goto("/");
  await loadSample(page);
  const field = (name: string) => page.locator(`[name="${name}"]`);
  await field("narratives.travelPurpose").fill("   ");
  await next(page);
  await expect(field("narratives.travelPurpose")).toBeFocused();
  await field("narratives.travelPurpose").fill("Turistik gezi.");
  await next(page);
  await field("profile.occupation").fill("");
  await next(page);
  await expect(field("profile.occupation")).toBeFocused();
  await field("profile.occupation").fill("Mimar");
  await field("profile.hasVisaRefusal").selectOption("Evet");
  await field("profile.visaRefusalCountries").fill("Fransa");
  await next(page);
  await expect(field("profile.refusalExplanation")).toBeFocused();
  await field("profile.hasVisaRefusal").selectOption("Hayır");
  await field("profile.visitedCountryCount").fill("0");
  await expect(field("profile.travelRegions")).toHaveCount(0);
  await next(page);
  await field("profile.fundingMethods").evaluateAll((inputs) => inputs.forEach((input) => {
    if ((input as HTMLInputElement).checked) (input as HTMLInputElement).click();
  }));
  await field("declarations.identity").uncheck();
  await next(page);
  await expect(field("profile.fundingMethods").first()).toBeFocused();
  await expect(page.getByText("En az bir ödeme yöntemi seçin.")).toBeVisible();
  await field("profile.fundingMethods").first().check();
  await next(page);
  await expect(field("declarations.identity")).toBeFocused();
  await field("declarations.identity").check();
  await next(page);
  await expect(page.getByText("Adım 4 / 4", { exact: true })).toBeVisible();
  await expect(page.locator("#form-step-title")).toBeFocused();
  await field("notes").fill("");
  await expect(field("notes")).toHaveValue("");
  await field("narratives.fictionalExcerpts").fill("");
  await page.getByRole("button", { name: "İnceleme raporu oluştur", exact: true }).click();
  await expect(field("notes")).toBeFocused();
  await expect(page.locator("#review-report")).toHaveCount(0);
  await field("notes").fill("Kurgusal inceleme notu.");
  await field("narratives.fictionalExcerpts").fill("Kurgusal otel özeti: 10 gece.");
  await generate(page);
});

test("incomplete sample cannot skip required profile answers", async ({ page }) => {
  await page.goto("/");
  await loadSample(page, "missing");
  await next(page);
  await next(page);
  await expect(page.getByText("Adım 2 / 4", { exact: true })).toBeVisible();
  await expect(page.getByLabel("Çalıştığınız sektör", { exact: true })).toBeFocused();
  await expect(page.locator("#review-report")).toHaveCount(0);
});
