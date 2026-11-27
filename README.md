# Att göra

En liten att-göra-lista som kan öppnas i ett eget fönster och fästas i aktivitetsfältet, ungefär som Miniräknaren.

**Öppna listan:** https://fhroozt.github.io/todotest1/

Koden i det här arkivet är publik. Uppgifterna sparas bara i din egen webbläsare, på den dator där du använder sidan. De skickas inte till GitHub eller någon annan server. Någon annan som öppnar samma adress får en egen tom lista.

## Installera som app i Edge

Inga skript behövs. Det här fungerar även när PowerShell är spärrad.

1. Öppna [https://fhroozt.github.io/todotest1/](https://fhroozt.github.io/todotest1/) i Microsoft Edge.
2. Klicka på menyknappen **···** uppe till höger.
3. Välj **Appar** → **Installera den här webbplatsen som en app**.
4. Bekräfta med **Installera**. Kryssa i **Fäst i aktivitetsfältet** om rutan finns.

I adressfältet kan det också finnas en ikon som ser ut som en skärm med en nedåtpil. Den installerar samma app.

Appen öppnas i ett eget fönster, utan vanliga flikar. Första gången ber den om ett litet fönster, ungefär 440×720 pixlar, om Edge tillåter det. Därefter minns Edge den storlek du använde senast. Själva listan är ritad för den storleken.

### Fäst i aktivitetsfältet

Om du inte fäste appen redan i installationsrutan:

1. Öppna Att göra så att fönstret syns.
2. Högerklicka på ikonen i aktivitetsfältet.
3. Välj **Fäst i aktivitetsfältet**.

Du kan också öppna Start, söka efter **Att göra**, högerklicka och välja **Fäst i aktivitetsfältet**.

Nästa gång räcker det att klicka på ikonen. Listan finns kvar.

I Google Chrome: menyknappen **⋮** → **Spara och dela** → **Installera sidan som en app**, eller installationsikonen i adressfältet. Fäst ikonen på samma sätt.

Om menyvalet saknas kan organisationen ha spärrat installation av webbappar. Sidan fungerar ändå i en vanlig flik.

## Samma lista varje gång

Listan hör till den här adressen i just den webbläsare du använder.

- Edge och Chrome har var sin lista.
- Uppgifterna finns kvar när du stänger fönstret, tills du rensar webbplatsdata för sidan.
- Den publicerade sidan och en lokal start via `http://127.0.0.1:8742` är två olika listor.

## Vad du kan göra

- Lägga till en uppgift
- Markera som klar, eller ångra
- Redigera genom att dubbelklicka på texten, eller med pennknappen
- Ta bort en uppgift
- Filtrera mellan Alla, Aktiva och Klara
- Rensa klara uppgifter
- Se hur många som är kvar

Utseendet följer ljust eller mörkt läge i Windows.

## Tangenter

- Tab flyttar mellan fält och knappar
- Enter lägger till en uppgift, eller sparar när du redigerar
- Esc avbryter redigeringen

## Lokalt på den här datorn

Den publicerade adressen ovan är vägen utan skript. Om skript får köras kan du i stället dubbelklicka på **Att göra.vbs**. Då startar en liten hjälpare och ett fönster mot `http://127.0.0.1:8742`. Första gången skapas en genväg som heter **Att göra** på skrivbordet och i Start-menyn. Dra den till aktivitetsfältet om du vill.

Edge används om det finns, annars Chrome. Om inget händer, se `start-log.txt` i samma mapp.

## Filer

- `index.html`, `styles.css`, `app.js` — själva listan
- `manifest.webmanifest`, `sw.js`, ikonerna — så att sidan kan installeras som app
- `Att göra.vbs`, `start.ps1`, `server.ps1` — valfri lokal start
