# RegExtract Studio
*(Pôvodne: Universal - Translator Helper)*

**RegExtract Studio** je moderný, bezpečný a plne lokálny prehliadačový nástroj navrhnutý pre prekladateľov a lokalizátorov. Jeho primárnym cieľom je zjednodušiť náročný proces extrahovania textov z komplexných štruktúr (JSON, XML, CSV, INI, vlastné interné herné formáty) do čistých TXT súborov pre CAT (Computer-Assisted Translation) nástroje a strojové prekladače. Po preklade sa texty poskladajú naspäť do ich pôvodnej formy a štruktúry bez toho, aby bol narušený kód. 

Celá mágia na pozadí je založená na inteligentnom lokálnom generátore regulárnych výrazov (Regex).
<img width="1649" height="1246" alt="image" src="https://github.com/user-attachments/assets/64bace9d-eb02-41ba-90a1-bcb7f5667976" />

---

## 🚀 Prehľad Funkcií

Bez ohľadu na zložitosť súboru sa aplikácia pozerá na dáta cez optiku **Regulárnych Výrazov** (a v prípade CSV ich bezpečne prečíta cez PapaParse). Kľúčovou vlastnosťou je Zero-server prístup: všetky súbory zostávajú na vašom disku v RAM vášho prehliadača.

### 1. Vizuálny Regex Generátor (Manuálna Analýza)
- Používateľ načíta vzorový súbor a priamo myšou si označí, ktorú časť riadku je potrebné "preložiť" a ktorú "ignorovať".
- **Zelená (Text na preklad):** Text sa označí ako cieľový na preklad (`(.*?)`).
- **Oranžová (Technický parameter):** Extrémne užitočné na dynamické IDčka (napr. `"msg_001"`). Označením povieš generátoru, aby na tomto mieste na syntax netrval a použil wildcard `.*?`.
- Systém bezpečne odfiltruje kód a pre Vás sa otvoria len čisté vety a nadpisy s **vysokou presnosťou** zachytávania vďaka inteligentnej detekcii okolitých medzier a špeciálnych znakov.

### 2. Manuálna Analýza Unity (I2Languages)
- Špeciálny modul určený pre komplexné Unity textové exporty (napr. platforma I2Localization).
- **Cieľový Index Jazyka:** Na rozdiel od Regexu tu stačí zadať číselný index (0, 1, 2...) jazyka, ktorého dáta chcete zo súboru vyextrahovať.
- Algoritmus automaticky analyzuje vnorenú štruktúru `TermData` a `Languages`, pričom bezpečne extrahuje stringy z `data` polí bez poškodenia zvyšku súboru.

