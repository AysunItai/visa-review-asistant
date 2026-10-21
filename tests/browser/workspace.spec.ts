import { test, expect } from "@playwright/test";

test("three samples, stale report, copy, print, clear and mobile layout", async ({
  page,
  context,
}, testInfo) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("lang", "tr");
  await expect(page.getByText("Her bulgunun bir dayanağı var.")).toBeVisible();
  await page.screenshot({
    path: `test-results/${testInfo.project.name}-empty.png`,
    fullPage: true,
  });
  const report = page.locator("#review-report");
  for (const [key, count] of [
    ["clarification", 3],
    ["consistent", 0],
    ["missing", 4],
  ] as const) {
    await page.getByLabel("Örnek başvuru seçin").selectOption(key);
    await page.getByRole("button", { name: "Örnek Başvuru Yükle" }).click();
    if (key === "clarification")
      await expect(report.getByText("Bilgi bekleniyor")).toBeVisible();
    else
      await expect(
        report.getByText(
          "Başvuru bilgileri değişti. Güncel rapor için yeniden analiz edin."
        )
      ).toBeVisible();
    await page.getByRole("button", { name: "İnceleme Raporu Oluştur" }).click();
    await expect(report.getByText("İncelemeye hazır")).toBeVisible();
    await expect(report.locator(".finding-card")).toHaveCount(count);
    if (key === "clarification") {
      await expect(
        report.getByText(
          "10 gecelik seyahatin 6 gecesi için konaklama bilgisi girildi."
        )
      ).toBeVisible();
      await expect(
        report.getByText("Kalan 4 gece için konaklama planınız nedir?")
      ).toBeVisible();
    }
    if (key === "consistent")
      await expect(
        report.getByText("Bu kontrollerde tutarsızlık tespit edilmedi")
      ).toBeVisible();
    if (key === "missing")
      await expect(
        report.getByRole("heading", {
          name: "Konaklama bilgisi henüz girilmedi",
        })
      ).toBeVisible();
    await page.screenshot({
      path: `test-results/${testInfo.project.name}-${key}.png`,
      fullPage: true,
    });
  }
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.getByRole("button", { name: "Raporu kopyala" }).click();
  await expect(page.getByText("Rapor panoya kopyalandı.")).toBeVisible();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toContain(
    "VizeLens — Ön inceleme raporu"
  );
  await page.evaluate(() => {
    Object.defineProperty(navigator.clipboard, "writeText", {
      configurable: true,
      value: () => Promise.reject(new Error("Permission denied")),
    });
  });
  await page.getByRole("button", { name: "Raporu kopyala" }).click();
  await expect(page.getByText(/Kopyalanamadı/)).toBeVisible();
  await page.emulateMedia({ media: "print" });
  await expect(page.locator(".navigation-rail")).toBeHidden();
  await expect(page.locator(".form-column")).toBeHidden();
  await expect(page.locator(".report-actions").first()).toBeHidden();
  await expect(report).toBeVisible();
  if (testInfo.project.name === "desktop")
    await page.pdf({
      path: "test-results/report.pdf",
      format: "A4",
      printBackground: true,
    });
  await page.emulateMedia({ media: "screen" });
  await page.getByLabel("İnceleme notu").fill("Yeni açıklama");
  await expect(report.getByText("Güncelleme gerekli")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Raporu kopyala" })
  ).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "Raporu yazdır" })
  ).toBeDisabled();
  await page.emulateMedia({ media: "print" });
  await expect(report.locator(".finding-card").first()).toBeHidden();
  await page.emulateMedia({ media: "screen" });
  await page.getByRole("button", { name: "İnceleme Raporu Oluştur" }).click();
  await expect(
    page.getByRole("button", { name: "Raporu kopyala" })
  ).toBeEnabled();
  await page.getByRole("button", { name: "Temizle", exact: true }).click();
  await expect(page.getByLabel("Başvuru referansı")).toHaveValue("");
  await expect(report.getByText("Bilgi bekleniyor")).toBeVisible();
  const widths = await page.evaluate(() => ({
    scroll: document.documentElement.scrollWidth,
    viewport: innerWidth,
  }));
  expect(widths.scroll).toBeLessThanOrEqual(widths.viewport);
  expect(await page.evaluate(() => Object.keys(localStorage))).toEqual([]);
  await page
    .getByRole("button", { name: "Nasıl Çalışır", exact: true })
    .click();
  await expect(
    page.getByRole("heading", {
      name: "Bilgiler netleşir. Değerlendirme insanda kalır.",
    })
  ).toBeVisible();
  await page.getByRole("button", { name: "Başvuru incelemeye başla" }).click();
  await expect(
    page.getByRole("heading", { name: "Başvuru formu" })
  ).toBeVisible();
  expect(errors).toEqual([]);
});

test("inline validation blocks invalid reports and accommodation entries can be changed", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "İnceleme Raporu Oluştur" }).click();
  await expect(page.getByText("Geçerli bir tarih girin.")).toHaveCount(2);
  await expect(
    page.locator("#review-report").getByText("Bilgi bekleniyor")
  ).toBeVisible();
  await page.getByLabel("Örnek başvuru seçin").selectOption("consistent");
  await page.getByRole("button", { name: "Örnek Başvuru Yükle" }).click();
  await page.getByLabel("Kullanılabilir seyahat bütçesi").fill("-100");
  await page.getByRole("button", { name: "İnceleme Raporu Oluştur" }).click();
  await expect(page.getByText(/0 veya daha büyük/)).toBeVisible();
  await page.getByLabel("Kullanılabilir seyahat bütçesi").fill("abc");
  await page.getByRole("button", { name: "İnceleme Raporu Oluştur" }).click();
  await expect(page.getByText(/0 veya daha büyük/)).toBeVisible();
  await page.getByLabel("Kullanılabilir seyahat bütçesi").fill("5000,50");
  const departure = await page
    .getByLabel("Gidiş tarihi", { exact: true })
    .inputValue();
  await page.getByLabel("Çıkış tarihi", { exact: true }).fill(departure);
  await page.getByRole("button", { name: "İnceleme Raporu Oluştur" }).click();
  await expect(
    page.getByText("Çıkış tarihi giriş tarihinden sonra olmalı.")
  ).toBeVisible();
  await page.getByRole("button", { name: "1. konaklamayı kaldır" }).click();
  await page.getByRole("button", { name: "Konaklama ekle" }).click();
  await expect(page.getByLabel("Giriş tarihi", { exact: true })).toHaveValue(
    ""
  );
  await page.getByRole("button", { name: "1. konaklamayı kaldır" }).click();
  await page.getByLabel("Dönüş tarihi", { exact: true }).fill("2020-01-01");
  await page.getByRole("button", { name: "İnceleme Raporu Oluştur" }).click();
  await expect(
    page.getByText("Dönüş tarihi gidiş tarihinden önce olamaz.")
  ).toBeVisible();
  await page.getByLabel("Dönüş tarihi", { exact: true }).fill(departure);
  await page.getByRole("button", { name: "İnceleme Raporu Oluştur" }).click();
  await expect(
    page.locator("#review-report").getByText("Aynı gün dönüş")
  ).toBeVisible();
  await expect(page.locator("#review-report .finding-card")).toHaveCount(0);
  await page.reload();
  await expect(page.getByLabel("Gidiş tarihi", { exact: true })).toHaveValue(
    ""
  );
  await expect(
    page.locator("#review-report").getByText("Bilgi bekleniyor")
  ).toBeVisible();
});
