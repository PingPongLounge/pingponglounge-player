import { createBrowserClient } from '@supabase/ssr'

/* ─── EIN Browser-Client pro Tab (19.08.2026) ─────────────────────────────────
   createClient() wurde in jeder Komponente aufgerufen und erzeugte jedes Mal
   einen neuen GoTrue-Client. Folge: die Konsolenwarnung "Multiple GoTrueClient
   instances detected" und mehrere Listener am selben Token — genau die
   Konstellation, in der eine Anmeldung auf einer anderen Seite verloren geht.

   Jetzt: einmal erzeugen, danach immer denselben zurueckgeben. Auf dem Server
   (kein window) bewusst NICHT zwischenspeichern, damit sich die Anfragen
   verschiedener Nutzer keinen Client teilen. */

function erzeuge() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

// Der Typ kommt aus der Fabrik selbst — so bleibt die Typherleitung an allen
// Aufrufstellen genau so, wie sie vorher war.
let browserClient: ReturnType<typeof erzeuge> | null = null

export function createClient() {
  if (typeof window === 'undefined') return erzeuge()
  if (!browserClient) browserClient = erzeuge()
  return browserClient
}
