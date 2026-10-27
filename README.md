# Udkast – Best One

Internt værktøj der laver Bricks-udkast (forside, underside, hero, menu) ud fra Best Templates og giver JSON'en til at sætte ind i Bricks.

Skriv kundens navn og tryk **Enter**.

## Login og templates
Værktøjet åbnes via Apps Script-linket med en best-one.dk-konto (se [apps-script/LAES-MIG.md](apps-script/LAES-MIG.md)). Templates ligger ikke i koden. De hentes fra Drive-mappen **Best Templates**, når værktøjet åbnes.

**Ny eller rettet template:** Eksportér templaten i Bricks (Templates → Eksportér) og læg `.json`-filen i Drive-mappen. Næste gang værktøjet åbnes, er den med. Navnet i Bricks bestemmer templatens navn i værktøjet, fx `cta-1`.

## Preview
Preview viser udkastet, som Bricks selv tegner det: HTML'en laves med Bricks' egne klasser og id'er (`brxe-…`), og den vises i en iframe med jeres rigtige CSS og JavaScript fra stocksitet (beststock.kinsta.cloud): Bricks' frontend-CSS, child theme, style manager, theme styles, ikoner, slidere og menuer. Breakpoints er jeres: laptop max 1470, tablet landscape max 1024, tablet portrait/mobil landscape max 768, mobil max 478.

`python3 hent-bricks.py` henter opsætningen til `src/bricks.json`:
- theme styles, variabler og CSS-/JS-filer fra stocksitet
- CSS for globale klasser og for hvert template-element, præcis som Bricks har lavet den på templatesitet (bruges, når elementets styling ikke er ændret – ellers laves CSS'en ud fra indstillingerne)
- færdig HTML for elementer, som WordPress bygger (menuer, Bricks-templates som formularen, shortcodes, indlægsdata)

GitHub kører det automatisk ved hver udgivelse og hver nat, så preview følger jeres opsætning.

## Mapper
- `src/` – selve værktøjet (`app.js`, `engine.js`, `index.tpl.html`, `data.json` med klasser/variabler/inspiration, `bricks.json`)
- `apps-script/` – login og data (templates fra Drive, kunder fra ClickUp)
- `build.py` – bygger `index.html` (den fil GitHub udgiver; ligger ikke i repoet)
- `hent-bricks.py` – henter Bricks-opsætningen til preview (`src/bricks.json`)
- `.github/workflows/static.yml` – bygger og udgiver ved hvert push (Settings → Pages → Source: GitHub Actions)

Lokalt: `python3 build.py`, derefter `python3 -m http.server 8000` og åbn http://localhost:8000/index.html. Uden Apps Script bruger værktøjet `.claude/dev-templates.json`, hvis den findes (ligger ikke i repoet).
