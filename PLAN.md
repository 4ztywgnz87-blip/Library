# Plan: Snug

Een persoonlijke, cosy web-app waarin zij haar boeken bijhoudt, een geanimeerde boekenkast heeft
en tips krijgt voor haar volgende boek: uit haar eigen kast of om te kopen.

- App-taal: Engels
- Gebruiker: enkel zij (later uitbreidbaar)
- Toestellen: iPhone (hoofdgebruik), iPad, Mac/pc
- Kosten: hosting gratis, AI enkel via vooraf betaald tegoed (zie §7)

---

## 1. Voor wie

| | |
|---|---|
| Leest | ± 10+ boeken per jaar, meestal één tegelijk |
| Genres | thriller, fantasy, roman, romantasy, spicy; **geen** non-fictie |
| Talen | Nederlands en Engels |
| Formaat | papier + e-reader (niet bijhouden) |
| Bibliotheek | tientallen gelezen, tientallen ongelezen in de kast, tientallen op de wenslijst |
| Favoriete auteurs | Colleen Hoover, Sarah J. Maas, Lucy Score, Ali Hazelwood, Rebecca Yarros (+ automatisch afgeleid uit haar kast) |
| Series | ja (ACOTAR, Knockemout, …): volgorde tonen en ontbrekende delen melden |
| Speciale edities | ja, maar één exemplaar per boek |
| Geen nood aan | sociale functies, uitlenen, DNF-status, formaat, leesdata, quotes |

## 2. Kernfuncties (versie 1)

### 2.1 Boeken toevoegen
1. **Foto van de cover** (hoofdmanier): foto nemen → AI leest titel en auteur → app zoekt het boek op → zij bevestigt.
2. **Zoeken op titel of auteur**, met resultaten mét cover.
3. **Barcode scannen** (ISBN), als extra.

Elk boek krijgt automatisch: cover, auteur, samenvatting, genres, paginatal, serie en volgnummer.
Zij kiest enkel de **status** en de **taal van haar exemplaar** (NL/EN). Ze kan ook aanduiden dat het een **speciale editie** is en daar een eigen foto van nemen.

Fable wordt niet gekoppeld: ze voegt haar boeken en scores gewoon zelf toe.

### 2.2 Statussen
- **Owned**: heb ik, nog niet gelezen
- **Reading**: bezig (meestal één, maar meerdere kan)
- **Read**: gelezen, met rating
- **Wishlist**: wil ik

### 2.3 Rating en review
- Sterren met **kwartstappen** (0,25 tot 5)
- Optioneel een **korte review** (enkele zinnen). Die wordt ook gebruikt voor betere tips ("te traag", "love de banter").
- Optioneel enkele tags (bv. *spicy*, *emotional*, *twist*): klein en niet verplicht

### 2.4 Bibliotheek (lijstweergave, het hoofdscherm)
- Tabbladen: Reading, Owned, Read, Wishlist
- **Zoeken** op titel, auteur of serie
- **Filters**: genre, taal, rating, serie, auteur
- Coverraster in de stijl van Netflix, met rijen per genre of serie

### 2.5 Series
- Seriepagina met alle delen in volgorde: gelezen, in bezit, op de wenslijst of **ontbreekt**
- Een melding als er een deel ontbreekt ("You're missing *A Court of Silver Flames*")
- **Aangekondigde** delen verschijnen pas als ze officieel bestaan (met verschijningsdatum), op basis van Google Books en Open Library
- Eén tik om een ontbrekend deel op de wenslijst te zetten

### 2.6 Favoriete auteurs
- Startlijst met de 5 auteurs hierboven, aangevuld met auteurs waarvan ze 3+ boeken heeft of die ze hoog scoort
- De app toont nieuwe of aangekondigde boeken van die auteurs ("New from Ali Hazelwood – March 2027")

### 2.7 "Reader profile"-vragenlijst
De eerste keer dat ze de app opent, beantwoordt ze een korte, speelse vragenlijst van ± 2 minuten, met tikbare kaartjes:
- favoriete tropes (enemies-to-lovers, found family, slow burn, grumpy/sunshine, …)
- tropes die ze haat
- gewenst spice-niveau per genre (🌶️ 0–5)
- open of gesloten einde, standalone of serie, gewenste boeklengte
- stemmingen waar ze vaak zin in heeft

