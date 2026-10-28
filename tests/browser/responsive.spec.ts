import { test, expect, type Page } from "@playwright/test";
import { loadSample, finalStep, generate, editStep, enableAI, next } from "./flow-helpers";

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

test("responsive steps, report, long observations and orientation changes", async ({ page }, testInfo) => {
  await page.route("**/api/analyze", async (route) => {
    await route.fulfill({ json: { status: "success", result: { observations: [{
      category: "Belirsizlik", title: "Kurgusal yerleşim testi",
      explanation: "KurgusalAçıklama".repeat(40),
      evidence: [{ fieldId: "narratives.fictionalExcerpts", quote: "KurgusalAlıntı".repeat(30) }],
      question: "KurgusalNetleştirmeSorusu".repeat(10),
    }] } } });
  });
  await page.goto("/");
  await checkLayout(page);
  await loadSample(page);
  await page.getByLabel("Başvuru referansı").fill("KURGUSAL".repeat(10));
  await page.screenshot({ path: `test-results/${testInfo.project.name}-step-1.png`, fullPage: true });
  await next(page);
  await checkLayout(page);
  await next(page);
  await checkLayout(page);
  await page.screenshot({ path: `test-results/${testInfo.project.name}-step-3.png`, fullPage: true });
  await next(page);
  await page.getByLabel("Kurgusal belge alıntıları", { exact: true }).fill("KurgusalAlıntı".repeat(200));
  await enableAI(page);
  await checkLayout(page);
  await generate(page);
  await expect(page.locator(".ai-observation-card")).toHaveCount(1);
  await checkLayout(page);
  await page.screenshot({ path: `test-results/${testInfo.project.name}-report.png`, fullPage: true });
  const original = page.viewportSize()!;
  await page.setViewportSize({ width: original.height, height: original.width });
  await checkLayout(page);
  if (original.width === 1440) {
    await page.setViewportSize({ width: 720, height: 550 });
    await checkLayout(page);
  }
  await page.setViewportSize(original);
  await page.evaluate(() => Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText: async () => { throw new Error("Mock denied"); } } }));
  await page.getByRole("button", { name: "Raporu kopyala" }).click();
  await expect(page.getByText(/Kopyalanamadı/)).toBeVisible();
});

test("keyboard navigation, validation focus, report focus and reduced motion", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.addInitScript(() => {
    const scroll = Element.prototype.scrollIntoView;
    Element.prototype.scrollIntoView = function (options) {
      if (this.id === "report-title" && typeof options === "object") document.documentElement.dataset.reportScroll = options.behavior;
      scroll.call(this, options);
    };
  });
  await page.goto("/");
  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "İçeriğe geç" })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator("#main")).toBeFocused();
  await page.getByRole("button", { name: "Nasıl Çalışır", exact: true }).focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("heading", { name: "Bilgiler netleşir. Değerlendirme insanda kalır." })).toBeVisible();
  await page.getByRole("button", { name: "Başvuru incelemeye başla" }).click();
  await page.getByRole("button", { name: "Devam", exact: true }).focus();
  await page.keyboard.press("Enter");
  await expect(page.getByLabel("Gidiş tarihi")).toBeFocused();
  await expect(page.getByLabel("Gidiş tarihi")).toHaveAttribute("aria-describedby", "departure-error");
  await loadSample(page);
  await finalStep(page);
  await page.getByRole("button", { name: "İnceleme raporu oluştur", exact: true }).focus();
  await page.keyboard.press("Enter");
  await expect(page.locator("#report-title")).toBeFocused();
  await expect(page.locator(".report-announcement")).toContainText("İnceleme raporu oluşturuldu.");
  await expect(page.locator("html")).toHaveAttribute("data-report-scroll", "auto");
  await page.keyboard.press("Tab");
  await expect(page.getByRole("button", { name: "Başvuruyu düzenle" })).toBeFocused();
  await expect(page.getByRole("button", { name: "Başvuruyu düzenle" })).toHaveCSS("outline-style", "solid");
});

test("final submission finds earlier errors and returns to their step", async ({ page }) => {
  await page.goto("/");
  await loadSample(page);
  await finalStep(page);
  await editStep(page, 2);
  await page.getByLabel("Yaşınız", { exact: true }).fill("121");
  await editStep(page, 1);
  await editStep(page, 4);
  await page.getByRole("button", { name: "İnceleme raporu oluştur", exact: true }).click();
  await expect(page.getByText("Adım 2 / 4", { exact: true })).toBeVisible();
  await expect(page.getByLabel("Yaşınız", { exact: true })).toBeFocused();
  await expect(page.locator("#review-report")).toHaveCount(0);
  await checkLayout(page);
});
