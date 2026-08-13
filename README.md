# Internal Case Management Tool

A browser-based workspace for creating consistent Azure support case titles, case notes, risk reviews, and SOAP notes. The application is designed for support engineers who need structured, paste-ready documentation without sending case data to a backend service.

**Live site:** [azureinternalcmt.com](https://azureinternalcmt.com/)

## Features

- **Title Generator** — Builds standardized internal case titles from the date, action, communication type, support tier, PCY, and optional context.
- **Case Note** — Organizes the issue description, troubleshooting, communication timeline, next contact, and next action.
- **Risk Note** — Provides a 12-point Y/N risk review and generates a formatted table for case documentation.
- **SOAP Note** — Produces Subjective, Objective, Assessment, and Plan notes with optional Azure environment, service-check, and communication details.
- **Paste-ready output** — Copies both rich HTML and plain text for use in ICM, Outlook, and Microsoft Teams.
- **Light and dark themes** — Supports both display modes without changing the note content.
- **Private by design** — Runs entirely in the browser. Local draft saving is optional and must be enabled by the user.
- **Draft portability** — Imports and exports local drafts as JSON files.

## Technology

The project uses plain HTML and JavaScript with Tailwind CSS v4. Air Datepicker is self-hosted under `vendor/`, allowing the site to work in restricted environments without a runtime CDN dependency. Deployment is handled by Azure Static Web Apps through GitHub Actions.

## Local development

Install dependencies and build the stylesheet:

```bash
npm install
npm run build
```

Run the automated checks:

```bash
npm test
```

For stylesheet development with automatic rebuilds:

```bash
npm run watch
```

The compiled `app.css` file is committed to the repository and should be rebuilt whenever `src/input.css` or relevant class names change.

## Project structure

```text
index.html                 Application structure and forms
script.js                  Note generators, validation, and shared data
workspace.js               Workspace navigation, drafts, and preferences
src/input.css              Tailwind source and component styling
app.css                    Compiled production stylesheet
staticwebapp.config.json   Azure Static Web Apps configuration
tests/                     Automated site checks
vendor/                    Self-hosted browser dependencies
```

## Deployment

Changes merged into `master` are built and deployed by the Azure Static Web Apps workflow. Pull requests receive an isolated Azure preview environment for validation before release.

## Author

Created and maintained by **Robert Van**.
