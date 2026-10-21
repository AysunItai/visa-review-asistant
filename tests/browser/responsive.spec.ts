import { test, expect, type Page } from "@playwright/test";

// All AI responses in this suite are mocked. Never contact a provider.
test.beforeEach(async ({ page }) => {
  await page.route("**/api/analyze", (route) =>
    route.fulfill({
      status: 503,
      json: { status: "unavailable", reason: "not_configured" },
    })
  );
});

async function checkLayout(page: Page) {
  const failures = await page.evaluate(() => {
    const problems: string[] = [];
    const viewport = document.documentElement.clientWidth;
    if (document.documentElement.scrollWidth > viewport + 1)
      problems.push("Page overflows horizontally");
    for (const element of document.querySelectorAll<HTMLElement>(
      ".navigation-rail, .topbar, .form-panel, .report-panel, .finding-card, .ai-observation-card, .field-control, .choice-label, .metrics, blockquote, h1, h2, h3, h4"
    )) {
      if (!element.getClientRects().length) continue;
      const box = element.getBoundingClientRect();
      if (box.left < -1 || box.right > viewport + 1)
        problems.push(
          `Outside viewport: ${element.className || element.tagName}`
        );
      if (
        element.matches(".field-control") &&
        parseFloat(getComputedStyle(element).fontSize) < 16
      )
        problems.push(`Small input text: ${element.id}`);
    }
    for (const element of document.querySelectorAll<HTMLElement>(
      "button, .brand, .field-control, .choice-label"
    )) {
      if (!element.getClientRects().length) continue;
      const box = element.getBoundingClientRect();
      if (box.width < 43.9 || box.height < 43.9)
        problems.push(
          `Small touch target: ${
            element.getAttribute("aria-label") ||
            element.textContent?.trim() ||
            element.id
          }`
        );
    }
    return problems;
  });
  expect(failures).toEqual([]);
}

test("responsive form, repeated stays, all samples, and validation", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator('meta[name="viewport"]')).toHaveAttribute(
    "content",
    /width=device-width/
  );
  await expect(
    page.getByText("Araştırma prototipi", { exact: true })
  ).toBeVisible();
  await checkLayout(page);
  await page.getByRole("button", { name: "İnceleme Raporu Oluştur" }).click();
  await expect(page.locator('[aria-invalid="true"]')).toHaveCount(4);
  await checkLayout(page);
  for (const [sample, count] of [
    ["clarification", 3],
    ["consistent", 0],
    ["missing", 4],
  ] as const) {
    await page.getByLabel("Örnek başvuru seçin").selectOption(sample);
    await page.getByRole("button", { name: "Örnek Başvuru Yükle" }).click();
    await page.getByRole("button", { name: "İnceleme Raporu Oluştur" }).click();
    await expect(page.locator(".finding-card")).toHaveCount(count);
    await expect(page.locator("#report-title")).toBeFocused();
    await checkLayout(page);
  }
  await page.getByRole("button", { name: "Konaklama ekle" }).click();
  await page.getByRole("button", { name: "Konaklama ekle" }).click();
  await expect(page.getByLabel("Giriş tarihi", { exact: true })).toHaveCount(2);
  await checkLayout(page);
  await page.getByRole("button", { name: "2. konaklamayı kaldır" }).click();
  await page.getByRole("button", { name: "1. konaklamayı kaldır" }).click();
  await expect(page.getByLabel("Giriş tarihi", { exact: true })).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Raporu kopyala" })
  ).toBeDisabled();
  await checkLayout(page);
});

