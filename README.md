# Udkast – Best One

Internt værktøj der laver Bricks-udkast (forside, underside, hero, menu) ud fra Best Templates og giver JSON'en til at sætte ind i Bricks.

Skriv kundens navn og tryk **Enter**.

## Login og templates
Værktøjet åbnes via Apps Script-linket med en best-one.dk-konto (se [apps-script/LAES-MIG.md](apps-script/LAES-MIG.md)). Templates ligger ikke i koden. De hentes fra Drive-mappen **Best Templates**, når værktøjet åbnes.

Broen mellem Apps Script og værktøjet godtager kun svar fra Apps Scripts sandbox (`*.googleusercontent.com`). Den kan ikke låses til én fast adresse, fordi sandbox-adressen er forskellig fra bruger til bruger (det blev prøvet 3/11 og gav "Apps Script svarede ikke" for andre end Rasmus).

Hentede templates gemmes i browserens IndexedDB, så næste gang hentes kun nye eller ændrede filer (plads til mange hundrede templates). Den gamle cache i localStorage flyttes automatisk over første gang.

**Ny eller rettet template:** Eksportér templaten i Bricks (Templates → Eksportér) og læg `.json`-filen i Drive-mappen. Næste gang værktøjet åbnes, er den med. Navnet i Bricks bestemmer templatens navn i værktøjet, fx `cta-1`.

## Preview
Preview viser udkastet, som Bricks selv tegner det: HTML'en laves med Bricks' egne klasser og id'er (`brxe-…`), og den vises i en iframe med jeres rigtige CSS og JavaScript fra stocksitet (beststock.kinsta.cloud): Bricks' frontend-CSS, child theme, style manager, theme styles, ikoner, slidere og menuer. Breakpoints er jeres: laptop max 1470, tablet landscape max 1024, tablet portrait/mobil landscape max 768, mobil max 478.

