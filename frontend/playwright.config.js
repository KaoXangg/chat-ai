import { defineConfig } from "@playwright/test";
import { existsSync } from "node:fs";

const executablePath = process.env.PLAYWRIGHT_CHROME_EXECUTABLE || [
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
].find(existsSync);

export default defineConfig({
  testDir: "./test",
  workers: 1,
  use: {
    baseURL: "http://127.0.0.1:4173",
    headless: true,
    permissions: ["clipboard-read", "clipboard-write"],
    launchOptions: { executablePath },
  },
  webServer: {
    command: "npm run preview -- --host 127.0.0.1 --port 4173 --strictPort",
    url: "http://127.0.0.1:4173",
    reuseExistingServer: false,
  },
});
