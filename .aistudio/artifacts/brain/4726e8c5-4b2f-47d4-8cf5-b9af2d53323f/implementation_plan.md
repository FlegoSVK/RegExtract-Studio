# RegExtract Studio: Moderný Split-Screen Analyzátor & Inteligentný Regex Engine

Tento plán popisuje komplexnú modernizáciu aplikácie RegExtract Studio so zameraním na pokročilé generovanie regulárnych výrazov pri manuálnej analýze, split-screen testovacie rozhranie s okamžitou spätnou väzbou a prémiový vizuálny dizajn v štýle moderného tmavého herného nástroja.

## Používateľské rozhodnutia a potvrdené voľby

> [!IMPORTANT]
> Na základe Vašich odpovedí v 1. fáze implementujeme nasledujúcu architektúru:

- **Potvrdená stratégia tvorby Regexu**: Viacúrovňový generátor návrhov (**Strict**, **Smart Pattern**, **Flexible**), ktorý umožňuje prepínať medzi prísnou štruktúrou, inteligentnou detekciou úvodzoviek/tagov/čísel a uvoľneným vzorom.
- **Potvrdené rozhranie Manuálnej Analýzy**: Split-screen pracovná plocha so živým počítadlom zhôd (napr. *450 z 600 riadkov*), zoznamom vzorových nálezov, diagnostikou nezhodujúcich sa riadkov a interaktívnym vizuálnym zvýrazňovačom.
- **Potvrdený vizuálny štýl**: Moderný tmavý bridlicový dizajn (dark slate `#0a0f1d`) s čistým písmom, tyrkysovým herným akcentom (`#00f0ff` / `cyan-400`), jemnými 1px deliacimi líniami a ergonomickým rozložením bez vizuálneho balastu.

---

## 1. Prehľad a Hlavný Koncept

- **Čo aplikácia rieši**: RegExtract Studio je špecializovaný offline nástroj na lokalizáciu a extrakciu herných dialógov a systémových textov (z textových scriptov, dialógov, CSV/TSV, Unity Assetov a Unreal Engine 5 JSON exportov).
- **Cieľová skupina**: Prekladatelia hier, lokalizačné tímy a herní modderi, ktorí potrebujú bezpečne a presne oddeliť preložiteľné texty od herného kódu bez rizika poškodenia formátu.
- **Hlavná pridaná hodnota**: Eliminácia potreby ručného písania komplexných regulárnych výrazov. Používateľ iba myšou označí preložiteľný text v riadku a engine automaticky vygeneruje 3 overené vzory s okamžitou štatistikou zhôd v reálnom čase.

---

## 2. Používateľský Zážitok a Vizuálny Dizajn (UX & UI)

### Kľúčový používateľský tok (User Flow)
1. **Nahranie a voľba režimu**: Používateľ nahrá vzorový herný súbor (textový, CSV, Unity alebo UE5 JSON) alebo využije rýchly vstup.
2. **Manuálna Analýza v Split-Screen**:
   - **Ľavý panel (Editor & Označovanie)**: Zobrazenie vybraného riadku. Používateľ potiahnutím myši označí text na preklad (zelený tyrkys) alebo technickú časť (modrá/fialová).
   - **Pravý panel (Návrhy Regexu & Štatistika)**: Okamžite vygeneruje 3 alternatívy s vysvetlením a živým testom naprieč celým nahratým súborom:
     - 🛡️ **Prísny (Strict)**: Presné znaky, minimálne riziko falošných zhôd.
     - ⚡ **Inteligentný (Smart Pattern)**: Automaticky nahradí dynamické ID (`\d+`), úvodzovky (`"([^"]*)"`), XML/HTML tagy a atribúty.
     - 🌐 **Flexibilný (Flexible)**: Voľné medzery a dynamické ohraničenia vhodné pre riadky s premenlivou dĺžkou.
   - **Spodný kontrolný panel zhôd**: Živý zoznam riadkov v súbore, ktoré daný výraz zachytáva, a zoznam riadkov, ktoré nezachytil (s možnosťou kliknutia na nezhodujúci sa riadok pre ďalšiu analýzu).
3. **Aplikácia a Extrakcia**: Jedným klikom aplikuje vybraný regulárny výraz do profilu a umožní stiahnuť čistý `.txt` pre prekladač + `.map.json` na neskoršie spätné zloženie.
4. **Reassembly / Zloženie**: Preložený text sa spoľahlivo vloží späť do pôvodnej štruktúry súboru.

### Vizuálna Identita a Dizajnové Princípy
- **Farebná paleta (60-30-10)**:
  - 60% Plátno: Tmavo-modrá bridlica (`#070b14` a `#0d1527`).
  - 30% Štrukturálne povrchy: Karty a panely s jemným orámovaním (`#1e293b`), zvýraznenie riadkov a vstupy (`#0f172a`).
  - 10% Akcenty: Herná tyrkysová (`#00f0ff` / `cyan-400`), úspech (`#10b981`), varovanie (`#f59e0b`).
- **Typografia**:
  - Nadpisy a UI: `Plus Jakarta Sans` pre čistú modernú čitateľnosť.
  - Regex, kód a tabuľkové dáta: `JetBrains Mono` s `tabular-nums` pre presné zarovnanie znakov.
- **Ergonómia**:
  - Žiadne dekoratívne nefungujúce prvky, žiadne rušivé blikajúce efekty.
  - Rýchle klávesové skratky pre označovanie (`T` pre preklad, `K` pre technickú časť, `C` pre vyčistenie).
  - Prehľadné záložky medzi režimami (Regex Engine, CSV/TSV, Unity TextAsset, UE5 UAssetAPI, Batch Processing, Spätné zloženie).

---

