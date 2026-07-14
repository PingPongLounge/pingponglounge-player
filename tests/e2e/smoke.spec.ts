import { test, expect } from "@playwright/test"

// Rauchtest: läuft ohne Login und ohne Testkonto. Er beantwortet die Frage,
// die nach jeder Änderung zählt: Steht die App überhaupt noch?

test("die ausgeloggte Startseite lädt und lädt zum Anmelden ein", async ({ page }) => {
  await page.goto("/entdecken")
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Spiel. Trag ein.")
  await expect(page.getByRole("link", { name: /login \/ registrieren/i })).toBeVisible()
})

test("die Login-Seite lädt", async ({ page }) => {
  await page.goto("/login")
  await expect(page.locator('input[type="email"]')).toBeVisible()
})

test("geschützte Seiten schicken Ausgeloggte zum Login — und nirgendwo anders hin", async ({ page }) => {
  for (const pfad of ["/liga", "/match", "/turniere", "/profil", "/pingpoints"]) {
    await page.goto(pfad)
    await expect(page).toHaveURL(/\/login/)
  }
})

test("keine Seite wirft einen Fehler in die Konsole", async ({ page }) => {
  const fehler: string[] = []
  page.on("pageerror", e => fehler.push(String(e)))
  page.on("console", m => { if (m.type() === "error") fehler.push(m.text()) })

  await page.goto("/entdecken")
  await page.goto("/login")
  await page.waitForTimeout(500)

  // Fehlende Bilder o.ä. sind egal — echte JavaScript-Abstürze nicht.
  const echte = fehler.filter(f => !/favicon|manifest|404|Failed to load resource/i.test(f))
  expect(echte).toEqual([])
})

test("die Share-Karte und die App-Icons sind wirklich da", async ({ request }) => {
  // Ohne diese Dateien kommt in WhatsApp eine nackte Zeile an und Safari zeigt
  // eine graue Kachel. Beides ist schon einmal passiert.
  for (const datei of ["/share-card.jpg", "/apple-touch-icon.png", "/site.webmanifest", "/favicon.svg"]) {
    const res = await request.get(datei)
    expect(res.status(), datei).toBe(200)
  }
})
