# Udkast – Best One

Internt værktøj der laver Bricks-udkast (forside, underside, hero, menu…) ud fra Best Templates og giver dig JSON'en til at indsætte i Bricks. Det er én HTML-side uden server, så den kan ligge på GitHub Pages.

## Læg det på GitHub (ca. 5 minutter)

1. Opret et nyt repository på github.com (fx `udkast`). Pages på private repos kræver en betalt GitHub-plan, så brug *Public*, hvis I ikke har det.
2. Upload alle filerne i denne mappe (træk dem ind i browseren, eller `git push`).
3. Gå til **Settings → Pages → Build and deployment → Source: GitHub Actions**.
4. Vent et minut. Siden ligger på `https://DIT-BRUGERNAVN.github.io/udkast/`. Det er den URL, du deler.

## Forbind til Claude (valgfrit)

Siden virker **uden Claude og uden nøgle**: du behøver ikke at gøre noget. Siden sætter selv en standardopbygning sammen ud fra jeres templates (hero, ydelser, content, anmeldelser, FAQ, kontakt, og ord som "priser", "galleri" eller "medarbejdere" i kontekstfeltet tilføjer sektioner). Du kan flytte, udskifte og tilføje sektioner med knapperne. Kun fritekst-ønsker ("Ret i udkastet") kræver Claude.

Vil du have Claude med, så forbind den på én af to måder (knappen **Forbind Claude** nede i højre hjørne):

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


## Ugens nye sektioner (rigtige sider)

Siden kan bruge **rigtige sektioner fra sider, der er kommet online**, og ikke kun templates.

1. I Bricks: kopiér en sektion, du kan lide, fra en kundes side, og gem den som en `.json`-fil.
2. Læg filen i mappen **`sektioner/`** på GitHub (*Add file → Upload files*). Giv den gerne navnet `kundens-domæne.dk--beskrivelse.json`, fx `mv-hansen.dk--forside-hero.json`, så linket til siden bliver rigtigt. Er filen kopieret fra en rigtig side, står adressen allerede i JSON'en.
3. Det er det hele. GitHub bygger og udgiver selv siden på 1-2 minutter.

Siden sorterer sektionen efter, hvad der står i den (hero, ydelser, anmeldelser, FAQ, kontakt, priser, cases, galleri, content), gætter branchen ud fra teksten og lægger den under **Tilføj sektion → Online hjemmesider**. Her hedder sektionen fx `FAQ · MV Hansen`, har et link **↗ Åbn siden**, og kan filtreres pr. kategori. Kundens billeder, tekster, links, telefonnumre og mails bliver erstattet med Best Stock-billeder og Lorem ipsum.

**Uden Claude** gætter siden branchen ud fra kundens navn (og kontekstfeltet), vælger en tilfældig rigtig side i samme branche og kopierer dens opbygning. Hver sektion bliver enten en template eller en rigtig online-sektion fra samme branche. Står navnet ikke til at gætte (fx "MV Hansen"), vælger den tilfældigt og siger det i statuslinjen. Skriv fx "tømrer" i konteksten for at styre det.

**Første gang:** Workflowen i `.github/workflows/` skal være den fra denne pakke. Er der en `static.yml` på GitHub i forvejen, så åbn den, tryk blyanten, og erstat hele indholdet med indholdet af `pages.yml`.

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
