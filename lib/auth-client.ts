"use client"
/* Ein 401 heisst: keine oder abgelaufene Session — nie "ein Fehler".
   Bis zum 24.09.2026 haben mehrere Seiten die Antwort der Middleware
   ungeprueft in ihre Fehlerzeile geschrieben. Der Besucher las dann
   woertlich "Unauthorized": englisch, technisch und ohne Weg weiter.
   Gesehen hat das vor allem, wer aus einer Mail kam — dort ist auf dem
   Geraet oft keine Session.

   pruefeAuth gehoert hinter JEDEN schreibenden fetch einer Seite, die
   auch ohne Konto erreichbar ist. */

/** Zum Login — und danach genau hierher zurueck, samt Suchparametern. */
export function zumLogin() {
  const zurueck = window.location.pathname + window.location.search
  window.location.href = "/login?returnTo=" + encodeURIComponent(zurueck)
}

/** true = weitermachen. false = es geht gerade zum Login. */
export function pruefeAuth(r: Response): boolean {
  if (r.status === 401) { zumLogin(); return false }
  return true
}
