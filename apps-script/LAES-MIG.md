# Apps Script: login og data til Udkast

Apps Scriptet står for to ting:
- **Login:** Kun personer med en best-one.dk-konto kan åbne værktøjet.
- **Data:** Det henter templates fra Drive-mappen "Best Templates" og senere kunder fra ClickUp. Det kan kun læse og aldrig ændre noget.

Selve værktøjet ligger fortsat på GitHub Pages og vises inde i Apps Script-siden. Ændringer i værktøjet kommer derfor ud, når der pushes til GitHub. Apps Scriptet skal kun opdateres, når filerne i denne mappe ændres.

## Opsætning (første gang)

1. Gå til [script.google.com](https://script.google.com) med din best-one.dk-konto, og lav et nyt projekt. Kald det "Udkast – Best One".
2. **Projektindstillinger** (tandhjulet): Slå *"Vis manifestfilen appsscript.json i editoren"* til.
3. **Editor:**
   - Erstat indholdet af `appsscript.json` med [appsscript.json](appsscript.json).
   - Erstat indholdet af `Code.gs` med [Code.gs](Code.gs).
   - Tilføj en HTML-fil med **+ → HTML**, kald den `Shell`, og indsæt [Shell.html](Shell.html).
4. **Udrul → Ny udrulning** → vælg typen *Webapp*:
   - Udfør som: **Mig**
   - Hvem har adgang: **Alle i Best One A/S** (best-one.dk)
5. Tryk **Udrul**, og godkend adgangen. Scriptet beder om at kunne læse Drive, hente fra internettet (ClickUp) og se din e-mail.
6. Åbn **webapp-URL'en**. Det er linket, kollegerne skal bruge. Første gang hentes alle templates. Derefter hentes kun dem, der er nye eller ændret.

Den, der udgiver, skal have adgang til Drive-mappen "Best Templates".

## ClickUp (når I er klar)

Opret en ClickUp-gæst med **"Kan se"** på listerne *Opstarter* og *Kunder*, og lav en API-nøgle til gæsten. Sæt nøglen ind under **Projektindstillinger → Script-egenskaber**:

| Egenskab | Værdi |
|---|---|
| `CLICKUP_TOKEN` | gæstens API-nøgle (`pk_…`) |

Nøglen ligger kun i scriptet og kommer aldrig ud i browseren.

Når nøglen er sat, kan værktøjet også kigge på forsiden af HOS-kundernes sider for at finde de templates, de ligner. Scriptet henter kun sider fra den liste, ikke andre adresser.

## Når filerne her ændres

Kopiér de ændrede filer ind igen. Gå derefter til **Udrul → Administrer udrulninger → blyanten → Version: Ny version → Udrul**. Linket forbliver det samme.
