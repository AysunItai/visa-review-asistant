import { defineConfig } from "@playwright/test";

const port = process.env.PLAYWRIGHT_PORT ?? "3000";
const baseURL = `http://127.0.0.1:${port}`;

export default defineConfig({
  testDir: "./tests/browser",
  fullyParallel: false,
  workers: 1,
  reporter: "list",
  use: {
    baseURL,
    locale: "tr-TR",
    timezoneId: "Europe/Berlin",
    channel: "chrome",
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "mobile-320",
      use: {
        viewport: { width: 320, height: 720 },
        isMobile: true,
        hasTouch: true,
      },
    },
    {
      name: "mobile-375",
      use: {
        viewport: { width: 375, height: 812 },
        isMobile: true,
        hasTouch: true,
      },
    },
    {
      name: "tablet-768",
      use: { viewport: { width: 768, height: 1024 }, hasTouch: true },
    },
    {
      name: "tablet-1024",
      use: { viewport: { width: 1024, height: 768 }, hasTouch: true },
    },
    { name: "desktop", use: { viewport: { width: 1440, height: 1100 } } },
    {
      name: "mobile",
      use: {
        viewport: { width: 390, height: 844 },
        isMobile: true,
        hasTouch: true,
      },
    },
  ],
  webServer: {
    command: `npm run start -- --hostname 127.0.0.1 --port ${port}`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 30000,
  },
});
