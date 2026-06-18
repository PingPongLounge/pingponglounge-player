import { redirect } from 'next/navigation'

// Alte Dashboard-Seite ersetzt durch die Startseite /entdecken
export default function DashboardRedirect() {
  redirect('/entdecken')
}
