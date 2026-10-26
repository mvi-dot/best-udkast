# Udkast – Best One

Internt værktøj der laver Bricks-udkast (forside, underside, hero, menu) ud fra Best Templates og giver JSON'en til at sætte ind i Bricks. Kører helt uden Claude og uden nøgler. Live: https://mvi-dot.github.io/best-udkast/

Skriv kundens navn og tryk **Enter**.

## Opdatér med en ny template
1. Læg template-JSON'en i `Best Templates`-mappen på skrivebordet. Filnavnet bestemmer hvilken template: `template-ydelse-12-2026-10-19.json` bliver til `ydelse-12` (findes den, opdateres den).
2. Kør `./ny-template.sh`. Det henter Bricks-opsætningen (se nedenfor), bygger siden, åbner en test på localhost og spørger, om det skal sendes live (`j`).
3. GitHub bygger og udgiver selv siden efter ca. 1 minut.

## Ugens sektioner fra sider der er kommet online
Læg JSON-filer i `sektioner/` (se `sektioner/LAES-MIG.txt`). De kommer under "Live sektioner".

## Preview
Preview viser udkastet, som Bricks selv tegner det: HTML'en laves med Bricks' egne klasser og id'er (`brxe-…`), og den vises i en iframe med jeres rigtige CSS og JavaScript fra stocksitet (beststock.kinsta.cloud): Bricks' frontend-CSS, child theme, style manager, theme styles, ikoner, slidere og menuer. Breakpoints er jeres: laptop max 1470, tablet landscape max 1024, tablet portrait/mobil landscape max 768, mobil max 478.

`python3 hent-bricks.py` henter opsætningen til `src/bricks.json`:
- theme styles, variabler og CSS-/JS-filer fra stocksitet
- CSS for globale klasser og for hvert template-element, præcis som Bricks har lavet den på templatesitet (bruges, når elementets styling ikke er ændret – ellers laves CSS'en ud fra indstillingerne)
- færdig HTML for elementer, som WordPress bygger (menuer, Bricks-templates som formularen, shortcodes, indlægsdata)

Kør det igen, når theme styles, klasser eller templates er ændret (det gør `ny-template.sh` automatisk).

## Mapper
- `src/` – selve værktøjet (`app.js`, `engine.js`, `github-shim.js`, `index.tpl.html`, `data.json`, `bricks.json`)
- `templates/` – nye templates der lægges oven i `data.json` ved bygning
- `sektioner/` – live sektioner
- `build.py` – bygger `index.html` (den fil GitHub udgiver; ligger ikke i repoet)
- `hent-bricks.py` – henter Bricks-opsætningen til preview (`src/bricks.json`)
- `.github/workflows/static.yml` – bygger og udgiver ved hvert push (Settings → Pages → Source: GitHub Actions)

Lokalt: `python3 build.py`, derefter `python3 -m http.server 8000` og åbn http://localhost:8000/index.html
