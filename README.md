# Internal Case Management Tool

A small, fast, static web tool that helps internal Azure support engineers produce
**copy-ready, consistently formatted notes**. Fill in the fields, and each card builds
its output live — click **Copy** to drop rich text (bold/underline headers, tables)
straight into ICM, Outlook, or Teams.

> Help out internal SEs, hehe.

## What it generates

| Card | What it's for |
|------|----------------|
| **Title Generator** | A standardized case title: `[Service level] - [PCY] - Next contact: … - <action>` (+ optional linked ICM). |
| **Case Note** | Structured working note — Issue Description, ICM Needed, Troubleshooting Done, Communication/Timeline, Next Contact, Next Action. |
| **Risk Note** | A 12-item Y/N risk checklist. Tapping **Y** flags the row (amber); the generated table records each Y/N. |
| **SOAP Note** | Subjective / Objective (with subscription, resource, FQR/FDR/ASC fields) / Analysis / Plan. |

## Features

- **Live preview** — every card updates as you type; one click to **Copy** (rich HTML + plain-text fallback).
- **Autosave** — all fields and risk selections persist in `localStorage`, so a refresh won't lose your work. **Clear** per card resets it.
- **Paste-friendly output** — notes use inline styles and semantic blocks so spacing survives in Outlook / ICM / Teams.
- **Single source of truth** — the risk list and dropdown options live only in `script.js`; the UI is rendered from them.

## Tech

- Plain HTML + vanilla JS (no framework, no jQuery/Bootstrap).
- **Tailwind CSS v4** for styling, compiled to a self-hosted `app.css` (no runtime CSS CDN).
- **Flatpickr** for the date/time pickers (the only third-party widget), with a custom drum-roller time UI.
- Deployed as a static site via **Azure Static Web Apps**.

## Project layout

```
index.html        # markup (Tailwind utility classes)
script.js         # all logic + the single source of truth (risks, dropdowns)
src/input.css     # Tailwind source: @theme tokens, components, Flatpickr theme
app.css           # COMPILED output — committed so deploys work without a build step
package.json      # build scripts + Tailwind dev dependency
```

## Developing

Requires Node.js. Install once, then run the watcher while editing:

```bash
npm install
npm run watch      # rebuilds app.css on change
```

For a one-off production build (minified):

```bash
npm run build
```

> **Important:** after changing any HTML/JS class names or `src/input.css`, rebuild so
> `app.css` reflects your changes, and commit `app.css` along with your edits. Tailwind
> only includes classes it finds in `index.html` and `script.js`, so write full class
> names as literals (avoid string-concatenating class fragments in JS).

## Deployment

Pushing to `master` triggers the Azure Static Web Apps workflows in `.github/workflows/`.
The committed `app.css` is served as-is, so deployment needs no build step.

---

Credit: Robert Van
