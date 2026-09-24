/* PLAYER · Community-Gruppen (WhatsApp) — pro Standort eine Gruppe.

   Die Liste unten ist die einzige Stelle, an der etwas gepflegt wird: Name
   plus Einladungslink. Ein Eintrag OHNE `url` erscheint nicht. Sind gar
   keine Links eingetragen, gibt die Komponente `null` zurueck und der
   Abschnitt fehlt vollstaendig — kein leerer Kasten, keine toten Knoepfe.

   Stand 23.09.2026: Basel, Luzern, Zuerich und St. Gallen sind da. Fuer
   Oerlikon und Langstrasse gibt es KEINE eigene Gruppe — beide laufen ueber
   die Zuerich-Gruppe (Oliver, 23.09.). Glattbrugg (PPL24) fehlt noch; sobald
   der QR da ist, kommt der Link in die Zeile und der Standort erscheint.

   Achtung: ein WhatsApp-Einladungslink ist oeffentlich. Wer ihn hat, kann
   der Gruppe beitreten. Deshalb steht hier nur, was auch oeffentlich
   stehen soll.

   Ohne "use client" — reine Anzeige. */

import { IconCommunity, IconPfeil } from "@/app/components/Icons"

export type Gruppe = { stadt: string; url?: string }

export const COMMUNITY_GRUPPEN: Gruppe[] = [
  // Eine Gruppe fuer ganz Zuerich — Oerlikon und Langstrasse gehoeren dazu.
  { stadt: "Zürich",     url: "https://chat.whatsapp.com/KfpICgDTkzj4vHg7FdEtWE" },
  { stadt: "St. Gallen", url: "https://chat.whatsapp.com/IYRI6Pomjg23PSvtvdzdck" },
  { stadt: "Basel",      url: "https://chat.whatsapp.com/J3mokwLglebJGuMkmlVKn5" },
  { stadt: "Luzern",     url: "https://chat.whatsapp.com/Hy9defDUJWb5DPxbvtTG1T" },
  { stadt: "Glattbrugg" },
]

/* Schalter. Steht er auf false, erscheint der Abschnitt nirgends — auch
   dann nicht, wenn oben schon URLs stehen. So bleibt die Struktur fertig
   vorbereitet, ohne dass ein "Beitreten" oeffentlich sichtbar wird, bevor
   Oliver die Gruppen freigibt (Entscheid 23.09.2026). Ein Wort umstellen,
   und der Bereich ist live. */
export const COMMUNITY_FREIGEGEBEN = false

export function hatGruppen(): boolean {
  return COMMUNITY_FREIGEGEBEN && COMMUNITY_GRUPPEN.some(g => !!g.url)
}

export default function CommunityGruppen({
  akzent, text, leise, linie,
}: {
  akzent: string; text: string; leise: string; linie: string
}) {
  const gruppen = COMMUNITY_GRUPPEN.filter(g => !!g.url)
  if (gruppen.length === 0) return null

  return (
    <>
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        gap: 16, paddingBottom: 12, borderBottom: `2px solid ${text}`,
      }}>
        <h2 style={{
          margin: 0, display: "flex", alignItems: "center", gap: 9,
          fontSize: 13, fontWeight: 900, letterSpacing: ".18em", textTransform: "uppercase",
        }}>
          <IconCommunity size={19} /> Community
        </h2>
      </div>

      <p style={{ margin: "12px 0 2px", fontSize: 15, lineHeight: 1.5, color: leise }}>
        Pro Standort eine WhatsApp-Gruppe. Dort werden kurzfristig Spiele
        abgemacht, wenn jemand einen Gegner sucht.
      </p>

      {gruppen.map(g => (
        <a
          key={g.stadt}
          href={g.url}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: "flex", alignItems: "center", gap: 14, padding: "14px 0",
            borderTop: `1px solid ${linie}`, textDecoration: "none", color: text,
            minHeight: 44,
          }}
        >
          <span style={{ flexGrow: 1, minWidth: 0, fontSize: 17, fontWeight: 800 }}>{g.stadt}</span>
          <span style={{
            display: "inline-flex", alignItems: "center", gap: 6, whiteSpace: "nowrap",
            fontSize: 12, fontWeight: 900, letterSpacing: ".08em", textTransform: "uppercase",
            color: akzent,
          }}>
            Beitreten <IconPfeil size={14} />
          </span>
        </a>
      ))}
    </>
  )
}
