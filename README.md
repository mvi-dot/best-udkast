# Udkast – Best One

Internt værktøj der laver Bricks-udkast (forside, underside, hero, menu…) ud fra Best Templates og giver dig JSON'en til at indsætte i Bricks. Det er én HTML-side uden server, så den kan ligge på GitHub Pages.

## Læg det på GitHub (ca. 5 minutter)

1. Opret et nyt repository på github.com (fx `udkast`). Pages på private repos kræver en betalt GitHub-plan, så brug *Public*, hvis I ikke har det.
2. Upload alle filerne i denne mappe (træk dem ind i browseren, eller `git push`).
3. Gå til **Settings → Pages → Build and deployment → Source: GitHub Actions**.
4. Vent et minut. Siden ligger på `https://DIT-BRUGERNAVN.github.io/udkast/`. Det er den URL, du deler.

## Forbind til Claude

Siden bruger Claude til at vælge og sætte sektioner sammen. Uden for claude.ai skal den forbindes på én af to måder (knappen **Claude-forbindelse** nede i højre hjørne, eller den åbner selv første gang du trykker "Lav udkast"):

**A. Din egen API-nøgle (hurtigst).** Hver bruger indsætter sin egen Anthropic API-nøgle. Den gemmes kun i browseren (localStorage) og sendes direkte til Anthropic.

**B. Fælles proxy (anbefalet til teamet).** Nøglen ligger hos en lille Cloudflare Worker, og brugerne skriver kun proxyens URL (og evt. en fælles adgangskode):

```
cd worker
npx wrangler deploy
npx wrangler secret put ANTHROPIC_API_KEY
npx wrangler secret put ACCESS_CODE        # valgfri
```

Ret `ALLOWED_ORIGINS` i `worker/wrangler.toml` til jeres GitHub Pages-adresse. Vil du slippe for at skrive URL'en, så læg den i `config.js` (`proxyUrl`).

> Læg aldrig en API-nøgle i selve repoet.

## Ret og opdatér

Kildefilerne ligger i `src/`:

| Fil | Indhold |
|---|---|
| `src/data.json` | Templates, klasser, billeder og skærmbilleder (Best Stock-fotos) |
| `src/engine.js` | Motoren: planlægning, eksport til Bricks, preview, validering |
| `src/app.js` | Selve brugerfladen |
| `src/index.tpl.html` | Skabelon og design |
| `src/github-shim.js` | Adapter, så siden virker uden for claude.ai |

Efter ændringer: `python3 build.py` (bygger `index.html`) og commit. GitHub Actions bygger og udgiver automatisk ved hver push til `main`.
`python3 build.py artifact` laver en version til claude.ai uden adapteren (`dist/udkast-artifact.html`).

## Forskelle fra claude.ai-versionen

* Feedback gemmes lokalt i browseren, ikke i en fælles database.
* "Hent ark" (synkronisering af templates fra Google Drev) kræver claude.ai.
* Alt andet er ens: skabeloner, Best Stock-billeder, Lorem ipsum, breakpoints, menuer, footers og eksport.
