import type { MetadataRoute } from "next"

/* 30.09.2026: Es gab gar keine robots.txt — und die Middleware fing den Pfad
   ab und leitete ihn auf /login um. Wer /robots.txt anfragte, bekam 307 auf
   eine Anmeldeseite. Genau das holt der Facebook/WhatsApp-Crawler ALS ERSTES,
   bevor er eine Seite fuer die Link-Vorschau liest. Eine robots.txt, die auf
   einen Login zeigt, liest er als "hier darf ich nicht" — und zeigt keine
   Vorschau. Betraf playerapp.ch genauso. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{
      userAgent: "*",
      allow: "/",
      // Nichts davon gehoert in einen Suchindex.
      disallow: ["/api/", "/admin", "/staff", "/liga/match/", "/match/"],
    }],
  }
}