Ze kan de vragenlijst **altijd opnieuw doen** via Profile → "Retake quiz". Het profiel kan ze ook los aanpassen.

### 2.8 Aanbevelingen ("What's next?")
Met knoppen, eenvoudig en in 3 tikken:

1. **Waar komt het boek vandaan?** `From my shelf` / `Something new to buy`
2. **Genre** (optioneel): chips met haar genres + "Surprise me"
3. **Mood** (optioneel): *Light & fun*, *Swoony*, *Spicy*, *Make me cry*, *Edge of my seat*, *Epic & immersive*, *Quick read*
4. Knop: **"Find my next read"**

Ze krijgt een **top 3**, elk boek met cover en 2–3 zinnen uitleg waarom het bij haar past ("Because you gave *Fourth Wing* 4.75★ and love found family…").
Onder elk voorstel staan knoppen: `Add to wishlist`, `Start reading`, `Not for me`. Die laatste wordt onthouden. Onderaan staat een knop `Show me 3 others`.

**Winkelmodus "Does this fit me?":** ze fotografeert een cover in de winkel en krijgt:
- of ze het boek **al heeft** (dat werkt ook offline)
- een **match-score** met korte uitleg
- als het een serie is: welk deel ze zou moeten hebben

Waar de AI rekening mee houdt:
- haar ratings en reviews
- haar vragenlijstprofiel
- de genres en samenvattingen van haar boeken
- haar "Not for me"-lijst
- welke taal ze leest
- de algemene reputatie van een boek

Bij "From my shelf" kiest de AI enkel uit haar ongelezen boeken. Bij "Something new" stelt de AI nooit een boek voor dat ze al heeft of gelezen heeft.

### 2.9 De boekenkast (geanimeerd, als extra scherm)
- Een **geïllustreerde, licht geanimeerde kast**, geen foto
- De ruggen staan naast elkaar, in de kleur van de cover en met de titel. Series staan samen.
- **Decoratie**:
  - een plantje dat licht wiegt
  - een kaarsje dat flakkert
  - een kat op de bovenste plank die af en toe met haar staart zwiept
  - een lampje
  - boekensteunen
- Tikt ze op een plank of rug, dan schuift het boek eruit en gaat ze naar het coverraster (§2.4) van die plank of serie
- Elke status kan een eigen plank of kast krijgen: "Currently reading" bovenaan, de wenslijst als een apart kastje of stapeltje

## 3. Later (versie 2+)
- Statistieken: boeken per jaar, genres, gemiddelde rating, een jaaroverzicht ("Your year in books")
- Deelbare wenslijst (cadeau-ideeën voor jou en familie)
- Meer decoratie om te ontgrendelen (seizoensdecoratie: kerst, herfst)
- Accounts voor anderen

## 4. Schermen

| Scherm | Inhoud |
|---|---|
| **Home** | "Currently reading" groot met cover · knop *What's next?* · recent toegevoegd · melding ontbrekend seriedeel of nieuw boek van favoriete auteur |
| **Library** | tabbladen per status, zoeken, filters, coverraster |
| **Shelf** | geanimeerde boekenkast |
| **Add** (+ knop, altijd zichtbaar) | Camera · Zoeken · Barcode |
| **Book** | cover, info, serie, status, sterren, review |
| **What's next?** | knoppenflow + top 3 |
| **Profile** | vragenlijst opnieuw doen, favoriete auteurs, instellingen |

Navigatie via een onderbalk: Home · Library · ➕ · Shelf · Profile.
Op iPad en Mac wordt dat een zijbalk met een breder raster.

## 5. Stijl

**Gevoel:** modern en clean, met cosy details. Veel witruimte, zachte schaduwen, afgeronde hoeken en kleine illustraties.

| Rol | Kleur |
|---|---|
| Achtergrond | crème `#F6EFE6` |
| Kaarten | warm beige `#EDE3D6` / zand `#E4D3BF` |
| Tekst | donker koffiebruin `#3B2A22` |
| Secundaire tekst | `#7A6455` |
| Accent | **bordeaux `#7A2E3A`** (knoppen, actieve tab) |
| Sterren en details | oud goud `#C49A5A` |
| Kast | warm hout `#8B5E3C` / `#A47148` |

