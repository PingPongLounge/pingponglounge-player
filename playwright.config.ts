import { defineConfig, devices } from "@playwright/test"

// Prüft die App im echten Browser — den Weg, den die Spieler gehen.
// Läuft gegen die laufende App (lokal per `npm run build && npm start`,
// in der GitHub Action gegen denselben Build).
export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 30_000,
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "line" : "list",
  use: {
    baseURL: process.env.E2E_URL || "http://localhost:3000",
    trace: "retain-on-failure",
  },
  projects: [
    { name: "iPhone", use: { ...devices["iPhone 13"] } },
  ],
  webServer: process.env.E2E_URL ? undefined : {
    command: "npm run start",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
})