`python3 hent-bricks.py` henter opsætningen til `src/bricks.json`:
- theme styles, variabler og CSS-/JS-filer fra stocksitet
- CSS for globale klasser og for hvert template-element, præcis som Bricks har lavet den på templatesitet (bruges, når elementets styling ikke er ændret – ellers laves CSS'en ud fra indstillingerne)
- færdig HTML for elementer, som WordPress bygger (menuer, Bricks-templates som formularen, shortcodes, indlægsdata)

GitHub kører det automatisk ved hver udgivelse og hver nat, så preview følger jeres opsætning.

## Regler for udkast
Alle templates må gerne ligge i Drive-mappen. Reglerne ligger i værktøjet (`src/engine.js`) og gælder altid, også i "+ Tilføj sektion":
- **Typen** kommer fra kolonnen *Type* i regnearket **Best Templates**. Kolonnerne findes ud fra overskrifterne (Navn, Type, Udgivelsesdato, Link, Beskrivelse), så de må gerne flyttes, og der må indsættes nye kolonner. Står en template ikke i arket, bruges starten af navnet (`hero-` = Header, `ydelse-` = Ydelser, `content-` = Content, `medarbejdere-` = Medarbejdere, `usp-` = USP, `produkter-` = Produkter, `logo-slider-` = Logo slider, `kontaktsektion-` = Kontakt sektion, `cta-`/`knapper-` = Knapper, `kontakt-side-` = Kontakt side osv. – `PREFIX_TYPE`).
- Altid præcis **1 Header (hero)** øverst. Man vælger "med" eller "uden kontaktformular" ("med" er valgt fra start).
- Lige efter heroen kommer altid et **tekstafsnit (Content)**, aldrig fx Ydelser. Vil man have Ydelser højere op, trækker man den selv.
- **Kun én logo-række pr. side (når værktøjet vælger):** har heroen sin egen logo-række (fx Hero #17 og Hero #3 – genkendes på et element med navn/klasse som "Logo loop", "Logoer", "Samarbejdspartnere" eller `…logo-loop/slider/group`, eller på mindst tre elementer, der hedder "Logo", "Logo 2" …), kommer der ingen Logo slider i det genererede udkast. Manuelt (Ny variant, Vælg selv, + Tilføj sektion, træk) må man gerne.
- **Kontaktsektion #7 og #8 kun i bunden (når værktøjet vælger):** de bruges kun som sidens sidste sektion (`BOTTOM_ONLY` i engine.js). Manuelt (Ny variant, Vælg selv, træk) må man gerne bruge dem andre steder.
- **Logo slider** (når den er valgt) ligger altid lige under heroen, før tekstafsnittet. **USP** og **Produkter** placeres tilfældigt, men aldrig lige under heroen. De tre kommer kun med, når de er valgt. Produkter står under **Ønsker udover standard**, de andre under **Ønsker til design**.
- **Tekstafsnit** (standard 3, kan vælges 2–5): antal − 1 Content med H2 og brødtekst (min. 40 ord i ét tekstfelt) og til sidst et kort **CTA-afsnit**. Slutter siden med kontaktsektionen med formular (også når der ikke er valgt noget under Ønsker), er den afslutningen i stedet – den tæller **aldrig** som tekstafsnit, selv om den har en H2, så der kommer ét Content mere. Vælger man 3, er der altid 3 rigtige tekstafsnit.
- **CTA-afsnit** = en kontaktsektion *uden* formular med H2, kort tekst (8–60 ord) og en knap. Værktøjet finder dem selv. "Kontaktformular" under Ønsker til design (internt typen Kontakt sektion) giver en kontaktsektion, der **skal** have en formular (findes ingen, kommer den ikke med), helt til sidst. Så er den sidens afslutning, og det afsluttende CTA-afsnit udelades (ellers står der to kontaktsektioner lige efter hinanden).
- **Ny variant** vælger en tilfældig anden template af samme slags (ikke en, der allerede er i udkastet). Samme template kommer først igen, når man har set alle de andre i gruppen – så starter den forfra. Kontaktformular forbliver med formular, CTA uden, og heroen beholder med/uden kontaktformular. Ellers er Ny variant fri: reglerne for placering gælder kun, når værktøjet laver udkastet.
- **Slet** (skraldespanden) fjerner sektionen med ét klik. Fortryd med ⌘Z / Ctrl+Z.
- I **+ Tilføj sektion**, **Vælg selv** og statistikken bruges de samme navne som på forsiden: typen Kontakt sektion vises som **Kontaktformular** (med formular) og **CTA** (uden formular).
- "CTA" under Ønsker til design (internt "CTA sektion") giver et ekstra CTA-afsnit midt på siden (ud over det afsluttende).
- Heroens **H1 er kundens navn**, både i preview og i JSON'en. "Prøv næste variant" på heroen holder sig til med/uden kontaktformular.
- Er der ikke flere ledige templates til et tekstafsnit, bruges den bedste anden template med tekst som erstatning, og det står i "Tjek følgende igennem efter paste". Et tekstafsnit mangler aldrig. Erstatningen er aldrig en hero, anmeldelse, Logo slider, USP, Produkter eller en sektion med formular.
- **Bruges aldrig:** Menu, Footer, Marketing, Underside, Knapper (tidl. CTA), Kontakt side og Kontaktformular (`EXCLUDED_CATS`, `EXCLUDED_RE`).
- Samme template bruges aldrig to gange i ét udkast.
- "CTA": det ekstra CTA-afsnit kommer altid efter det første tekstafsnit, og der står mindst én sektion mellem de to CTA-afsnit. Er siden for kort, springes det ekstra over.
- Findes der ingen kontaktsektion med formular, slutter siden med CTA-afsnittet i stedet. Findes der ingen hero med/uden formular som valgt, bruges en af den anden slags, og den får "⚠ Erstatning".
- Der er ingen grænse på 12 sektioner længere: alle valgte ønsker + tekstafsnit + afslutning kommer med (loft 30).
- Man skal vælge en kunde fra ClickUp-listen for at lave et udkast.
- Erstatninger får "⚠ Erstatning" i listen.
- Tomme sektioner i en template (bruges til interne noter) kommer aldrig med i udkastet.
- Der er ét udkast ad gangen. "Generer nyt udkast på samme indstillinger" erstatter det, og Cmd/Ctrl + Z giver det forrige tilbage.

## Inspiration fra HOS-sider
Med ClickUp sat op (se apps-script/LAES-MIG.md) henter værktøjet kunderne med HOS, HOS+, RE eller RE+ (åbne opgaver i Kunder-listen). Når der laves et udkast, kigger det på forsiden af nogle af dem i samme branche og finder, hvilke templates sektionerne ligner. Det sker på templatens egne klasser, eller ellers på opbygningen (overskrifter, billeder, kort, formular osv.). Udkastet bruger så sidens rækkefølge og de templates, der ligner bedst. Det behøver ikke være 1:1. Resultatet gemmes i browseren i 7 dage. Uden ClickUp bruges standardopbygningen.

## Mapper
- `src/` – selve værktøjet (`app.js`, `engine.js`, `index.tpl.html`, `data.json` med klasser/variabler/statistik, `bricks.json`)
- `apps-script/` – login og data (templates fra Drive, kunder fra ClickUp)
- `build.py` – bygger `index.html` (den fil GitHub udgiver; ligger ikke i repoet)
- `hent-bricks.py` – henter Bricks-opsætningen til preview (`src/bricks.json`)
- `.github/workflows/static.yml` – bygger og udgiver ved hvert push (Settings → Pages → Source: GitHub Actions)

Lokalt: `python3 build.py`, derefter `python3 -m http.server 8000` og åbn http://localhost:8000/index.html. Uden Apps Script bruger værktøjet `.claude/dev-templates.json`, hvis den findes (ligger ikke i repoet).

## Preview
Når et udkast ændres (Ny variant, Vælg selv, flyt, slet osv.), bygges det nye preview i baggrunden, mens det gamle bliver stående. Imens ligger et overlay med "Opdaterer preview…" over previewet, og listen og knapperne er låst, så man ikke klikker videre midt i det. Når det nye preview er klar, skiftes de (nød-udvej: efter 15 sek.).
Previewet er et rigtigt browservindue, man scroller indeni: i den delte visning med enhedens proportioner (fx 1600 × 900 for desktop, skaleret ned), i fullscreen så højt, som der er plads til. Derfor virker vh-enheder og scroll-animationer (fx GSAP ScrollTrigger med pin i Kontaktsektion #7) som på sitet. Klik på en sektion i listen scroller previewet hen til den. Inde i previewet virker klik som på sitet (FAQ, slider-pile, formularfelter) – **dobbeltklik** markerer sektionen. Ændrer man noget, starter det nye preview samme sted, som man var scrollet til. Previewet gør `history.replaceState` sikker (Bricks' accordion/FAQ kalder den ved klik, og den fejler i previewets ramme). `@keyframes` fra klassernes og elementernes egen CSS lægges med i previewet (de kommer ikke med i CSS'en fra templatesitet). Tomme flader under siden undgås, fordi højden ikke længere følger indholdet.

**Se fullscreen** (ved siden af Start forfra) skjuler venstre side, så previewet får hele bredden, og vinduet bliver så stort, som der er plads til. Klik igen (Luk fullscreen) eller tryk Esc for at komme tilbage.

## Statistik
Under formularen på forsiden står et lille link **Statistik**. Det ses kun af rmu@ og mvi@best-one.dk, og Apps Scriptet tjekker også selv e-mailen (`CFG.STATS_ADMINS`).
Der tælles **kun, når der trykkes Kopiér JSON** – udkast, der ikke bliver brugt, er bare afprøvning og tæller ikke. Værktøjet tæller pr. template: hvor tit den kommer med i et udkast, skiftes ud (Ny variant / Vælg selv), slettes, vælges selv, tilføjes, og om den er med, når JSON'en kopieres. Der gemmes kun tal pr. template – ingen kunder eller navne. Tallene ligger i Apps Scriptets Script-egenskaber (`S:<template>`).
Templates med mindst 5 udkast og over 50 % udskiftet står med gult. Klik på en kolonne for at sortere (klik igen for omvendt). **Download som CSV** henter tabellen i den viste sortering (semikolon-separeret, åbner direkte i dansk Excel og Google Sheets). Den røde **Nulstil** åbner en pop-up med *Nulstil alt*, *Download som CSV* (henter filen, pop-uppen bliver stående) og *Fortryd*. Klik uden for boksen eller Esc lukker.

## Fejlkoder
Fejl vises i en bar nederst med en kode som `E30-1318-4f2a` (type, klokkeslæt, id). Detaljerne står i browserens konsol under samme kode.
- `E10` udkastet kunne ikke laves
- `E30` en sektion kunne ikke skiftes eller tilføjes
- `E40` kunderne kunne ikke hentes fra ClickUp
- `E90` uventet fejl