- **Lettertypes:** titels in een zachte serif (bv. *Fraunces*), tekst in een clean sans (bv. *Inter*)
- **Kleine details:**
  - een stoomwolkje boven een theekop bij het laden
  - sterren die kort "fonkelen" als ze een rating geeft
  - lege staten met een slapende kat ("No books here yet…")
  - een klein confetti-blaadje als ze een boek uit heeft
- Geen donkere modus

## 6. Techniek (gekozen voor gratis en eenvoudig)

| Onderdeel | Keuze | Waarom |
|---|---|---|
| App | **React + TypeScript + Vite, als PWA** | op het startscherm van iPhone, iPad en Mac; voelt als een app |
| Styling/animatie | Tailwind CSS + Framer Motion + SVG voor de kast | strak, met vloeiende animaties |
| Offline | IndexedDB (Dexie) + service worker | kast, lijsten en "heb ik dit al?" werken zonder bereik |
| Backend | **Cloudflare Workers + D1-database + R2-opslag** | gratis tier, valt niet stil bij weinig gebruik, synchroniseert tussen toestellen |
| Login | geen (enkel zij gebruikt de app); kan later terugkomen | eenvoudig |
| Boekdata | **Google Books API** + **Open Library** | gratis: covers, ISBN, series, verschijningsdata |
| AI | **Claude API**, aangeroepen vanuit de Worker (de sleutel staat nooit in de app) | cover herkennen + aanbevelingen |
| Hosting | Cloudflare Pages, met een eigen gratis `*.pages.dev`-adres | €0; een eigen domein kan later (± €10/jaar) |

**Sync:** alles wordt eerst lokaal bewaard en daarna gesynchroniseerd. Ze kan dus zonder bereik een boek toevoegen, en het staat later ook op haar iPad.

## 7. AI-kosten en hoe we die vastzetten

Prijzen per aanroep, bij haar gebruik:

| Taak | Model | Kost per keer (± ) |
|---|---|---|
| Cover herkennen | Claude Haiku 5.5 | < $0,001 |
| Top 3 aanbevelingen | Claude Sonnet 5.5 | ± $0,03–0,05 |
| (alternatief) Top 3 met het sterkste model | Claude Opus 5.5 | ± $0,08–0,12 |

Bij ± 15 aanbevelingen en 30 covers per maand:
- met Sonnet kost dat **± $6–9 per jaar**
- met Opus **± $15–20 per jaar**

Mijn vorige schatting (€2–5) was te laag voor Opus.

**Zo kost het zeker niet meer dan afgesproken:**
- De Anthropic API werkt met **vooraf betaald tegoed** (minimum $5). Zonder automatisch bijladen kan er nooit meer uitgegeven worden dan wat erop staat.
- Daarnaast stellen we in de Anthropic Console een **maandlimiet** in.
- De app zelf beperkt het aantal AI-vragen per dag. Zo kan een fout nooit het tegoed opsouperen.
- Gaat het tegoed op, dan blijft alles werken, behalve de AI-tips en de coverherkenning. Zoeken op titel blijft gewoon werken.

## 8. Fasering

| Fase | Inhoud | Status |
|---|---|---|
| **0. Opzet** | project, design-tokens, hosting | ✅ online |
| **1. Bibliotheek** | zoeken en toevoegen, statussen, kwartsterren, review, lijsten met filters, offline | ✅ online |
| **2. Cover-foto** | camera → herkenning, barcode | ✅ online (AI in testmodus) |
| **3. Series + auteurs** | seriepagina's, ontbrekende delen, aangekondigde boeken, favoriete auteurs | ✅ online |
| **4. Vragenlijst + aanbevelingen** | profielquiz, *What's next?*, winkelmodus | ✅ online (AI in testmodus) |
| **5. Boekenkast** | geanimeerde kast met decoratie | ✅ online |
| **Extra** | statistieken ("My reading") | ✅ online |
| **6. Afwerking** | echte AI aanzetten, testen op iPhone, iPad en Mac, bijsturen | ✅ online (AI live) |
| **Extra** | leesstreak, deelbare wenslijst, Wrapped, uitlenen, seizoensdecoratie, auteurs & genres | ✅ online (zie §12) |

