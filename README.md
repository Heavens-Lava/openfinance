# OpenFinance

A free, private desktop finance tracker. Drop your bank CSV exports in — everything stays in your browser. No account connection, no server, no tracking.

**[Live demo →](https://heavens-lava.github.io/openfinance/)**

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
