import { test, expect } from "@playwright/test";
import { loadSample, finalStep, generate, editStep, enableAI } from "./flow-helpers";

test("AI consent, explicit payload boundary, failure retry and report freshness", async ({ page }) => {
  let calls = 0;
  let fail = false;
  await page.route("**/api/analyze", async (route) => {
    calls++;
    const body = route.request().postDataJSON();
    expect(Object.keys(body).sort()).toEqual(["anonymized", "context", "narratives"]);
    expect(Object.keys(body.context).sort()).toEqual(["budget", "currency", "declarations", "departure", "destination", "estimatedCost", "purpose", "returnDate", "stays"]);
    expect(Object.keys(body.narratives).sort()).toEqual(["accommodation", "fictionalExcerpts", "funding", "travelPurpose"]);
    expect(JSON.stringify(body)).not.toContain("Yazılım geliştirici");
    if (fail) { await route.fulfill({ status: 503, json: { status: "unavailable", reason: "provider_error" } }); return; }
    await route.fulfill({ json: { status: "success", result: { observations: [{
      category: "Belirsizlik", title: "Kurgusal AI test gözlemi", explanation: "Açıklama netleştirilebilir.",
      evidence: [{ fieldId: "narratives.funding", quote: body.narratives.funding }],
      question: "Finansman planını açıklayabilir misiniz?",
    }] } } });
  });
  await page.goto("/");
  await loadSample(page, "clarification");
  await finalStep(page);
  await generate(page);
  expect(calls).toBe(0);
  await editStep(page, 4);
  await page.getByRole("radio", { name: "Yerel kontroller + OpenAI gözlemleri", exact: true }).check();
  await generate(page);
  await expect(page.getByText(/Harici gönderim onayı verilmedi/)).toBeVisible();
  expect(calls).toBe(0);
  await editStep(page, 4);
  await enableAI(page);
  await generate(page);
  await expect(page.getByRole("heading", { name: "Kurgusal AI test gözlemi" })).toBeVisible();
  await expect(page.locator(".finding-card")).toHaveCount(3);
  expect(calls).toBe(1);
  await editStep(page, 3);
  await page.getByLabel("Finansman açıklaması", { exact: true }).fill("Güncellenen kurgusal açıklama.");
  await editStep(page, 4);
  await expect(page.getByRole("checkbox", { name: /Gönderilecek açıklamaları kontrol ettim/ })).not.toBeChecked();
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
    await route.fulfill({ json: { status: "success", result: { observations: [] } } }).catch(() => {});
  });
  await page.goto("/");
  await loadSample(page);
  await finalStep(page);
  await enableAI(page);
  const requested = page.waitForRequest("**/api/analyze");
  await generate(page);
  await requested;
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