Na elke fase krijgt ze een link om te testen, zodat ze kan meedenken.

## 9. Beslist
- Naam: **Snug**
- Aanbevelingen via **Claude Sonnet 5.5**, coverherkenning via Claude Haiku 5.5
- Geen login: Snug opent meteen (enkel zij gebruikt het)
- Het Anthropic-account wordt beheerd door de maker

## 10. Testen zonder kosten
- Zoeken op titel/auteur gebruikt geen AI en is altijd gratis (Google Books + Open Library)
- `AI_MODE=mock`: de AI-functies geven nep-antwoorden, zo kunnen we schermen en flow gratis bijsturen
- Echte AI-antwoorden testen we pas daarna, met een dagelijkse limiet en vooraf betaald tegoed
- Antwoorden worden bewaard: dezelfde vraag twee keer stellen kost maar één keer

## 11. Aanbevelingsmodel (match-scores)

**Principe:** de AI leest elk boek en elke review maar één keer. Alle scores rekent de app daarna zelf uit, gratis, op het toestel, en meteen opnieuw bij elke nieuwe score of review.

**1. Boekanalyse (één keer per boek, Claude Sonnet).**
- Vast vocabulaire in `src/taste/vocab.ts`: 19 schalen (0–5) en ruim 200 tags in 12 groepen.
  - Schalen: romance, spice, tempo van de romance, angst, banter, humor, duisterheid, geweld, emotie, spanning, twists, mysterie, actie, intriges, worldbuilding, tempo van het plot, trage start, complexiteit en karakterfocus.
  - Tag-groepen: genre, setting, tropes, type held, type heldin, wezens, thema's, vertelperspectief, einde, plaats in de reeks, doelpubliek en inhoudswaarschuwingen.
- Daarnaast per boek: vergelijkbare boeken, sfeerwoorden en de reeks.
- Vaste ijkpunten (bijvoorbeeld spice: Twilight 0 · Fourth Wing 3 · ACOMAF 4) houden de analyses consistent.
- Opgeslagen in D1 (`book_profiles`), ongeveer 2–3 kB per boek.

**2. Reviewanalyse (één keer per review).**
- Wat ze goed en slecht vond, in hetzelfde vocabulaire, met sterkte (1–3) en haar eigen woorden als citaat.
- Bij schalen maakt de analyse onderscheid tussen "genoot ervan", "miste het" en "te veel".

**3. Rekenmodel (`src/taste/model.ts`), vier signalen samen:**
1. **Meest gelijkende boeken die ze beoordeelde:** tags, schalen, auteur, vergelijkingen en reeks.
2. **Kenmerken:** welke tags haar scores verklaren, alle tags samen geleerd (ridge-regressie), aangevuld met haar reviews en de quiz.
   - Klachten wegen zwaarder dan complimenten.
   - Eén opmerking weegt minder naarmate een kenmerk vaker in haar boeken voorkomt.
   - Inhoudswaarschuwingen tellen enkel als ze er zelf iets over zei.
3. **Schalen:**
   - Haar ideale niveau per schaal, plus wat haar reviews erover zeggen, verankerd aan het niveau van dat boek: "te duister" over een 5/5-duister boek raakt alleen even duistere boeken.
   - "Te weinig X" geldt enkel voor boeken van dezelfde soort.
4. **Auteur en reeks.** Een later deel van een reeks die ze niet begon, gaat omlaag, met de tip om bij deel 1 te beginnen.

- Signalen die hetzelfde vertellen, worden niet dubbel geteld.
- Zachte grenzen naar 5★ en 1★.
- Weinig gegevens betekent een voorzichtige gok.
- Elke score krijgt een uitleg met haar boeken en haar woorden, en waar nodig een "heads up".

**Getest** met vier testlezers (romantasy, thriller, romcom, epische fantasy; 142 beoordelingen, 35 reviews). Methode: het model voorspelt telkens één boek dat het niet mocht zien. In 7 rondes kritisch bijgestuurd (`PARAMS` in `model.ts`).

