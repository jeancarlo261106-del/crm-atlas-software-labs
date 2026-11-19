import { defineConfig } from "@playwright/test";
import { existsSync } from "node:fs";
export default defineConfig({
  testDir: "./tests",
  workers: 1,
  timeout: 60000,
  use: {
    actionTimeout: 10000,
    baseURL: "http://127.0.0.1:4174",
    channel: existsSync("/Applications/Google Chrome.app")
      ? "chrome"
      : undefined,
    viewport: { width: 1440, height: 960 },
  },
  webServer: {
    command: "npm run preview -- --host 127.0.0.1 --port 4174 --strictPort",
    url: "http://127.0.0.1:4174",
    reuseExistingServer: false,
  },
});
