# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

A felhasználóval magyarul beszélj. A felület szövegei, a README és a kommentek magyarok, az azonosítók angolok.

## A projekt röviden

**Játékidő Elosztó:** időzítő, ami a megadott neveket körbeforgatja.

- A teljes idő kicsiben számol vissza; a soron lévő név és a köréből hátralévő idő nagyban látszik.
- Kör végén sípol, és megjelenik a „Kattints a képernyőre” fátyol. A következő kör, és vele a teljes idő is, csak kattintásra indul.
- A végén „Letelt az idő!” látszik.
- Van Szünet/Folytatás gomb, és megerősítést kérő Leállítás.

Ugyanaz a `web/` mappa két kiadásban fut:

- **Windows-program:** Electron → NSIS-telepítő (`npm run dist`).
- **Telefonos webapp (PWA):** GitHub Pages, https://belltate.github.io/jatekido/ (`npm run deploy:web`).

## Helyek

- **Forrás (ez a repó):** `C:\Users\eleke\dev\jatekido`, szándékosan a OneDrive-on kívül.
  - GitHub: https://github.com/Belltate/jatekido, `main` ág.
  - A `gh-pages` ágat csak a `deploy:web` írja.
- **A felhasználó munkamappája:** `C:\Users\eleke\OneDrive\Asztali gép\játék felosztás`.
  - `plans\2026-10-19-jatekido-eloszto.md`: a terv, a végén az eltérésekkel és a változásnaplóval. Új terveket is ebbe a `plans\` mappába írj, ne a repóba.
  - A legfrissebb setup.exe másolata is itt van.

## Parancsok (a repó gyökerében)

| Parancs | Mire |
|---|---|
| `npm test` | Vitest egységtesztek (`tests/*.test.js`) |
| `npx vitest run tests/timer.test.js -t "átadás"` | egy fájl vagy egy teszt |
| `npm run e2e` | Playwright, két projekt (lásd alább) |
| `npx playwright test --project electron -g "Szünet"` | egy E2E-teszt |
| `JATEKIDO_EXE=release/win-unpacked/Jatekido.exe npx playwright test --project electron` | a becsomagolt exe tesztje (`npm run dist` után) |
| `npm start` | a Windows-program indítása fejlesztéshez (`tools/start.mjs`) |
| `npm run web` | helyi szerver a telefonos apphoz: http://127.0.0.1:8080 (a service worker csak http-n működik) |
| `npm run icons` | az ikonok újrarajzolása kódból (`tools/gen-icons.mjs` → `build/icon.png`, `web/icons/`) |
| `npm run dist` | `release/Jatekido-Eloszto-Setup-<verzió>.exe` |
| `npm run deploy:web` | `web/` → `gh-pages` (git subtree push) |

A két Playwright-projekt:

- **`electron`:** `tests/e2e/app.spec.js`, a valódi ablakon.
- **`web`:** `tests/e2e/web.spec.js`, telefonméretű nézetben, a gépre telepített Edge-ben. A `tools/serve.mjs` szolgálja ki a 4173-as porton.

Nincs build-lépés, bundler, TypeScript és linter: a `web/` sima ES-modulokból áll, és változtatás nélkül fut Electronban és a weben is.

## Felépítés

- **`web/timer.js`:** a teljes időlogika, tiszta függvényekben. Nincs benne DOM és valós idő; az időt (`now`, ms) mindig a hívó adja át.
  - `snapshot(config, ms)`: ki van soron, és mennyi van hátra.
  - Session-függvények: `startSession`, `elapsedMs`, `pauseSession`, `resumeSession`.
  - `stopAtTurnEnd`: a kör határán megállítja a menetet átadásra. Ha később vette észre, az átfutott időt sem számolja. A `resumeSession` indítja tovább.
  - `soundBetween`: eldönti, mikor kell hang.
  - Az idő mindig `Date.now()`-különbségből számolódik, sosem csökkentett számlálóból. A szünet és az átadás a `pausedMs`-be kerül.
  - Új időzítési szabály ide kerüljön, teszttel a `tests/timer.test.js`-ben.
- **`web/app.js`:** a felület (beállítás → futás → vége).
  - 200 ms-onként rajzol ki ebben a sorrendben: `stopAtTurnEnd` → `snapshot` → hang → DOM.
  - Az E2E-tesztek ezekre az elemazonosítókra épülnek: `#names`, `#total-h/m/s`, `#turn-h/m/s`, `#start`, `#current-name`, `#turn-time`, `#total-time`, `#pause`, `#stop`, `#stop-yes`/`#stop-no`, `#handover`, `#done`, `#again`, `#install-help`.
- **`web/sound.js`:** Web Audio-hangok, hangfájl nélkül. Az `unlockAudio()` az Indítás kattintásán belül fut, mert a böngészők csak felhasználói művelet után engedik a hangot.
- **`web/wakelock.js`:** ébren tartja a képernyőt menet közben.
- **`web/sw.js` + `manifest.webmanifest`:** offline működés. A gyorsítótárból azonnal válaszol, és a háttérben frissít.
  - Minden új `web/` fájlt fel kell venni az `ASSETS`-be; ezt a `tests/pwa.test.js` ellenőrzi.
  - Az URL-ek relatívak legyenek, mert a Pages a `/jatekido/` alútvonalon szolgál ki.
  - Az `app.js` `file:` protokollon (Electronban) nem regisztrál service workert, és elrejti a telepítési súgót.
- **`electron/main.cjs`:** csak az ablak, ami a `web/index.html`-t tölti be. Nincs benne logika és nincs preload. A `backgroundThrottling: false` kell, hogy háttérben is pontosan váltson és sípoljon.
- **`electron-builder.yml`:**
  - csak az `electron/`, a `web/` és a `package.json` kerül a csomagba;
  - Chromium-nyelvi fájlból csak a `hu` és az `en-US`;
  - a telepítő aláíratlan (SmartScreen-figyelmeztetés; a README leírja, mit kell tenni).

## Új verzió kiadása

1. Növeld a `package.json` `version` mezőjét és a `web/sw.js` `CACHE` értékét. Most `jatekido-v2`, a következő `jatekido-v3`. A `tests/e2e/web.spec.js` is a cache nevére hivatkozik.
2. Futtasd: `npm test` és `npm run e2e`. Utána commit és `git push`.
3. Futtasd: `npm run deploy:web`. Ellenőrzés: `curl -s https://belltate.github.io/jatekido/sw.js | grep CACHE`. A CDN akár 10 percig a régit adhatja.
4. Futtasd: `npm run dist`, utána a becsomagolt exe tesztjét.
5. Másold a setup.exe-t a munkamappába, és töröld onnan a régit.
6. Frissítsd a README-ben a fájlnevet.
7. Szólj a felhasználónak: a Google Drive-on a régi fájlnál *Verziók kezelése → Új verzió feltöltése* kell, így a megosztott link nem változik.

## Csapdák ezen a gépen

- **`ELECTRON_RUN_AS_NODE=1` van a Claude Code shelljében.** Ettől a sima `electron .` Node-ként fut. Electront csak `npm start`-tal vagy az E2E-segéddel (`tests/e2e/helpers.js`) indíts; egyszeri Playwright-szkriptben töröld az `env`-ből.
- **A `.npmrc` (`legacy-peer-deps=true`) kell.** Nélküle az npm 10.8 összeomlik a vitest 4 peer-láncán („Cannot read properties of null (reading 'edgesOut')”).
- **A Playwrightnak átadott Electron-útvonal ne végződjön `\`-re** (használj `path.resolve`-ot). Windowson `"…\"` formában idézi, és az Electron 1-es kóddal kilép.
- **A `msedge.exe --version`-t ne futtasd:** böngészőt nyit és megakad. Az Edge-et a Playwright `channel: 'msedge'` beállítással használja, letöltés nélkül.
- **GitHub CLI:** `C:\Program Files\GitHub CLI\gh.exe`, bejelentkezve Belltate-ként. Bashben előtte: `export PATH="/c/Program Files/GitHub CLI:$PATH"`.
- **Commit-szerző:** a repó szintjén `Belltate <309424174+Belltate@users.noreply.github.com>` van beállítva. Hagyd így, mert a repó nyilvános.