| | gemiddelde fout | juiste rangorde |
|---|---|---|
| altijd haar gemiddelde raden | 0,78★ | – |
| ronde 1 | 0,77★ | 81% |
| na 7 rondes | **0,43★** | **85%** |

- Instellingen afgesteld op drie lezers en gecontroleerd op een vierde die het model niet zag. Afstellingen die daar slechter werden, zijn niet overgenomen.
- Grensgevallen getest: alleen de quiz, drie beoordelingen, gelezen maar niets beoordeeld.

**Kosten:**
- ongeveer $0,01 per nieuw boek en $0,002 per review;
- de scores zelf zijn altijd gratis.

**Test op haar eigen smaak:** `npm run taste-check` doet dezelfde test op haar echte bibliotheek.
- Werkwijze: telkens één beoordeeld boek (en de review ervan) weglaten, laten voorspellen en vergelijken met haar eigen score.
- Uitvoer: de gemiddelde fout, hoeveel boeken binnen een halve ster vallen, de juiste volgorde, en de grootste missers met uitleg.
- Gebruikt geen AI en verandert niets.

**Test op haar eigen smaak (november 2026):** 25 beoordeelde boeken, telkens één weggelaten (score én review) en voorspeld.
Afgesteld met een geneste test (de afstelling zag het voorspelde boek nooit): gemiddelde fout 0,47★ → 0,38★,
binnen een halve ster 56% → 64–68%, juiste volgorde 67% → 76%. Haar reviews en de lijst-eigenschappen
(spanning, humor, donker…) wegen nu zwaarder dan tropen, reeksgemiddelde en "lijkt op".


## 12. Stand van zaken en overdracht (15 november 2026)

Alles staat gecommit, gepusht (branch `claude/exciting-newton-7dg99s`) en gedeployed op
https://snug.snugshelf.workers.dev. Dit hoofdstuk is genoeg om in een nieuwe sessie verder te werken.

### 12.1 Wat er nu in de app zit (bovenop §2)
- **Leesstreak** (`/streak`, `src/lib/streak.ts`, `src/components/Streak.tsx`, `src/pages/StreakPage.tsx`)
  - Dagelijkse log: welk boek, tot welke pagina, notitie, "uitgelezen" (→ rating geven).
  - Kalender met pillen, paginavoortgang, bladwijzerlint, "that's N pages" op Home.
  - Een boek uitlezen telt ook als leesdag.
  - Haar streak werd in D1 op 210 dagen gezet: import tot 2026-11-14, plus een log op 2026-11-15
    (A Court of Splintered Harmony p. 248).
- **Deelbare wenslijst** (`/w/kels`, `src/pages/Wishlist.tsx`, `src/pages/SharedWishlist.tsx`)
  - Gevers melden zich aan met e-mail en reserveren stil.
  - Enkel boeken mét koop-link worden gedeeld. Share waarschuwt voor boeken zonder link.
  - ⋯-menu om reservaties te resetten. Kelsey kan kijken zonder spoilers.
  - Reservaties blijven behouden als de link verandert.
- **Wrapped** (`/wrapped`)
  - Story-slides met een persona-kaart en een streak-slide (langste en huidige streak).
  - Ingedrukt houden pauzeert, naar beneden vegen sluit. Een deelbare afbeelding toont geen cadeaus en geen persona.
  - Op Home pas vanaf 1 december. Het huidige jaar staat onder Me enkel in december.
- **Uitlenen** (`src/lib/lending.ts`, `src/components/Lending.tsx`, `src/pages/Lent.tsx`)
  - Uitlenen aan iemand, een pagina "Lent out", geschiedenis en een deelbare lijst.
  - Bevestigen vóór "terug". "Put back on loan" zet een lening terug. Titels linken naar het boek.
- **Auteurs & genres** (Me → aparte knop, `src/pages/AuthorsGenres.tsx`)
  - Eén lijst gevolgde auteurs met favoriet-knop en "stop following", plus een lijst "Not following" met "Follow again".
  - Een naam opent de bibliotheek, gefilterd op die auteur.
  - Automatisch gevolgd: auteurs met ≥ 2 boeken of één boek met ≥ 4,5★. Maximum 30 auteurs.
  - Extra genres, waaronder "Literature", en eigen genres.
