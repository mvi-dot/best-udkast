# Udkast – Best One

Internt værktøj der laver Bricks-udkast (forside, underside, hero, menu) ud fra Best Templates og giver JSON'en til at sætte ind i Bricks. Kører helt uden Claude og uden nøgler. Live: https://mvi-dot.github.io/best-udkast/

Skriv kundens navn og tryk **Enter**.

## Opdatér med en ny template
1. Læg template-JSON'en i `Best Templates`-mappen på skrivebordet. Filnavnet bestemmer hvilken template: `template-ydelse-12-2026-10-19.json` bliver til `ydelse-12` (findes den, opdateres den).
2. Kør `./ny-template.sh`. Det bygger siden, åbner en test på localhost, og spørger om det skal sendes live (`j`).
3. GitHub bygger og udgiver selv siden efter ca. 1 minut.

## Ugens sektioner fra sider der er kommet online
Læg JSON-filer i `sektioner/` (se `sektioner/LAES-MIG.txt`). De kommer under "Live sektioner".

## Mapper
- `src/` – selve værktøjet (`app.js`, `engine.js`, `github-shim.js`, `index.tpl.html`, `data.json`)
- `templates/` – nye templates der lægges oven i `data.json` ved bygning
- `sektioner/` – live sektioner
- `build.py` – bygger `index.html` (den fil GitHub udgiver; ligger ikke i repoet)
- `.github/workflows/static.yml` – bygger og udgiver ved hvert push (Settings → Pages → Source: GitHub Actions)

Lokalt: `python3 build.py`, derefter `python3 -m http.server 8000` og åbn http://localhost:8000/index.html
