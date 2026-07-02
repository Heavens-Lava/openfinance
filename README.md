# OpenFinance

**A private, local-first personal finance dashboard.** Drop in the CSV exports from your bank and get a full picture of your money — spending trends, categories, recurring subscriptions, income, and budget goals. No account, no server, no tracking: every byte of your financial data stays in your browser.

**[▶ Try it live](https://heavens-lava.github.io/openfinance/)** — click *Import Data → Load demo data* to explore with synthetic data.

## Why this exists

Every budgeting app wants you to hand over your bank credentials to a third-party aggregator. OpenFinance takes the opposite approach: you download the CSVs your bank already gives you, drop them into a static web page, and all parsing and analysis happens client-side. Close the tab and your data is still only yours.

## Features

- **Drag-and-drop CSV import** with automatic format detection — Apple Card, Chase credit card, Chase checking, Elan, and credit-union exports are recognized out of the box, and any CSV with date + amount columns falls back to a generic parser
- **Smart categorization** — merchant-keyword rules plus the bank's own category column, normalized into consistent categories
- **Dashboard** — monthly spending chart (13 months), category breakdown, income vs. spend, cash balances, clickable drill-downs into any number you see
- **Custom date ranges** — presets (this month, YTD, last 3/6 months) or pick any from/to dates
- **Recurring-charge detection** — finds subscriptions automatically (3+ near-identical charges across 3+ months) and shows the monthly and yearly cost of keeping them
- **Transactions browser** — search, filter by account/category/type, paginate, and export the filtered view back to CSV
- **Budget goals** — set monthly targets per category or merchant keyword, tracked month by month
- **Multi-account** — import as many accounts as you like; balances are read from the statements when present
- **Demo mode** — one click loads synthetic data so you can explore before importing anything

## Quick start

```bash
npm install
npm run dev
```

Open http://127.0.0.1:5173, click **Import Data**, and drop in your bank CSVs (or click **Load demo data**).

## Privacy model

- Imported CSVs are stored as text in your browser's `localStorage` — never transmitted anywhere
- The production build is fully static; there is no backend
- `.gitignore` blocks all `*.csv` files so financial data can't be committed accidentally
- Clearing site data in your browser removes everything

### Optional: auto-load your own data in dev

If you run OpenFinance locally and don't want to re-import after clearing storage, create `public/local-data/` (gitignored) with your CSVs and a `manifest.json`:

```json
{
  "files": [
    { "file": "checking.csv", "name": "My Checking", "type": "checking" },
    { "file": "card.csv", "name": "My Card", "type": "credit_card" }
  ]
}
```

Those files load automatically when the app starts with no imported data.

## Roadmap

- Editable per-transaction categories with persistent overrides
- Custom categorization rules UI (your own keyword → category mappings)
- Net-worth tracking across statements over time
- Sankey cash-flow diagram and calendar heatmap
- IndexedDB storage for very large histories
- OFX/QFX import

## Tech

React 18 + Vite, PapaParse for CSV parsing. No other runtime dependencies.

## License

MIT
