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
| **Bank of America** | Account → Download Transactions → CSV |
| **Wells Fargo** | Account Activity → Download Account Activity → CSV |
| **Capital One** | Account → Transactions → Download → CSV |
| **Citi** | Account Details → Download Transactions → CSV |
| **American Express** | Statements & Activity → Download → Comma Delimited (CSV) |
| **Discover** | Account Details → Statements → Download Transactions → CSV |
| **Desert Financial** | Online Banking → Account History → Export → CSV |
| **Elan / First National** | Account History → Export → CSV |
| **Any bank or credit union** | Any CSV with Date, Amount, and Description columns |

You can upload multiple files at once — the app auto-detects each bank's format, and
falls back to a generic parser for any CSV with recognizable date/amount/description
columns (including separate Debit/Credit columns), so it isn't limited to the banks
listed above.

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

### OpenFinance + MacyFinance from one codebase

This repository produces two deployments:

| Deployment | Data model | Authentication |
| --- | --- | --- |
| `openfinance.jeffreymacy.com` | Browser-only IndexedDB/localStorage | None |
| `macyfinance.jeffreymacy.com` | Private Supabase Storage | Supabase email/password |

OpenFinance is deliberately local-only. Its build does not create a Supabase
client or make cloud data requests. MacyFinance uses the same UI and finance
logic, but loads and saves its CSV imports in a private, user-scoped Storage
bucket. The login page only asks for a password; the single account email is a
deployment variable.

The GitHub Actions workflow deploys both variants from this repository.
OpenFinance uses this repository's GitHub Pages site. MacyFinance is built from
the same commit and published to the `gh-pages` branch of the private
`Heavens-Lava/macyfinance` repository, which is only a deployment target—not a
second application codebase. The OpenFinance repository has these Actions
variables/secrets:

```text
VITE_APP_VARIANT=macyfinance
VITE_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=your-public-anon-key
VITE_MACY_LOGIN_EMAIL=your-supabase-user@example.com
```

Setup:

1. In Supabase Authentication, create the one MacyFinance email/password user
   and disable public sign-ups.
2. Apply [`supabase/migrations/20260729000000_macyfinance_private_storage.sql`](supabase/migrations/20260729000000_macyfinance_private_storage.sql) in the Supabase
   SQL editor. It creates a private bucket and RLS policies that only allow a
   signed-in user to access files beneath their own user ID.
3. Configure the MacyFinance Pages site to publish from `gh-pages`, then point
   the Namecheap `macyfinance` CNAME to `heavens-lava.github.io`.
4. Sign in, import the current CSV files once, and they will then be available
   from every signed-in device.

The Supabase anon key is safe to expose in a browser build because it grants no
file access by itself; authentication plus the bucket RLS policies enforce
access. Never place a Supabase service-role key in a `VITE_` variable.

For a local MacyFinance build, copy `.env.example` to `.env.local`, fill in the
MacyFinance values, and run `npm run dev`. Do not commit `.env.local`.

## Stack

- [React 18](https://react.dev/) + [Vite](https://vitejs.dev/)
- [PapaParse](https://www.papaparse.com/) for CSV parsing
- Pure CSS — no UI framework, no Tailwind
- Zero external API calls at runtime