- **New from your authors** (`src/lib/authors.ts`)
  - Venster: 1 jaar terug tot 2,5 jaar vooruit.
  - Enkel Engelse en Nederlandse boeken. Boeken zonder gekende taal worden ook weggelaten, zelfs toekomstige.
  - Geen nieuwe edities of herdrukken: die worden gecontroleerd op de vroegste Google-datum.
  - "Witch" en "The Witch" tellen als hetzelfde boek. Onzinnige datums vallen weg. Cache-sleutel `authorNews11`.
- **Reeksen** (`src/lib/seriesGoogle.ts`, `src/lib/seriesLookup.ts`, `worker/ai.ts`)
  - Eerst gratis: Open Library en Google (titels en boxsets).
  - Pas als dat niets oplevert: AI, één keer per reeks, met web search en 180 dagen cache op de server.
  - De lijst wordt op het toestel bewaard.
- **Covers** (`src/lib/coverCache.ts`, `src/components/Cover.tsx`)
  - Reservecovers via ISBN (Open Library), herkenning van lege 1×1-afbeeldingen, een proxy en geheugencache.
  - Ontbrekende covers worden aangevuld.
  - Buitenlandse edities worden niet getoond. Buitenlandse flapteksten worden hersteld.
- **Bibliotheek**
  - Onthoudt het tabblad, de sortering (zonder te verspringen) en de scrollpositie.
  - Filter "Owned" toont alles behalve de wenslijst.
  - Een pijl naar boven verschijnt als ze ver naar beneden staat.
  - Andere pagina's openen bovenaan; "terug" zet de scrollpositie terug.
- **Kast** (`src/pages/Shelf.tsx`, `src/components/ShelfDecor.tsx`)
  - Een boog met een gouden plaatje toont het aantal boeken (zonder wenslijst) en linkt naar Owned.
  - Boekbreedtes 0,88–1,14. Nieuwe boeken animeren maar één keer.
  - Dagelijks wisselende decoratie: minstens 2 stukken, op eender welke plank, zoals de globe (snel draaien bij tik) en een schilderij.
  - De kat heeft stemmingen: tevreden na het lezen, één oog open na 17u.
- **Toetsenbord en sheets** (`src/lib/keyboard.ts`)
  - Sheets blijven onderaan plakken; de achtergrond scrollt niet mee.
  - Invoervelden zijn 16px, zodat iOS niet inzoomt.
- **AI-pauzeknop** (Me → AiPauseCard, D1-tabel `settings`, sleutel `ai_paused`)
  - Zet boekanalyses, reviewanalyses en de reeks-AI stil, bijvoorbeeld tijdens het massaal toevoegen.
  - Gelezen boeken zonder score worden nooit geanalyseerd.
- **Bewust weggehaald op vraag:** prijs- en kastwaarde-functie, animatie op de plusknop.

### 12.2 Wat kost geld (AI, Claude Sonnet 5.5)
| Functie | Wanneer | Kost |
|---|---|---|
| Boekanalyse | 1× per nieuw boek (niet tijdens de pauze, niet voor gelezen boeken zonder score) | ± $0,01 |
| Reviewanalyse | 1× per nieuwe of gewijzigde review | ± $0,002 |
| Reekslijst | enkel als Open Library en Google niets vinden, 1× per reeks | ± $0,02–0,05 |
| Cover-foto | per foto (Haiku) | < $0,001 |

Gratis zijn: zoeken, ISBN, covers, Open Library en Google, *New from your authors* en alle match-scores (die worden op het toestel berekend).

Limieten in `worker/ai.ts`:
- analyses: 150 per dag (`ANALYSIS_DAILY_LIMIT`, teller `analysis:YYYY-MM-DD` in `ai_usage`);
- andere vragen: 40 per dag (`AI_DAILY_LIMIT`).

### 12.3 Smaakmodel: test op haar echte data (november 2026)
- **Methode:** telkens één van haar 25 beoordeelde boeken weglaten (score én review), laten voorspellen en vergelijken.
- **Afstelling:** `PARAMS` in `src/taste/model.ts` is daarop afgesteld, gecontroleerd met een geneste test.

