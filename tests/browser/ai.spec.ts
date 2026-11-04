import { assessmentFixture } from "../fixtures/assessment";
import { test, expect } from "@playwright/test";
import { loadSample, finalStep, generate, editStep, enableAI } from "./flow-helpers";

test("AI consent, explicit payload boundary, failure retry and report freshness", async ({ page }) => {
  let calls = 0;
  let fail = false;
  await page.route("**/api/analyze", async (route) => {
    calls++;
    const body = route.request().postDataJSON();
    expect(Object.keys(body).sort()).toEqual(["application", "consent"]);
    expect(Object.keys(body.application).sort()).toEqual(["budget", "currency", "declarations", "departure", "destination", "estimatedCost", "narratives", "notes", "profile", "purpose", "reference", "returnDate", "stays"]);
    expect(Object.keys(body.application.narratives).sort()).toEqual(["accommodation", "fictionalExcerpts", "funding", "travelPurpose"]);
    expect(body.application.profile.occupation).toBe("Yazılım geliştirici");
    expect(body.application.profile.hasVisaRefusal).toBe("Hayır");
    expect(body.application.profile).not.toHaveProperty("refusalExplanation");
    expect(body.application.notes).toBeTruthy();
    expect(body.consent).toBe(true);
    if (fail) { await route.fulfill({ status: 503, json: { status: "unavailable", reason: "provider_error" } }); return; }
    await route.fulfill({ json: { status: "success", result: assessmentFixture({ overallAssessment: "clarification_required", findings: [{
      category: "Belirsizlik", priority: "medium", title: "Kurgusal AI test gözlemi", explanation: "Açıklama netleştirilebilir.",
      evidence: [{ fieldId: "narratives.funding", value: body.application.narratives.funding }],
      clarificationQuestion: "Finansman planını açıklayabilir misiniz?",
    }], consistentPoints: [{ explanation: "Meslek ve çalışma bilgileri beyan edilmiş.", evidence: [{ fieldId: "profile.occupation", value: body.application.profile.occupation }] }] }) } });
  });
  await page.goto("/");
  await loadSample(page, "clarification");
  await finalStep(page);
  await generate(page);
  expect(calls).toBe(0);
  await editStep(page, 4);
  await page.getByRole("radio", { name: "Yerel kontroller + AI Ön Değerlendirme", exact: true }).check();
  await generate(page);
  await expect(page.getByText(/Harici gönderim onayı verilmedi/)).toBeVisible();
  expect(calls).toBe(0);
  await editStep(page, 4);
  await enableAI(page);
  await generate(page);
  await expect(page.getByRole("heading", { name: "Kurgusal AI test gözlemi" })).toBeVisible();
  await expect(page.locator(".finding-card")).toHaveCount(2);
  expect(calls).toBe(1);
  await expect(page.getByRole("heading", { name: "AI Ön Değerlendirme", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Tutarlı noktalar" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Değerlendirme sınırları" })).toBeVisible();
  await expect(page.getByText(/Projede incelenmiş, kaynaklı vize kriterleri bulunmuyor/)).toBeVisible();
  await editStep(page, 2);
  await page.getByLabel("Mesleğiniz", { exact: true }).fill("Mimar");
  await expect(page.getByText(/Son rapor güncel değil/)).toBeVisible();
  await page.getByLabel("Mesleğiniz", { exact: true }).fill("Yazılım geliştirici");
  await editStep(page, 3);
  await page.getByLabel("Finansman açıklaması", { exact: true }).fill("Güncellenen kurgusal açıklama.");
  await editStep(page, 4);
  await expect(page.getByRole("checkbox", { name: /Gönderilecek tüm başvuru yanıtlarını kontrol ettim/ })).not.toBeChecked();
  fail = true;
  await enableAI(page);
  await generate(page);
  await expect(page.getByText(/AI sağlayıcısına erişilemedi/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Raporu kopyala" })).toBeEnabled();
  fail = false;
  await page.getByRole("button", { name: "Yapay zekâ incelemesini yeniden dene" }).click();
  await expect(page.getByRole("heading", { name: "Kurgusal AI test gözlemi" })).toBeVisible();
  expect(calls).toBe(3);
});

test("pending AI cannot replace an edited or cleared report and duplicate submission is blocked", async ({ page }) => {
  let release: (() => void) | undefined;
  let calls = 0;
  await page.route("**/api/analyze", async (route) => {
    calls++;
    await new Promise<void>((resolve) => { release = resolve; });
    await route.fulfill({ json: { status: "success", result: assessmentFixture() } }).catch(() => {});
  });
  await page.goto("/");
  await loadSample(page);
  await finalStep(page);
  await enableAI(page);
  const requested = page.waitForRequest("**/api/analyze");
  await generate(page);
  await requested;
  await expect(page.locator('button[type="submit"]')).toBeDisabled();
  await page.locator("form").dispatchEvent("submit");
  await page.locator("form").dispatchEvent("submit");
  await expect(page.getByText("OpenAI yanıtı bekleniyor. Yerel rapor hazır.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Yapay zekâ incelemesini yeniden dene" })).toHaveCount(0);
  await editStep(page, 1);
  await page.getByLabel("Seyahat amacı açıklaması", { exact: true }).fill("Değişen açıklama.");
  await page.getByRole("button", { name: "Son raporu görüntüle" }).click();
  await expect(page.getByText(/Bilgiler değiştiği için AI isteği iptal edildi/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Raporu kopyala" })).toBeDisabled();
  await editStep(page, 1);
  await page.getByRole("button", { name: "Temizle", exact: true }).click();
  release?.();
  await expect(page.locator("#review-report")).toHaveCount(0);
  await expect(page.locator(".ai-observation-card")).toHaveCount(0);
  expect(calls).toBe(1);
});

test("all assessment statuses, priority ordering, supported points and export limits", async ({ page, context }, testInfo) => {
  let result = assessmentFixture();
  await page.route("**/api/analyze", (route) => route.fulfill({ json: { status: "success", result } }));
  await page.goto("/");
  const findings = [
    { category: "Finansman" as const, priority: "low" as const, title: "İkinci konu", explanation: "Finansman açıklaması ayrıntılandırılabilir.", evidence: [{ fieldId: "narratives.funding", value: "Seyahat giderlerini" }], clarificationQuestion: "Finansman planını açıklayabilir misiniz?" },
    { category: "Belirsizlik" as const, priority: "high" as const, title: "Öncelikli konu", explanation: "İnceleme notunun açıklanması gerekiyor.", evidence: [{ fieldId: "notes", value: "Kurgusal başvurunun" }], clarificationQuestion: "Bu notu açıklayabilir misiniz?" },
  ];
  for (const [status, label] of [
    ["no_material_concern_identified", "Önemli bir sorun tespit edilmedi"],
    ["clarification_required", "Açıklama gerekiyor"],
    ["insufficient_information", "Değerlendirme için bilgi yetersiz"],
    ["significant_concerns_identified", "Önemli açıklama gerektiren konular belirlendi"],
  ] as const) {
    result = assessmentFixture({
      overallAssessment: status,
      findings: status === "significant_concerns_identified" ? findings : status === "clarification_required" ? [findings[0]] : [],
      consistentPoints: [{ explanation: "Meslek bilgisi beyan edilmiş.", evidence: [{ fieldId: "profile.occupation", value: "Yazılım geliştirici" }] }],
    });
    await loadSample(page);
    await finalStep(page);
    await enableAI(page);
    await generate(page);
    await expect(page.getByRole("heading", { name: label, exact: true })).toBeVisible();
    await expect(page.getByText("Meslek bilgisi beyan edilmiş.", { exact: true })).toBeVisible();
    await expect(page.getByText(/Önemli bir sorun tespit edilmemesi vize uygunluğunu/)).toBeVisible();
  }
  await expect(page.locator(".ai-observation-card").first()).toContainText("Öncelikli konu");
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.getByRole("button", { name: "Raporu kopyala" }).click();
  await expect(page.getByText("Rapor panoya kopyalandı.")).toBeVisible();
  const copied = await page.evaluate(() => navigator.clipboard.readText());
  expect(copied).toContain("AI Ön Değerlendirme");
  expect(copied).toContain("Tutarlı noktalar");
  expect(copied).toContain("hiçbir belge doğrulanmadı");
  expect(copied.indexOf("Öncelikli konu")).toBeLessThan(copied.indexOf("İkinci konu"));
  await page.locator('section[aria-labelledby="ai-assessment-title"]').screenshot({ path: `test-results/${testInfo.project.name}-assessment.png` });
  await page.emulateMedia({ media: "print" });
  await expect(page.getByRole("heading", { name: "AI Ön Değerlendirme", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Değerlendirme sınırları" })).toBeVisible();
});

test("invented model evidence shows an error and retry preserves the application", async ({ page }) => {
  let invalid = true;
  await page.route("**/api/analyze", (route) => route.fulfill({ json: {
    status: "success", result: assessmentFixture({
      consistentPoints: [{ explanation: "Doğrulanamayan model iddiası", evidence: [{ fieldId: "profile.occupation", value: invalid ? "Uydurulmuş meslek" : "Yazılım geliştirici" }] }],
    }),
  } }));
  await page.goto("/");
  await loadSample(page);
  await finalStep(page);
  await enableAI(page);
  await generate(page);
  await expect(page.getByRole("alert").filter({ hasText: "AI yanıtının biçimi veya dayanakları doğrulanamadı" })).toBeVisible();
  await expect(page.getByText("Doğrulanamayan model iddiası", { exact: true })).toHaveCount(0);
  invalid = false;
  await page.getByRole("button", { name: "Yapay zekâ incelemesini yeniden dene" }).click();
  await expect(page.getByRole("heading", { name: "Önemli bir sorun tespit edilmedi", exact: true })).toBeVisible();
  await editStep(page, 2);
  await expect(page.getByLabel("Mesleğiniz", { exact: true })).toHaveValue("Yazılım geliştirici");
});
