import { test, expect } from "@playwright/test";

// Every AI request is intercepted. This suite can NEVER make a billable request.
test("AI opt-in, separate observations, local fallback, and stale narrative inputs", async ({
  page,
}) => {
  let calls = 0;
  let fail = false;
  await page.route("**/api/analyze", async (route) => {
    calls++;
    const body = route.request().postDataJSON();
    expect(body).not.toHaveProperty("reference");
    expect(body).not.toHaveProperty("notes");
    expect(body.context).not.toHaveProperty("reference");
    expect(body.context).not.toHaveProperty("notes");
    expect(body.anonymized).toBe(true);
    if (fail) {
      await route.fulfill({
        status: 503,
        json: { status: "unavailable", reason: "not_configured" },
      });
      return;
    }
    await route.fulfill({
      json: {
        status: "success",
        result: {
          observations: [
            {
              category: "Belirsizlik",
              title: "Kurgusal AI test gözlemi",
              explanation: "Girilen açıklama netleştirilebilir.",
              evidence: [
                {
                  fieldId: "narratives.funding",
                  quote: body.narratives.funding,
                },
              ],
              question: "Finansman planını açıklayabilir misiniz?",
            },
          ],
        },
      },
    });
  });
  await page.goto("/");
  await page.getByRole("button", { name: "Örnek Başvuru Yükle" }).click();
  await page.getByRole("button", { name: "İnceleme Raporu Oluştur" }).click();
  await expect(page.locator("#review-report .finding-card")).toHaveCount(3);
  expect(calls).toBe(0);
  await page
    .getByRole("radio", {
      name: "Yerel kontroller + OpenAI gözlemleri",
      exact: true,
    })
    .check();
  await page.getByRole("button", { name: "İnceleme Raporu Oluştur" }).click();
  await expect(page.getByText(/Harici gönderim onayı verilmedi/)).toBeVisible();
  expect(calls).toBe(0);
  await page
    .getByRole("checkbox", { name: /Gönderilecek açıklamaları kontrol ettim/ })
    .check();
  await page.getByRole("button", { name: "İnceleme Raporu Oluştur" }).click();
  await expect(
    page.getByRole("heading", { name: "Kurgusal AI test gözlemi" })
  ).toBeVisible();
  await expect(page.locator("#review-report .finding-card")).toHaveCount(3);
  expect(calls).toBe(1);
  await page
    .getByLabel("Finansman açıklaması", { exact: true })
    .fill("Güncellenen kurgusal açıklama.");
  await expect(
    page.getByRole("button", { name: "Raporu kopyala" })
  ).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "Raporu yazdır" })
  ).toBeDisabled();
  await expect(
    page.getByRole("checkbox", {
      name: /Gönderilecek açıklamaları kontrol ettim/,
    })
  ).not.toBeChecked();
  fail = true;
  await page
    .getByRole("checkbox", { name: /Gönderilecek açıklamaları kontrol ettim/ })
    .check();
  await page.getByRole("button", { name: "İnceleme Raporu Oluştur" }).click();
  await expect(page.getByText(/AI yapılandırılmamış/)).toBeVisible();
  await expect(page.locator(".ai-observation-card")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Raporu kopyala" })
  ).toBeEnabled();
  await expect(page.locator("#review-report .finding-card")).toHaveCount(3);
});

test("late AI responses cannot replace a cleared or edited report", async ({
  page,
}) => {
  let release: (() => void) | undefined;
  await page.route("**/api/analyze", async (route) => {
    await new Promise<void>((resolve) => {
      release = resolve;
    });
    await route
      .fulfill({ json: { status: "success", result: { observations: [] } } })
      .catch(() => {});
  });
  await page.goto("/");
  await page.getByRole("button", { name: "Örnek Başvuru Yükle" }).click();
  await page
    .getByRole("radio", {
      name: "Yerel kontroller + OpenAI gözlemleri",
      exact: true,
    })
    .check();
  await page
    .getByRole("checkbox", { name: /Gönderilecek açıklamaları kontrol ettim/ })
    .check();
  const requested = page.waitForRequest("**/api/analyze");
  await page.getByRole("button", { name: "İnceleme Raporu Oluştur" }).click();
  await requested;
  await expect(
    page.getByText("OpenAI yanıtı bekleniyor. Yerel rapor hazır.")
  ).toBeVisible();
  await page
    .getByLabel("Seyahat amacı açıklaması", { exact: true })
    .fill("Değişen açıklama.");
  await expect(
    page.getByText(/Bilgiler değiştiği için AI isteği iptal edildi/)
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Raporu kopyala" })
  ).toBeDisabled();
  await page.getByRole("button", { name: "Temizle", exact: true }).click();
  release?.();
  await expect(
    page.locator("#review-report").getByText("Bilgi bekleniyor")
  ).toBeVisible();
  await expect(page.locator(".ai-observation-card")).toHaveCount(0);
});
