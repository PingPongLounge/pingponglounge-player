import { redirect } from 'next/navigation'

export default function Root() {
  // Startseite ist /entdecken — eingeloggt der echte Inhalt,
  // ausgeloggt die öffentliche Teaser-Version mit Login-Button.
  redirect('/entdecken')
}
