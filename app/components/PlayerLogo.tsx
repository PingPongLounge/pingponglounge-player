"use client"

/* PLAYER · Logo — die EINZIGE Stelle, an der das Logo ausgegeben wird.
   Wer ein Logo braucht, importiert von hier. Keine zweite Zeichnung
   irgendwo im Repo.

   30.09.2026: Bis heute wurde das P hier als SVG-Pfad NACHGEZEICHNET —
   eine freie Annaeherung an das echte Logo, mit anderer Kontur, anderen
   Proportionen und der Wortmarke in Anton statt in der Schrift des Logos.
   Dieselbe falsche Zeichnung lag zusaetzlich im SplashScreen. Ab jetzt
   kommen alle Varianten aus public/logo/ und stammen direkt aus den
   Originaldateien:

     Wortmarke   League Spartan ExtraBold, gemessen 99.5 % deckungsgleich
                 mit dem Original-Bitmap (Buchstabenbreiten max. 0.15 % ab)
     Claim       Originalkurven aus der Affinity-Datei
     Ball        exakter Kreis (Radiusabweichung 0.10 %)
     P           Original-Bitmap, eingebettet — das P liegt in KEINER
                 Originaldatei als Vektor vor (siehe Brand Guide)

   Verlauf: waagrecht, zwei Stuetzstellen, #8BFEA1 -> #1BFCC2, ueber die
   Bounding-Box jedes einzelnen Elements. So und nicht anders.

   ton="dunkel"  auf dunklem Grund  -> Markenverlauf
   ton="hell"    auf Off-White      -> AKZENT-Verlauf (#047758 -> #05946E)
   Der Markenverlauf erreicht auf Off-White nur 1,25:1 und waere dort
   praktisch unsichtbar; deshalb die zweite Wertepaarung. */

type Ton = "dunkel" | "hell"

/* Seitenverhaeltnisse der Dateien in public/logo/ — aus deren viewBox.
   Hier hart hinterlegt, damit kein Layout-Sprung entsteht, bevor die
   Datei geladen ist. */
const AV = {
  symbol: 2159 / 2356,          // 0.9164
  vertikal: 2832 / 3252,        // mit Claim
  vertikalOhne: 2832 / 2988,    // ohne Claim
  horizontal: 3895 / 901,       // mit Claim
  horizontalOhne: 3895 / 901,   // ohne Claim
}

interface PlayerLogoProps {
  size?: "sm" | "md" | "lg"
  showTagline?: boolean
  ton?: Ton
}

/* Das vollstaendige, senkrechte Lockup — Login, Splash, Plakat.
   Das ist das Hauptlogo. */
export default function PlayerLogo({
  size = "md",
  showTagline = false,
  ton = "dunkel",
}: PlayerLogoProps) {
  const hoehe = size === "sm" ? 104 : size === "lg" ? 232 : 160
  const farbe = ton === "hell" ? "hell" : "verlauf"
  const datei = showTagline
    ? `/logo/lockup-vertikal-${farbe}.svg`
    : `/logo/lockup-vertikal-ohne-claim-${farbe}.svg`
  const av = showTagline ? AV.vertikal : AV.vertikalOhne

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={datei}
      alt="PLAYER — Ping Pong Liga Schweiz"
      width={Math.round(hoehe * av)}
      height={hoehe}
      style={{ display: "block", margin: "0 auto", height: hoehe, width: "auto" }}
    />
  )
}

/* Nur das Zeichen, ohne Wortmarke — Fusszeile, Kachel, Wasserzeichen.
   Auf dunklem Grund ist der Umriss weiss und nur der Ball gruen, auf
   hellem umgekehrt schwarz mit tiefgruenem Ball. So bleibt Gruen ein
   Akzent und wird nicht zur Markenflaeche (Design-System V3).

   Die Hoehe entspricht exakt der optischen Hoehe der alten Zeichnung
   (0.681 x der damaligen Kantenlaenge) — damit springt nichts im Layout. */
export function PlayerZeichen({ gross = false, aufHell = false }: { gross?: boolean; aufHell?: boolean }) {
  const hoehe = Math.round((gross ? 40 : 24) * 0.681)
  const datei = aufHell
    ? "/logo/symbol-schwarz-ball-akzent.svg"
    : "/logo/symbol-weiss-ball-neon.svg"
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={datei}
      alt="PLAYER"
      width={Math.round(hoehe * AV.symbol)}
      height={hoehe}
      style={{ display: "block", flexShrink: 0, height: hoehe, width: "auto" }}
    />
  )
}

/* Das waagrechte Lockup — Kopfzeile, E-Mail-Kopf, breite Formate.
   Im Kopf ohne Claim: unter etwa 60 px Hoehe ist der Claim nicht mehr
   lesbar und wird zu einer grauen Linie.

   Farbfuehrung wie bei PlayerZeichen: Umriss und Wortmarke in der
   Textfarbe der Umgebung, nur der Ball gruen. Der volle Markenverlauf
   gehoert auf das Hauptlogo, nicht in jede Kopfzeile. */
export function PlayerLockup({
  hoehe = 28,
  mitClaim = false,
  aufHell = false,
  marke = false,
}: { hoehe?: number; mitClaim?: boolean; aufHell?: boolean; marke?: boolean }) {
  // marke=true: das volle Logo im Markenverlauf. 30.09.2026 auf Entscheid
  // hin nur fuer die oeffentliche Startseite — im angemeldeten Bereich
  // bleibt Gruen Signal und wird nicht zur Flaeche.
  const farbe = marke
    ? (aufHell ? "hell" : "verlauf")
    : (aufHell ? "schwarz-ball-akzent" : "weiss-ball-neon")
  const datei = mitClaim
    ? `/logo/lockup-horizontal-${farbe}.svg`
    : `/logo/lockup-horizontal-ohne-claim-${farbe}.svg`
  const av = mitClaim ? AV.horizontal : AV.horizontalOhne
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={datei}
      alt="PLAYER — Ping Pong Liga Schweiz"
      width={Math.round(hoehe * av)}
      height={hoehe}
      style={{ display: "block", height: hoehe, width: "auto" }}
    />
  )
}