### 3. Pokročilé CSV / TSV parsovanie
- Podpora pre štandardné oddeľovače (čiarka, stredník, tabulátor).
- **Index hlavičky:** Možnosť vynechať z extrakcie a prekladu špecifický riadok hlavičky (napríklad nastaviť na 0 pre prvý riadok).
- **Viacriadkové dáta:** Podpora polí, ktoré obsahujú zalomenia riadkov (rešpektuje úvodzovky).
- **Escape Character:** Možnosť nastaviť únikový znak (najčastejšie `\`) pre korektné načítanie textov so špeciálnymi znakmi.
- **Unity TextAsset (m_Script) sub-mód:** Unikátna funkcia pri ktorej sa dáta nachádzajú ako "vnorené CSV" vo vnútri jedinej textovej premennej (napr. vizuálny gigantický riadok escapovaný cez `\r\n`). Tento režim rozbije premennú na virtuálnu tabuľku, po riadkoch ju preloží a spätne poskladá do striktne jednej kóderskej riadky aj po nahratí prekladov!

### 4. Inteligentné UI a Tooltipy
- Celé rozhranie aplikácie je vybavené pomocnými textami (tooltips), ktoré sa zobrazia po **nabehnutí kurzorom** na akékoľvek tlačidlo alebo funkciu.
- Náhľad analýzy zdrojového súboru zobrazuje až **200 riadkov** pre okamžitú vizuálnu kontrolu úspešnosti extrakcie.

### 5. Multi-skupinové riadky (Viacero prekladov v jednom riadku)
Máte riadok tvorený štýlom `<D_100>Ahoj</D><D_101>Svet</D>`? Žiadny problém! Označte slovo "Ahoj" ako text na preklad, "Svet" ako text na preklad a čísla 100/101 ako technickú časť. Generátor to spracuje.

### 6. Vlastné Profily Hry
Po zostavení konfigurácie (Regex, CSV nastavenia alebo Unity index) si aplikácia dokáže Profil a Názov hry uložiť do LocalStorage prehliadača. Budúce aktualizácie hry spracujete dvoma kliknutiami.

### 7. Správa Projektov (Mapovacie súbory)
Za každým úspešným spracovaním získa užívateľ **Mapu projektu** `.map.json`. Je to vnútorný štruktúrny kompas aplikácie na poskladanie finálneho textu. Zároveň stiahnete **čistý text** `.txt` so samotnými vetami na preklad (po riadkoch).

### 8. Hromadné Skladanie a Extrakcia (Batch Reassembly)
Pre moderné hry zložené zo 100+ súborov môžete hromadne odovzdať balík súborov, aplikovať na nich pripravený Profil a stiahnuť ZIP s hotovými TXT + MAP dátami.
Na konci nahráte balíky preložených TXT a MAP nazad a stiahnete ZIP hotových preložených súborov hry!

### 9. Bezpečnosť a Súkromie
Aplikácia je **plne offline**. Celý parsovací engine beží priamo vo vašom prehliadači. Neodosielate útržky chránených hier (NDA) na žiadne servery.

---

## 🛠 Návod na použitie: Krok po kroku

### Získavanie Textu (Krok 1)
1. Zvoľte **Nový preklad** alebo **Hromadné spracovanie**.
2. Vyberte profil hry alebo použite jeden z generátorov (**Manuálna Analýza** alebo **Unity**).
3. V Manuálnej Analýze vyberte vzorový súbor. Zobrazí sa vám riadky aktuálneho formátu s pokročilým stránkovaním.
4. Myšou presvietite slovo/vetu a kliknite na "Označiť ako preklad" (zelená).
5. Stlačte **Vygenerovať Regex**. (Alebo pri Unity móde nastavte index jazyka).
6. Nazvite Hru a kliknite **Spracovať súbor**.

### Fáza prekladu (Krok 2)
1. Stiahnite si **Čistý text (.txt)** a **Mapu (.json)**.
2. Súbor `.txt` preložte v ľubovoľnom editore alebo CAT nástroji. Nesmiete meniť počet riadkov!

### Skladanie finálneho súboru (Krok 3)
1. Vráťte sa k aplikácii (zvoľte príslušný projekt alebo nahrajte mapu). 
2. Do poľa nahrávania vložte Mapu a Váš preložený TXT.
3. Diff preview vám ukáže zmeny. Skontrolujte zelené a červené highlighty.
4. Kliknite na **Stiahnuť finálny súbor**.
 (Aplikácia ho navyše pomenuje rovnako ako sa volal originál!)

---

## 💻 Technické Detaily Pre IT

- **Základ:** React (Vite) + Typescript.
- **Dizajn a UI:** Tailwind CSS (skôr do tematiky Hacker/Cyberpunk s neon farbami), React Lucide ikony.
- **CSV Knižnice:** PapaParse pre plné rešpektovanie zložitého vnútru `\n` v CSV poliach.
- **ZIPing:** JSZip (Pre Batch importy/exporty po jednom stlačení).
- **Core Engine:** Vlastný RegexBuilder algoritmus. Unikátne escapuje RegExp syntax bez prítomnosti obskúrnych balíčkov a rozkladá string na Regex metadáta s dynamickými poľami `(.*?)`.

---
**Vytvoril:** Flego  
**Verzia:** 2.2 (RegExtract Studio Zero-Server)