## 3. Kľúčové Architektonické Rozhodnutia a Vylepšenia

### 1. Pokročilý Multi-Strategy Regex Builder (`services/regexBuilder.ts`)
- **Stav pred zmenou**: Pôvodný algoritmus len dosadzoval text z riadku a orezal ho cez `escapeRegExp` do pevného reťazca s `.*?`. Zlyhával pri riadkoch s inými ID číslami, inými úvodzovkami alebo drobnými odchýlkami.
- **Nové riešenie**:
  1. **Strict Strategy**: Presný štrukturálny regex zachovávajúci presné kotevné body.
  2. **Smart Pattern Strategy**:
     - Deteguje čísla v technických častiach a generuje `\d+` namiesto pevného čísla.
     - Deteguje ohraničenia v úvodzovkách (`"..."` alebo `'...'`) a generuje negované triedy `"[^"]*"` pre spoľahlivé zachytenie bez pretekania.
     - Deteguje XML/HTML tagy `<tag ...>Text</tag>` a vytvorí odolnú kotevnú štruktúru.
     - Normalizuje flexibilné medzery `\s*` tam, kde je formátovanie premenlivé.
  3. **Flexible Strategy**: Uvoľnené ohraničenia pre dialógové scripty s nepravidelným formátom.

### 2. Real-time File Diagnostic & Match Evaluator
- Analyzátor v pamäti otestuje každý návrh regexu oproti všetkým načítaným riadkom súboru.
- Okamžite zobrazí:
  - Celkový počet zhôd a percentuálnu úspešnosť.
  - Zoznam prvých 20 zachytených riadkov s vizuálnym farebným rozlíšením extrahovaných skupín.
  - Zoznam prvých nezachytených riadkov s možnosťou kliknúť a načítať ich priamo do označovacieho editora na doladenie.

### 3. Vylepšenie UE5 & Batch Spracovania
- Vylepšenie detekcie UE5 kľúčov priamo v paneli režimov so zobrazením počtu nájdených riadkov pre každý dostupný jazyk.
- Zabezpečenie okamžitej aktivácie tlačidiel "Spracovať súbor" a "Hromadné spracovanie" bez nejasností.

---

## 4. Technická Architektúra a Tok Dát

```
┌────────────────────────────────────────────────────────────────────────┐
│                        RegExtract Studio UI                            │
├──────────────────────────────────┬─────────────────────────────────────┤
│      Vstup a Výber Režimu        │          Správa Projektov           │
│  [Regex] [CSV] [Unity] [UE5 JSON]│    [Uložené Profily] [Export/Import]│
└──────────────────────────────────┴─────────────────────────────────────┘
                                   │
                                   ▼
┌────────────────────────────────────────────────────────────────────────┐
│                     Manuálna Analýza (Split-Screen)                    │
├──────────────────────────────────┬─────────────────────────────────────┤
│        Ľavý Panel: Editor        │         Pravý Panel: Návrhy         │
│  - Zoznam riadkov súboru         │  - 3 Alternatívy: Strict / Smart /  │
│  - Text riadku s vizuálnym       │    Flexible                         │
│    výberom (označenie myšou)     │  - Okamžitá štatistika zhôd         │
│  - Tlačidlá Translatable / Tech  │  - Tlačidlo "Použiť tento výraz"    │
└──────────────────────────────────┴─────────────────────────────────────┘
                                   │
                                   ▼
┌────────────────────────────────────────────────────────────────────────┐
│                   Živý Diagnostický Panel (Spodok)                     │
│  - Počet zachytených riadkov: [ 482 / 512 ] (94.1%)                    │
│  - Náhľad extrahovaných textov v reálnom čase                          │
│  - Zoznam nezachytených riadkov (1-click načítanie na analýzu)         │
└────────────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
┌────────────────────────────────────────────────────────────────────────┐
│               Spracovanie (Parser & Reassembly Engine)                 │
│  - Generovanie čistého TXT pre preklad (1 veta = 1 riadok)             │
│  - Generovanie štruktúrneho mapovacieho súboru (.map.json)             │
│  - Spätné poskladanie preloženého súboru v plnej pôvodnej štruktúre    │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 5. Implementačné Kroky

1. **Rozšírenie `services/regexBuilder.ts`**:
   - Vytvorenie typu `RegexProposal` s atribútmi `name`, `type` (`strict`, `smart`, `flexible`), `pattern`, `description`, `confidence`.
   - Implementácia detekcie úvodzoviek, tagov, číselných identifikátorov a bezpečných regulárnych výrazov.
2. **Vytvorenie testovacieho a validačného enginu (`services/regexTester.ts`)**:
   - Funkcia pre testovanie regexu na zozname riadkov: výpočet počtu zhôd, extrahovaných skupín, nezachytených riadkov a potenciálnych varovaní (napr. prázdne extrahované skupiny).
3. **Prepracovanie Split-Screen rozhrania v `App.tsx`**:
   - Vytvorenie dedikovaného split-screen rozhrania pre Manuálnu Analýzu s moderným vizuálom.
   - Pridanie panelu s kartami pre návrhy regexu a interaktívnymi tlačidlami na testovanie.
   - Pridanie záložky "Zachytené riadky" a "Nezachytené riadky" pre 100% istotu pred extrakciou.
4. **Vizuálny a typografický redesign**:
   - Zjednotenie farebných prechodov a povrchov na prémiový tmavý bridlicový vzhľad s tyrkysovým herným akcentom.
   - Odstránenie neergonomických prvkov a zladenie s pravidlami Frontend Design ústavy (žiadne duplicitné pilulky, vysoká čitateľnosť, ostré 1px hranice).
5. **Kompilácia a validácia**:
   - Overenie funkčnosti cez `compile_applet` a `lint_applet`.
