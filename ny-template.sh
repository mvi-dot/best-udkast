#!/bin/bash
# Brug: ./ny-template.sh
# 1) kopierer .json fra ~/Desktop/Best Templates -> templates/
# 2) bygger værktøjet og åbner en lokal test (localhost)
# 3) spørger om du vil sende live (commit + push). Svar n for kun at teste lokalt.
cd "$(dirname "$0")" || exit 1
SRC="$HOME/Desktop/Best Templates"

if ls "$SRC"/*.json >/dev/null 2>&1; then mkdir -p templates && cp "$SRC"/*.json templates/; else echo "(Ingen nye .json-filer i $SRC, bruger dem der ligger i templates/)"; fi

# index.html bygges af GitHub selv, så den skal ikke ligge i repoet
grep -qx 'index.html' .gitignore 2>/dev/null || echo 'index.html' >> .gitignore
grep -qx 'preview.html' .gitignore 2>/dev/null || echo 'preview.html' >> .gitignore

echo "--- Bygger ---"
python3 build.py || { echo "Bygget fejlede, intet er sendt."; exit 1; }

lsof -ti:8000 | xargs kill 2>/dev/null
python3 -m http.server 8000 >/dev/null 2>&1 &
SRV=$!
sleep 1; open "http://localhost:8000/index.html"

echo
read -r -p "Ser det rigtigt ud? Send live nu? (j/n) " svar
kill $SRV 2>/dev/null
if [ "$svar" = "j" ]; then
  git rm --cached -q index.html 2>/dev/null
  git add templates src build.py .gitignore
  git commit -m "Opdatering $(date +%Y-%m-%d)" && git pull --rebase --autostash -q && git push
  echo "Sendt. Siden opdateres om ca. 1 minut: https://mvi-dot.github.io/best-udkast/"
else
  echo "Ikke sendt. Intet er ændret på GitHub."
fi