| | gemiddelde fout | binnen ½★ | juiste volgorde |
|---|---|---|---|
| altijd haar gemiddelde raden | 0,57★ | – | – |
| oud model | 0,47★ | 56% | 67% |
| afgesteld (eerlijke geneste schatting) | **0,38★** | 64–68% | **76%** |

- **Wat elk deel bijdraagt:**

  | Wat het model mag gebruiken | Gemiddelde fout |
  |---|---|
  | Alles | 0,37★ |
  | Zonder reviews | 0,40★ |
  | Zonder quiz | 0,38★ |
  | Alleen scores | 0,42★ |

- **Leercurve:**

  | Aantal beoordeelde boeken | Gemiddelde fout |
  |---|---|
  | 3 | 0,55★ |
  | 6 | 0,46★ |
  | 10 | 0,44★ |
  | 15 | 0,41★ |
  | 20 | 0,39★ |
  | 24 | 0,37★ |

  De grootste winst zit in de eerste 10–15 boeken.
- **Klachten in reviews:**
  - In haar 25 reviews staan 85 complimenten, maar slechts 2 klachten (ACOFAS "middle of a series", ACOTAR trage start) en 7 keer "dit miste ik".
  - Met en zonder klachten is de fout gelijk (0,37★). Ook 2–4× zwaarder wegen veranderde niets: er zijn nog te weinig klachten om uit te leren.
  - De winst van reviews komt nu volledig uit de complimenten.
  - Klachten wegen per opmerking al ± 3× zwaarder dan complimenten (`reviewDislike` 0,5 vs `reviewLike` 0,15) en sturen de "heads up"-waarschuwingen.
- **Grootste missers** zijn boeken die ze lager scoorde: The Housemaid Is Watching, ACOTAR, Regretting You, ACOFAS, Flawless. Haar scores liggen bijna allemaal tussen 4 en 5 (gemiddeld 4,3).
- **Advies aan Kelsey:** ook oudere en minder goede boeken scoren, en bij een minder goed boek één concreet zinnetje schrijven over wat stoorde ("te traag in het midden", "te veel drama").
- **Volgende stap:** na 15–20 extra beoordeelde boeken, waarvan ± 10 minder goede met een klacht, de test opnieuw doen. Dan bekijken of klachten zwaarder mogen wegen.
- **Testbestanden:**
  - `npm run taste-check` voert de test uit; gebruikt geen AI en verandert niets.
  - De scripts in de scratchpad (`loo.ts`, `nested.ts`, `curve.ts`, `neg.ts`) gaan verloren met de sessie. Opnieuw opbouwen kan uit een export van haar records: boeken, `book_profiles` en het profiel.

### 12.4 Werkwijze
- **Deploy:**
  - Commando: `npm run build && CLOUDFLARE_API_TOKEN=proxy-injected WRANGLER_SEND_METRICS=false npx wrangler deploy`.
  - Bij Cloudflare-fout 971 (rate limit): een paar minuten wachten en opnieuw proberen.
- **D1 op afstand:** `npx wrangler d1 execute snug --remote --command "…"`. Migraties 0001–0009 zijn toegepast.
- **Sync:** de tabel `records` (soorten book, profile en day) werkt met last-write-wins op `updatedAt`.
  Schrijf enkel rechtstreeks in haar records als daarom gevraagd wordt: zo worden haar niet-gesynchroniseerde wijzigingen niet overschreven.
- **Testen:** Playwright tegen `npx wrangler dev --port 8787`, of de Vite-dev-server (5173) om modules in de browser te testen.
- **Regels:**
  - Geen login (bewuste keuze).
  - Geen e-mailadressen of sleutels in de repo; sleutels gaan via `wrangler secret put`.
  - De app is in het Engels; overleg gebeurt in het Nederlands.

### 12.5 Open punten en voorstellen
- De smaaktest opnieuw doen na meer beoordelingen (zie §12.3).
- Optioneel: aangekondigde boeken zonder taalcode maar met een Engelse titel toch tonen. Nu vallen echte nieuwe boeken van bv. Nicci French of Lucy Score weg.
- E-mailverificatie voor wenslijst-gevers, pas als er een eigen domein komt.
- De README-sectie "How match scores work" beschrijft nog het oude AI-portret. Het werkelijke model staat in §11 en §12.3.
