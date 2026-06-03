# Internal Case Management Tool

Writing case notes is the part of support that nobody misses when it's done well and
everybody notices when it's not. This little tool takes the fiddly bits - the formatting,
the consistent titles, the "did I tick every risk box?" - off your plate.

Fill in the fields, watch each card assemble itself live, hit **Copy**, and paste
rich, tidy text straight into ICM, Outlook, or Teams. Bold headers, underlines, a real
table for the risk matrix - all of it survives the paste.

No login, no backend, nothing to install. It's a single page that runs in your browser
and quietly remembers your work as you type.

> Built to make internal SEs' lives a little easier. 🙂

## The four cards

| Card | What it gives you |
|------|-------------------|
| **Title Generator** | A standardized case title - `[Service level] - [PCY] - Next contact: <date> - <action>`, plus an optional linked ICM. Pick from dropdowns, choose a date, done. |
| **Case Note** | A structured working note: Issue Description, ICM Needed, Troubleshooting Done, Communication / Timeline, Next Contact, Next Action. |
| **Risk Note** | A 12-point Y/N risk checklist. Tap **Y** and the whole row lights up amber; the generated table records every answer. |
| **SOAP Note** | The full Subjective / Objective / Analysis / Plan layout, with the Azure-specific fields baked in - subscription & resource IDs, a date+time "timeframe", and the FQR / FDR / ASC checks. |

## Why it's nice to use

- **It writes as you type.** Every card shows a live preview; one click copies it as rich
  HTML *and* plain text, so it lands cleanly wherever you paste.
- **It won't lose your work.** Everything autosaves to `localStorage` - refresh, crash,
  or close the tab and it's all still there. Each card has its own **Clear** when you want
  a fresh start.
- **It catches typos before ICM does.** Paste a Subscription ID or Resource ID and it
  quietly checks the shape (GUID / `/subscriptions/...`) and flags it if something's off.
- **The SOAP timeframe is one clean popover** - a calendar next to a scrollable list of
  times, the way Google Calendar and Calendly do it. Pick a day, pick a time, move on.
- **Paste survives the trip.** Notes use inline styles and real table markup, so spacing
  and formatting hold up in Outlook / ICM / Teams instead of collapsing into a wall of text.
- **One source of truth.** The risk list and dropdown options live in exactly one place
  (`script.js`); the UI is generated from them, so adding a risk or a PCY is a one-line edit.

## Under the hood

- **Plain HTML + vanilla JS.** No framework, no jQuery, no bundler. You can open the page
  and read every line of what it does.
- **Tailwind CSS v4**, compiled to a committed `app.css` - no runtime CSS CDN.
- **[Air Datepicker](https://air-datepicker.com/)** for the calendars, **self-hosted in
  `vendor/`** so it keeps working on locked-down corporate networks that block public CDNs.
- Shipped as a static site on **Azure Static Web Apps**.

## Project layout

```
index.html        # markup (Tailwind utility classes)
script.js         # all the logic + the single source of truth (risks, dropdowns)
src/input.css     # Tailwind source: @theme tokens, components, picker theming
app.css           # COMPILED output - committed so deploys need no build step
vendor/           # self-hosted Air Datepicker (JS + CSS) - no runtime CDN
package.json      # build scripts + dependencies
```

## Hacking on it

You only need Node.js to rebuild the CSS - the page itself is just static files.

```bash
npm install
npm run watch      # rebuild app.css whenever you edit styles or classes
```

For a one-off minified build:

```bash
npm run build
```

> **Don't forget to rebuild.** Tailwind only ships the classes it can *see* in
> `index.html` and `script.js`, so after touching any class names or `src/input.css`,
> run a build and commit the regenerated `app.css` alongside your change. (And write full
> class names as literals - don't string-concatenate class fragments in JS, or Tailwind
> won't find them.)

## Shipping it

Push to `master` and the Azure Static Web Apps workflows in `.github/workflows/` take it
from there. The committed `app.css` and the self-hosted `vendor/` files are served as-is,
so there's no build step in the pipeline.

---

Credit: Robert Van
