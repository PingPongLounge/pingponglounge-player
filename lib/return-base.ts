/* Wohin darf Stripe nach der Zahlung zurueckfuehren? (11.09.2026)
 *
 * Die drei Checkout-Routen (Turnier, Single Night, Open Game) nehmen vom
 * Aufrufer einen Pfad und eine Basis entgegen. Der Pfad ist ungefaehrlich —
 * er muss mit "/" beginnen. Die Basis ist der heikle Teil: wer die frei
 * setzen darf, kann einen Gast nach der Zahlung auf eine beliebige Seite
 * schicken. Deshalb steht sie hier an EINER Stelle und wird gegen eine feste
 * Liste geprueft.
 *
 * Produktion: ausschliesslich pingponglounge.ch.
 *
 * Vorschau: zusaetzlich die Vorschau-Adressen unseres eigenen Vercel-Teams
 * (…-ping-pong-lounge.vercel.app). Ohne das laesst sich der Bezahlweg vor dem
 * Livegang nicht durchspielen: eine Vorschau-Adresse faellt sonst auf
 * playerapp.ch zurueck, und man testet nicht, was man ausliefert.
 * Die Ausnahme gilt NUR, wenn VERCEL_ENV nicht "production" ist — in der
 * Produktion bleibt die Regel so streng wie vorher.
 */
const PRODUKTION = /^https:\/\/(www\.)?pingponglounge\.ch$/
const VORSCHAU = /^https:\/\/[a-z0-9-]+-ping-pong-lounge\.vercel\.app$/

export function erlaubteBasis(wert: unknown, standard: string): string {
  if (typeof wert !== "string") return standard
  if (PRODUKTION.test(wert)) return wert
  if (process.env.VERCEL_ENV !== "production" && VORSCHAU.test(wert)) return wert
  return standard
}

/** Pfad uebernehmen, aber nur einen eigenen: muss mit "/" beginnen. */
export function erlaubterPfad(wert: unknown, standard: string): string {
  return typeof wert === "string" && wert.startsWith("/") ? wert : standard
}
