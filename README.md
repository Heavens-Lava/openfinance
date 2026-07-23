# OpenFinance

A free, private desktop finance tracker. Drop your bank CSV exports in — everything stays in your browser. No account connection, no server, no tracking.

**[Open the app →](https://finance.jeffreymacy.com)**

No install, no clone, no npm. Open the link in any browser (phone or desktop) and start uploading CSVs. Your browser will also offer to "Install" it as an app icon on your home screen/desktop — that's optional, the website works the same either way.

**Prefer a Windows desktop app?** Grab the installer from [Releases →](https://github.com/Heavens-Lava/openfinance/releases/latest) — download `OpenFinance Setup x.x.x.exe`, run it, done. It's the same app, just packaged as a standalone `.exe` with Electron. Since it isn't code-signed, Windows SmartScreen may warn "Unknown publisher" the first time you run it — click **More info → Run anyway**.

![OpenFinance dashboard](https://user-images.githubusercontent.com/placeholder/screenshot.png)

## Features

- **Dashboard** — monthly spending bars, category breakdown, daily heatmap, stat cards
- **Transactions** — search, filter by account/category/type, inline category editing
- **Categories** — visual grid with spend totals, click to drill into transactions
- **Cash Flow** — interactive Sankey diagram showing where money goes
- **Net Worth** — month-end balance history from statement exports
- **Recurring** — auto-detects subscriptions from 3+ months of similar charges
- **Income & Savings** — monthly breakdown table with YTD stats and savings rate
- **Goals** — monthly spend targets with progress bars, editable in-browser
- **Custom Rules** — keyword → category rules that persist in localStorage
- **Affordability** — housing/mortgage payment calculator

## Supported Banks

| Bank | How to export |
|---|---|
| **Chase** | Account → Download Account Activity → CSV |
| **Apple Card** | Wallet app → Apple Card → ··· → Download Statements → CSV |
| **Desert Financial** | Online Banking → Account History → Export → CSV |
| **Elan / First National** | Account History → Export → CSV |
| **Any bank** | Any CSV with Date, Amount, and Description columns |

You can upload multiple files at once — the app auto-detects each bank's format.

## Privacy

- **Zero server contact.** All CSV parsing runs in your browser tab.
- **No account linking.** You download the export yourself; the app never touches your bank.
- **No tracking.** No analytics, no cookies, no third-party scripts.
- Goals and custom rules are saved in `localStorage` (this browser only).
- Refreshing the tab clears your uploaded data — upload again next session.

## Run Locally

```bash
git clone https://github.com/Heavens-Lava/openfinance
cd openfinance
npm install
npm run dev
```

Open `http://localhost:5173` and drop in your CSV files.

## Desktop App (Electron)

Test the packaged app locally without building a full installer:

```bash
npm run build:app   # builds the web app with relative paths for file:// loading
npm run electron    # opens it in an Electron window
```

Build the actual Windows installer:

```bash
npm run dist:win
```

This outputs `release/OpenFinance Setup x.x.x.exe`. A `release/win-unpacked/` folder is also produced — you can run `OpenFinance.exe` directly from there for a quick smoke test without installing anything.

**Cutting a public release:** push a tag matching `v*.*.*` (e.g. `git tag v1.1.0 && git push origin v1.1.0`). The `release.yml` workflow builds the installer on `windows-latest` and publishes it to the repo's [Releases](https://github.com/Heavens-Lava/openfinance/releases) page automatically.

## Deploy Your Own Copy

1. Fork this repo
2. Go to **Settings → Pages** and set Source to **GitHub Actions**
3. Push any commit — the included workflow builds and deploys automatically

Your live URL will be `https://<your-username>.github.io/openfinance/`.

## Stack

- [React 18](https://react.dev/) + [Vite](https://vitejs.dev/)
- [PapaParse](https://www.papaparse.com/) for CSV parsing
- Pure CSS — no UI framework, no Tailwind
- Zero external API calls at runtime
