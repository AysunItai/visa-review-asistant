import { test, expect, type Route } from "@playwright/test";
import { seedAdmin, loadSample, finalStep, submit, openSubmitted } from "./flow-helpers";
import { assessmentFixture } from "../fixtures/assessment";
import type { AIOutput } from "../../src/lib/ai-contract";

test("failed and invalid AI preserve the case and internal note, with an honest manual retry", async ({ page }) => {
  let calls = 0;
  await page.route("**/api/analyze", async (route) => {
    calls++;
    if (calls === 1) return route.fulfill({ status: 504, json: { status: "unavailable", reason: "timeout" } });
    if (calls === 2) return route.fulfill({ json: { status: "success", result: assessmentFixture({ concernEvidence: [{ fieldId: "invented", value: "Fake" }] }) } });
    return route.fulfill({ json: { status: "success", result: assessmentFixture() } });
  });
  await seedAdmin(page);
  await page.getByRole("button", { name: "DEMO-2026-001 başvurusunu incele" }).click();
  await page.getByLabel("İç inceleme notu", { exact: true }).fill("Korunacak not");
  await page.getByRole("button", { name: "AI değerlendirmesi oluştur", exact: true }).click();
  await expect(page.locator("#analysis-section").getByRole("alert")).toContainText("zaman aşımına");
  await expect(page.locator('[data-field-id="reference"] dd')).toHaveText("DEMO-2026-001");
  await page.getByRole("button", { name: "AI değerlendirmesini yeniden dene" }).click();
  await expect(page.locator("#analysis-section").getByRole("alert")).toContainText("doğrulanamadı");
  await page.getByRole("button", { name: "AI değerlendirmesini yeniden dene" }).click();
  await expect(page.locator(".concern-level")).toHaveText("Düşük");
  await expect(page.getByLabel("İç inceleme notu", { exact: true })).toHaveValue("Korunacak not");
  expect(calls).toBe(3);
});

test("duplicate AI clicks send once and a late result belongs only to the original case", async ({ page }) => {
  let routeA: Route | undefined;
  let calls = 0;
  await page.route("**/api/analyze", (route) => { calls++; routeA = route; });
  await seedAdmin(page);
  await page.getByRole("button", { name: "DEMO-2026-001 başvurusunu incele" }).click();
  await page.getByRole("button", { name: "AI değerlendirmesi oluştur", exact: true }).evaluate((button: HTMLButtonElement) => { button.click(); button.click(); });
  await expect.poll(() => calls).toBe(1);
  await expect(page.getByRole("button", { name: "AI değerlendiriyor…", exact: true })).toBeDisabled();
  await page.getByRole("button", { name: "Başvurulara dön" }).click();
  await page.getByRole("button", { name: "DEMO-2026-002 başvurusunu incele" }).click();
  await routeA!.fulfill({ json: { status: "success", result: assessmentFixture() } });
  await expect(page.locator("#case-title")).toHaveText("DEMO-2026-002");
  await expect(page.locator(".concern-level")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "AI değerlendirmesi oluştur", exact: true })).toBeEnabled();
  await page.getByRole("button", { name: "Başvurulara dön" }).click();
  await page.getByRole("button", { name: "DEMO-2026-001 başvurusunu incele" }).click();
  await expect(page.locator(".concern-level")).toHaveText("Düşük");
  expect(calls).toBe(1);
});

test("AI presents all concern levels separately from clarification priority and human decision", async ({ page }) => {
  const finding = { category: "Belirsizlik" as const, priority: "low" as const, title: "Gezi planını ayrıntılandırın", explanation: "Ziyaret planının ayrıntıları açıklanabilir.", evidence: [{ fieldId: "narratives.travelPurpose", value: "Müzeleri" }], clarificationQuestion: "Hangi müzeleri ziyaret edeceksiniz?" };
  for (const [level, label] of [["low", "Düşük"], ["medium", "Orta"], ["high", "Yüksek"], ["unable_to_assess", "Değerlendirilemiyor"]] as const) {
    await page.unrouteAll();
    const result: AIOutput = assessmentFixture({ concernLevel: level, evidenceSufficiency: level === "unable_to_assess" ? "insufficient" : "sufficient", overallAssessment: level === "low" ? "no_material_concern_identified" : level === "unable_to_assess" ? "insufficient_information" : "clarification_required", findings: ["medium", "high"].includes(level) ? [finding] : [] });
    await page.route("**/api/analyze", (route) => route.fulfill({ json: { status: "success", result } }));
    await seedAdmin(page); await page.getByRole("button", { name: "DEMO-2026-001 başvurusunu incele" }).click();
    await page.getByRole("button", { name: "AI değerlendirmesi oluştur", exact: true }).click();
    await expect(page.locator(".concern-level")).toHaveText(label);
    if (level === "high") await expect(page.getByText("Düşük öncelik", { exact: true })).toBeVisible();
    await expect(page.locator('[name="human-decision"]:checked')).toHaveCount(0);
    await expect(page.locator(".case-overview .case-badge")).toHaveText("İnceleniyor");
  }
});

test("complete active answers are sent only on admin request", async ({ page }) => {
  let payload: Record<string, unknown> | undefined;
  await page.route("**/api/analyze", async (route) => { payload = route.request().postDataJSON(); await route.fulfill({ status: 503, json: { status: "unavailable", reason: "not_configured" } }); });
  await page.goto("/"); await loadSample(page); await finalStep(page); await submit(page);
  expect(payload).toBeUndefined(); await openSubmitted(page);
  await page.getByRole("button", { name: "AI değerlendirmesi oluştur", exact: true }).click();
  await expect(page.locator("#analysis-section").getByRole("alert")).toContainText("yapılandırılmamış");
  const application = payload!.application as { profile: Record<string, unknown>; narratives: Record<string, string>; notes: string };
  expect(application.profile.occupation).toBe("Yazılım geliştirici");
  expect(application.profile.refusalExplanation).toBeUndefined();
  expect(application.profile.relativeRelationship).toBeUndefined();
  expect(application.narratives.funding).toContain("birikimimden");
  expect(application.notes).toBe("");
});
