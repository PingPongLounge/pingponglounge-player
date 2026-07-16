# Test-Action einrichten (einmalig)

Der Push scheiterte, weil ein Personal-Access-Token ohne `workflow`-Scope keine
Dateien unter `.github/workflows/` anlegen darf. Zwei Wege:

## Weg A — über GitHub im Browser (kein Token-Umweg)
1. Repo auf github.com öffnen → Reiter **Actions** → **New workflow** →
   **set up a workflow yourself**.
2. Den Inhalt von `ci/test.yml.txt` (in diesem Ordner) komplett hineinkopieren.
3. Dateiname oben auf `test.yml` setzen → **Commit changes**.
Fertig — ab dem nächsten Push laufen Tests + Build automatisch.

## Weg B — Token-Scope erweitern
GitHub → Settings → Developer settings → Personal access tokens → Token
bearbeiten → Haken bei **workflow** → speichern. Danach kann die Datei per
`git push` angelegt werden.
