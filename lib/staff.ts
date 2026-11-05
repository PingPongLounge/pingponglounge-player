// Zentrales STAFF_EMAILS — hier pflegen, nicht in einzelnen Routen
export const STAFF_EMAILS = [
  "info@pingponglounge.ch",
  "elia@pingponglounge.ch",
  "oliver.hinnen@gmail.com",
]

/* 05.11.2026 (Oliver): Interne Benachrichtigungsmails — etwa zu jeder
   Turnieranmeldung — gehen nur noch an info@. Oliver und Elia wollen sie
   nicht mehr einzeln im Postfach haben; info@ lesen beide.
   WICHTIG: Das ist NICHT dasselbe wie STAFF_EMAILS. STAFF_EMAILS steuert
   weiterhin die Admin-Rechte (lib/roles.ts, /admin/*) — wer dort entfernt
   wird, verliert den Zugang. Darum zwei getrennte Listen. */
export const MAIL_EMPFAENGER_INTERN = ["info@pingponglounge.ch"]