test("long mocked observations, loading, errors, copy and orientation changes", async ({
  page,
}, testInfo) => {
  let reason:
    | "not_configured"
    | "provider_error"
    | "timeout"
    | "invalid_response"
    | undefined;
  let release: (() => void) | undefined;
  await page.route("**/api/analyze", async (route) => {
    if (reason) {
      await route.fulfill({
        status: 503,
        json: { status: "unavailable", reason },
      });
      return;
    }
    await new Promise<void>((resolve) => {
      release = resolve;
    });
    await route.fulfill({
      json: {
        status: "success",
        result: {
          observations: [
            {
              category: "Belirsizlik",
              title:
                "Kurgusal yerleşim testi — açıklama gerektiren uzun seyahat bilgileri",
              explanation: "KurgusalAçıklama".repeat(40),
              evidence: [
                {
                  fieldId: "narratives.fictionalExcerpts",
                  quote: "KurgusalAlıntı".repeat(30),
                },
              ],
              question: "KurgusalNetleştirmeSorusu".repeat(10),
            },
          ],
        },
      },
    });
  });
  await page.goto("/");
  await page.getByRole("button", { name: "Örnek Başvuru Yükle" }).click();
  await page.getByLabel("Başvuru referansı").fill("KURGUSAL".repeat(10));
  await page
    .getByLabel("Kurgusal belge alıntıları", { exact: true })
    .fill("KurgusalAlıntı".repeat(200));
  await page
    .getByRole("radio", {
      name: "Yerel kontroller + OpenAI gözlemleri",
      exact: true,
    })
    .check();
  const consent = page.getByRole("checkbox", {
    name: /Gönderilecek açıklamaları kontrol ettim/,
  });
  await consent.check();
  await page.getByRole("button", { name: "İnceleme Raporu Oluştur" }).click();
  await expect(
    page.getByText("OpenAI yanıtı bekleniyor. Yerel rapor hazır.")
  ).toBeVisible();
  await expect(page.locator("#report-title")).toBeFocused();
  await checkLayout(page);
  release?.();
  await expect(page.locator(".ai-observation-card")).toHaveCount(1);
  await checkLayout(page);
  await page.screenshot({
    path: `test-results/${testInfo.project.name}-mock-long-report.png`,
    fullPage: true,
  });
  await page.evaluate(() => {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: async () => {} },
    });
  });
  await page.getByRole("button", { name: "Raporu kopyala" }).click();
  await expect(page.getByText("Rapor panoya kopyalandı.")).toBeVisible();
  await page.evaluate(() => {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: async () => {
          throw new Error("Mock denied");
        },
      },
    });
  });
  await page.getByRole("button", { name: "Raporu kopyala" }).click();
  await expect(page.getByText(/Kopyalanamadı/)).toBeVisible();
  await checkLayout(page);
  const original = page.viewportSize()!;
  await page.setViewportSize({
    width: original.height,
    height: original.width,
  });
  await checkLayout(page);
  // Reflow equivalent only: actual 200% browser zoom remains a manual check.
  if (original.width === 1440) {
    await page.setViewportSize({ width: 720, height: 550 });
    await checkLayout(page);
  }
  await page.setViewportSize(original);
  for (const [failure, message] of [
    ["not_configured", "AI yapılandırılmamış"],
    ["provider_error", "AI sağlayıcısına erişilemedi"],
    ["timeout", "AI isteği zaman aşımına uğradı"],
    ["invalid_response", "AI yanıtının biçimi"],
  ] as const) {
    reason = failure;
    await page.getByRole("button", { name: "İnceleme Raporu Oluştur" }).click();
    await expect(page.getByText(new RegExp(message))).toBeVisible();
    await checkLayout(page);
  }
  await page.getByLabel("İnceleme notu").fill("Kurgusal değişiklik.");
  await expect(page.locator(".stale-alert")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Raporu yazdır" })
  ).toBeDisabled();
  await checkLayout(page);
});

test("keyboard navigation, report focus, completion announcement and reduced motion", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.addInitScript(() => {
    const scroll = Element.prototype.scrollIntoView;
    Element.prototype.scrollIntoView = function (options) {
      if (this.id === "report-title" && typeof options === "object")
        document.documentElement.dataset.reportScroll = options.behavior;
      scroll.call(this, options);
    };
  });
  await page.goto("/");
  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "İçeriğe geç" })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator("#main")).toBeFocused();
  await page
    .getByRole("button", { name: "Nasıl Çalışır", exact: true })
    .focus();
  await page.keyboard.press("Enter");
  await expect(
    page.getByRole("heading", {
      name: "Bilgiler netleşir. Değerlendirme insanda kalır.",
    })
  ).toBeVisible();
  await checkLayout(page);
  await page.getByRole("button", { name: "Başvuru incelemeye başla" }).focus();
  await page.keyboard.press("Enter");
  await page.getByRole("button", { name: "Örnek Başvuru Yükle" }).focus();
  await page.keyboard.press("Space");
  await page.getByRole("button", { name: "İnceleme Raporu Oluştur" }).focus();
  await page.keyboard.press("Enter");
  await expect(page.locator("#report-title")).toBeFocused();
  await expect(page.locator(".report-announcement")).toContainText(
    "İnceleme raporu oluşturuldu."
  );
  await expect(page.locator("html")).toHaveAttribute(
    "data-report-scroll",
    "auto"
  );
  await page.keyboard.press("Tab");
  await expect(
    page.getByRole("button", { name: "Raporu kopyala" })
  ).toBeFocused();
  await expect(page.getByRole("button", { name: "Raporu kopyala" })).toHaveCSS(
    "outline-style",
    "solid"
  );
});
