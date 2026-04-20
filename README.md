# RegExtract Studio
*(Pôvodne: Universal - Translator Helper)*

**RegExtract Studio** je moderný, bezpečný a plne lokálny prehliadačový nástroj navrhnutý pre prekladateľov a lokalizátorov. Jeho primárnym cieľom je zjednodušiť náročný proces extrahovania textov z komplexných štruktúr (JSON, XML, CSV, INI, vlastné interné herné formáty) do čistých TXT súborov pre CAT (Computer-Assisted Translation) nástroje a strojové prekladače. Po preklade sa texty poskladajú naspäť do ich pôvodnej formy a štruktúry bez toho, aby bol narušený kód. 

Celá mágia na pozadí je založená na inteligentnom lokálnom generátore regulárnych výrazov (Regex).

---

## 🚀 Prehľad Funkcií

Bez ohľadu na zložitosť súboru sa aplikácia pozerá na dáta cez optiku **Regulárnych Výrazov** (a v prípade CSV ich bezpečne prečíta cez PapaParse). Kľúčovou vlastnosťou je Zero-server prístup: všetky súbory zostávajú na vašom disku v RAM vášho prehliadača.

### 1. Vizuálny Regex Generátor (Manuálna Analýza)
- Používateľ načíta vzorový súbor a priamo myšou si označí, ktorú časť riadku je potrebné "preložiť" a ktorú "ignorovať".
- **Zelená (Text na preklad):** Text sa označí ako cieľový na preklad (`(.*?)`).
- **Oranžová (Technický parameter):** Extrémne užitočné na dynamické IDčka (napr. `"msg_001"`). Označením povieš generátoru, aby na tomto mieste na syntax netrval a použil wildcard `.*?`.
- Každý iný znak v riadku sa generátorom bezpečne „escapne“ a aplikuje na celý súbor. 
- Systém bezpečne odfiltruje kód a pre Vás sa otvoria len čisté vety a nadpisy.

### 2. Multi-skupinové riadky (Viacero prekladov v jednom riadku)
Máte riadok tvorený štýlom `<D_100>Ahoj</D><D_101>Svet</D>`? Žiadny problém! Označte slovo "Ahoj" ako text na preklad, "Svet" ako text na preklad a čísla 100/101 ako technickú časť. Generátor to spracuje.

### 3. Vlastné Profily Hry
Po zostavení Regexu si aplikácia dokáže Regex a Názov hry uložiť do LocalStorage prehliadača. Budúce aktualizácie hry spracujete dvoma kliknutiami.

### 4. Správa Projektov (Mapovacie súbory)
Za každým úspešným spracovaním získa užívateľ **Mapu projektu** `.map.json`. Je to vnútorný štruktúrny kompas aplikácie na poskladanie finálneho textu. Zároveň stiahnete **čistý text** `.txt` so samotnými vetami na preklad (po riadkoch).

### 5. Hromadné Skladanie a Extrakcia (Batch Reassembly)
Pre moderné hry zložené zo 100+ malých JSON/XML súborov môžete hromadne odovzdať balík súborov, aplikovať na nich pripravený Profil a ZIP súbor vám vypľuje hotové TXT + MAP dáta.
Na konci nahráte balíky preložených TXT a MAP nazad a stiahnete ZIP hotových preložených súborov hry!

### 6. Bezpečnosť a Súkromie
Od verzie 2.1 aplikácia **nepoužíva žiadne AI cloud api spracovanie**. Celý Regex engine bol napísaný nanovo s priamym behom v JS. Neodosielate útržky chránených hier (NDA) na cudzie servery.

---

## 🛠 Návod na použitie: Krok po kroku

### Získavanie Textu (Krok 1)
1. Zvoľte **Nový preklad** (pre jeden súbor) alebo **Hromadné spracovanie**.
2. Vyberte profil hry alebo prejdite do sekcie **Manuálna Analýza (Generátor)**.
3. V Manuálnej Analýze vyberte vzorový súbor. Zobrazí sa vám až **1000 riadkov** aktuálneho formátu s pokročilým stránkovaním v spodnej aj vrchnej časti okna.
4. Myšou presvietite slovo/vetu a kliknite na "Označiť ako preklad" (zelená).
5. (Voliteľné) Ak je niekde kľúč (napr. číslo riadku "012"), označte ho "Technická časť" (oranžová).
6. Uistite sa, že ste neoznačili úvodzovky, čiarky, alebo `{"`.
7. Stlačte **Vygenerovať Regex**. Predvyplní sa políčko Regexu.
8. Nazvite Hru a kliknite **Spracovať súbor**.

### Fáza prekladu (Krok 2)
1. Po presnom rozrezaní súboru Vám vyskočí okno exportu. Vidíte počet všetkých a preložiteľných riadkov. 
2. Stlačte **Stiahnuť súbor prekladu (TXT)** a takisto **Stiahnuť Mapu projektu (JSON)**! Toto sú Vám dôležité artefakty. 
3. Súbor `_clean_lines.txt` importujete do Vášho softvéru a pohodlne prekladáte. Nesmiete zmazať či zameniť počet riadkov! (Prázdne vety vo vývoji nezahadzujte, nechajte riadok prázdny).

### Skladanie zbraní (Krok 3)
1. Aplikáciu si pokojne pozatvárajte. Prispôsobte sa Vášmu času.
2. Vráťte sa k aplikácii (zvoľte príslušný projekt). 
3. Do ľavého poľa vložte `moja_hra.map.json`.
4. Do pravého poľa nahrajte ten istý, ale už Preložený text (Váš výstup z prekladača).
5. Otvorí sa Diff checker! Krásne prehľadné riadky, Zelené svetlo kedy bol riadok zmenený z pôvodného. Prelistujte a ak ste spokojný...
6. Kliknite na **Stiahnuť finálny súbor**. (Aplikácia ho navyše pomenuje rovnako ako sa volal originál!)

---

## 💻 Technické Detaily Pre IT

- **Základ:** React (Vite) + Typescript.
- **Dizajn a UI:** Tailwind CSS (skôr do tematiky Hacker/Cyberpunk s neon farbami), React Lucide ikony.
- **CSV Knižnice:** PapaParse pre plné rešpektovanie zložitého vnútru `\n` v CSV poliach.
- **ZIPing:** JSZip (Pre Batch importy/exporty po jednom stlačení).
- **Core Engine:** Vlastný RegexBuilder algoritmus. Unikátne escapuje RegExp syntax bez prítomnosti obskúrnych balíčkov a rozkladá string na Regex metadáta s dynamickými poľami `(.*?)`.

---
**Vytvoril:** Flego  
**Verzia:** 2.1 (RegExtract Studio Zero-Server)
