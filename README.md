# Játékidő Elosztó

Időzítő, ami körbeforgatja a neveket. Megadsz néhány nevet, egy teljes időt (például 3 óra) és egy váltási időt (például 20 perc). Indítás után:

- kicsiben látszik, mennyi van hátra a teljes időből;
- nagyban látszik, ki van soron, és mennyi van még hátra a köréből;
- amikor a kör letelik, sípol, és egy átlátszó fátyol jelenik meg: **„Kattints a képernyőre”**. Alatta már a következő név látszik (a lista végén újra az első). Az ő ideje és a teljes idő is csak kattintásra (gépen Enterre vagy szóközre) indul, így az átadás senkinek az idejéből nem megy el;
- amikor a teljes idő is letelik, kiírja: **Letelt az idő!**

Gombok:

- **Szünet / Folytatás:** mindkét időzítőt megállítja, és onnan folytatja.
- **Leállítás:** megerősítés után visszavisz a beállításokhoz.

## Telepítés

**Windows:** a `Jatekido-Eloszto-Setup-1.1.0.exe` telepítővel (Next → Install). A régebbi verzióra rá lehet telepíteni.

- Mivel a program nincs digitálisan aláírva, letöltés után a Windows figyelmeztethet („A Windows megvédte a számítógépet”): **További információ → Futtatás mindenképp**.
- A Google Drive azt írhatja, hogy a fájl túl nagy a vírusellenőrzéshez: **Letöltés mindenképp**.

**Telefon (Android, iPhone) vagy bármilyen gép böngészővel:** https://belltate.github.io/jatekido/. Azonnal használható, és telepíthető is:

- Android (Chrome): ⋮ menü → *Alkalmazás telepítése* vagy *Hozzáadás a kezdőképernyőhöz*
- iPhone, iPad (Safari): Megosztás → *Főképernyőhöz adás*

Telepítés után internet nélkül is működik. Menet közben a kijelző ébren marad. Ha mégis lezárod a telefont, a váltás hangja csak a feloldás után szól.

## Megosztás másokkal

**Windowsra:**

1. Töltsd fel a setup.exe-t a Google Drive-ra.
2. Jobb klikk → *Megosztás* → *Bárki, aki rendelkezik a linkkel* → *Link másolása*.
3. Ezt a linket küldd el.

E-mail-mellékletként nem megy (a Gmail tiltja az .exe-t), Discordon és Messengeren pedig túl nagy.

**Telefonra:** küldd el a fenti github.io linket.

## Fejlesztés

Kell hozzá: Node.js 20 (a gépen megvan) és egyszer egy `npm install`. Az `.npmrc` bekapcsolja a `legacy-peer-deps`-et: nélküle az npm 10.8 összeomlik a vitest függőségein.

| Parancs | Mit csinál |
|---|---|
| `npm start` | A Windows-program indítása fejlesztés közben |
| `npm test` | Egységtesztek: időzítő-logika, kiírás, ikonok, a telefonos app fájljai (pár másodperc) |
| `npm run e2e` | Füsttesztek a valódi Windows-ablakon és telefonméretű Edge-ben (kb. fél perc, közben ablakok nyílnak) |
| `npm run web` | A telefonos app helyben: http://127.0.0.1:8080 |
| `npm run icons` | Az ikonok újrarajzolása (`tools/gen-icons.mjs`) |
| `npm run dist` | Windows-telepítő a `release/` mappába |
| `npm run deploy:web` | A `web/` mappa feltöltése a GitHub Pagesre |

A becsomagolt program tesztje PowerShellben:

```
$env:JATEKIDO_EXE='release\win-unpacked\Jatekido.exe'; npx playwright test --project electron
```

### Szerkezet

```
web/               maga a program (HTML, CSS, JS): ezt tölti be a Windows-program, és ez a telefonos app is
  timer.js         a teljes időzítő-logika tiszta függvényekben (tesztelve)
  format.js        az idő kiírása (ó:pp:mm)
  app.js           a felület: képernyők, gombok, kirajzolás
  sound.js         hangjelzések Web Audióval, hangfájl nélkül
  wakelock.js      a kijelző ébren tartása menet közben
  sw.js, manifest.webmanifest, icons/   offline működés és telepíthetőség
electron/main.cjs  a Windows-program ablaka
tools/             indító, helyi webszerver, ikonrajzoló
tests/             egységtesztek (Vitest) és füsttesztek (Playwright)
```

Az idő mindig az óra szerinti időpontok különbségéből számolódik, nem visszaszámláló számlálóból. Ezért nem csúszik el, és háttérbe tett ablak vagy lezárt telefon után is pontos.

## Új verzió kiadása

1. Növeld a `package.json` `version` mezőjét (pl. `1.0.1`) és a `web/sw.js` `CACHE` értékét (pl. `jatekido-v2`).
2. Futtasd: `npm test` és `npm run e2e`.
3. Windows: `npm run dist`. A Drive-on a régi fájlon jobb klikk → *Fájladatok* → *Verziók kezelése* → *Új verzió feltöltése*. Így a megosztott link nem változik.
4. Telefon: commit, `git push`, majd `npm run deploy:web`. Pár perc múlva frissül, a telepített appok pedig a következő megnyitáskor töltik le az új verziót.
