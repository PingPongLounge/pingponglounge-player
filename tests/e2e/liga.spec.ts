import { test, expect } from "@playwright/test"

// Der Weg, den ein Spieler geht: anmelden → Liga → Rangliste → Ergebnis eintragen.
//
// Dieser Test hätte den Dauer-Logout gefangen: Er klickt sich hin und her,
// und genau dabei lud Next.js die Seiten im Hintergrund vor — was die Middleware
// dazu brachte, die Session-Cookies zu löschen.
//
// Braucht ein Testkonto. Ohne E2E_EMAIL/E2E_PASSWORD wird übersprungen,
// damit der Rauchtest trotzdem läuft.
const EMAIL = process.env.E2E_EMAIL
const PASSWORT = process.env.E2E_PASSWORD

test.describe("Eingeloggt", () => {
  test.skip(!EMAIL || !PASSWORT, "Kein Testkonto gesetzt (E2E_EMAIL / E2E_PASSWORD)")

  test.beforeEach(async ({ page }) => {
    await page.goto("/login")
    await page.locator('input[type="email"]').fill(EMAIL!)
    await page.locator('input[type="password"]').fill(PASSWORT!)
    await page.getByRole("button", { name: /anmelden|login/i }).first().click()
    await page.waitForURL(/\/entdecken/, { timeout: 15_000 })
  })

  test("die Startseite zeigt Rang und Punkte", async ({ page }) => {
    await expect(page.getByText(/deine position/i)).toBeVisible()
    await expect(page.getByText(/punkte/i).first()).toBeVisible()
  })

  test("man bleibt eingeloggt, wenn man zwischen den Seiten wechselt", async ({ page }) => {
    // GENAU DER BUG: Hin und her klicken warf einen raus.
    for (const pfad of ["/liga", "/match", "/turniere", "/entdecken", "/liga"]) {
      await page.goto(pfad)
      await expect(page, `${pfad} hat zum Login umgeleitet — die Session ist verloren gegangen`)
        .not.toHaveURL(/\/login/)
    }
  })

  test("die Liga zeigt die vier Ligen und eine Rangliste", async ({ page }) => {
    await page.goto("/liga")
    for (const liga of ["Rookie", "Challenger", "Advanced", "Elite"]) {
      await expect(page.getByRole("button", { name: liga })).toBeVisible()
    }
    await expect(page.getByText(/spieler/i).first()).toBeVisible()
  })

  test("Ergebnis eintragen öffnet die Gegner-Auswahl", async ({ page }) => {
    await page.goto("/liga")
    const eintragen = page.getByRole("button", { name: /ergebnis eintragen/i })
    if (await eintragen.count() === 0) test.skip(true, "Noch keine Liga-Mitgliedschaft")
    await eintragen.click()
    await expect(page.getByText(/gegen wen hast du gespielt/i)).toBeVisible()
  })

  test("der Liga-Chat hat ein sichtbares Schreibfeld", async ({ page }) => {
    // War monatelang hinter der Bottom-Navigation versteckt.
    await page.goto("/liga")
    await page.getByRole("button", { name: /chat/i }).first().click()
    const feld = page.getByPlaceholder(/nachricht an die liga/i)
    await expect(feld).toBeVisible()
    await expect(feld).toBeInViewport()
  })
})
