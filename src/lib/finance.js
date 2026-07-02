import Papa from 'papaparse';

// Account colors are assigned in import order.
export const PALETTE = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#06b6d4', '#14b8a6', '#ec4899', '#ef4444', '#22c55e', '#a855f7'];

export const CAT_COLORS = {
  'Food & Dining': '#f97316',
  'Gas & Transport': '#06b6d4',
  Groceries: '#22c55e',
  Shopping: '#a855f7',
  'Bills & Utilities': '#ef4444',
  Entertainment: '#ec4899',
  Health: '#14b8a6',
  Education: '#3b82f6',
  Investments: '#7c3aed',
  AI: '#0ea5e9',
  'Cash Withdrawals': '#ef4444',
  Income: '#10b981',
  'Payment/Transfer': '#6b7280',
  Auto: '#f59e0b',
  Other: '#94a3b8',
};

export const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const KEYWORD_CATS = [
  [['payroll', 'direct deposit', 'direct dep', 'adp', 'paychex', 'salary', 'gusto'], 'Income'],
  [['charles schwab', 'schwab invest', 'fidelity invest', 'vanguard buy', 'robinhood', 'e*trade', 'etrade'], 'Investments'],
  [['anthropic', 'claude.ai', 'openai', 'chatgpt', 'deepseek', 'midjourney', 'perplexity', 'runway', 'elevenlabs'], 'AI'],
  [['zelle', 'venmo', 'cash app', 'paypal transfer', 'credit card payment', 'online banking transfer', 'internet payment', 'realtime transfer', 'payment thank you', 'autopay payment', 'bill payment', 'online transfer', 'mobile payment', 'loan pmt', 'web pymt'], 'Payment/Transfer'],
  [['restaurant', 'eatery', 'cafe', 'coffee', 'grill', 'kitchen', 'bistro', 'pizzeria', 'taqueria', 'sushi', 'ramen', 'bbq', 'burger', 'taco', 'mcdonald', 'wendy', 'subway', 'pizza', 'chipotle', 'starbucks', 'kfc', 'popeyes', 'chick-fil', 'sonic', 'panda express', 'doordash', 'uber eats', 'grubhub', 'dunkin', 'panera', 'wingstop'], 'Food & Dining'],
  [['quiktrip', 'circle k', 'chevron', 'shell ', 'arco ', 'exxon', 'valero', 'bp ', 'sunoco', 'maverick', 'speedway', 'gas station', 'fuel stop'], 'Gas & Transport'],
  [['parking', 'uber', 'lyft', 'taxi', 'bus pass', 'transit', 'toll ', 'amtrak', 'greyhound', 'airline'], 'Gas & Transport'],
  [['7-eleven', 'walmart', 'wal-mart', 'target ', 'costco', 'sams club', 'whole foods', 'safeway', 'kroger', 'sprouts', 'albertsons', 'trader joe', 'aldi ', 'grocery', 'supermarket'], 'Groceries'],
  [['cengage', 'mcgraw', 'pearson', 'chegg', 'college', 'university', 'tuition', 'udemy', 'coursera'], 'Education'],
  [['bowling', 'arcade', 'museum', 'theater', 'netflix', 'spotify', 'hulu', 'disney', 'youtube premium', 'xbox', 'playstation', 'steam ', 'movie', 'gamestop', 'nintendo'], 'Entertainment'],
  [['aliexpress', 'temu ', 'shein', 'amazon', 'ebay', 'etsy', 'best buy', 'home depot', 'lowes ', 'ikea', 'tj maxx', 'ross stores', 'dollar tree', 'five below'], 'Shopping'],
  [['atm withdrawal', 'cash withdrawal'], 'Cash Withdrawals'],
  [['at&t', 'verizon', 't-mobile', 'tmobile', 'xfinity', 'cox ', 'spectrum', 'mortgage', 'github', 'google one', 'icloud', 'rent pmt', 'rent payment', 'electric', 'utility', 'insurance'], 'Bills & Utilities'],
  [['cvs ', 'walgreens', 'rite aid', 'pharmacy', 'clinic', 'doctor', 'hospital', 'urgent care', 'dental', 'vision', 'medical'], 'Health'],
  [['jiffy lube', 'oil change', 'auto zone', 'oreilly', 'car wash', 'valvoline', 'discount tire', 'firestone'], 'Auto'],
];

export function parseDate(str) {
  if (!str) return null;
  const clean = String(str).trim().replace(/^"|"$/g, '');
  if (/^\d{4}-\d{2}-\d{2}/.test(clean)) return new Date(`${clean.slice(0, 10)}T12:00:00`);
  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(clean)) {
    const [m, d, y] = clean.split('/');
    return new Date(`${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}T12:00:00`);
  }
  return null;
}

export function parseAmt(str) {
  if (str === null || str === undefined || str === '') return 0;
  return parseFloat(String(str).replace(/[$, ]/g, '')) || 0;
}

export function dollar(n) {
  return `$${Math.abs(n || 0).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
}

export function fmtDate(d) {
  if (!d) return '';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function guessCategory(text) {
  const low = String(text || '').toLowerCase();
  for (const [keywords, category] of KEYWORD_CATS) {
    if (keywords.some((keyword) => low.includes(keyword))) return category;
  }
  return 'Other';
}

export function normalizeCategory(raw) {
  const r = String(raw || '').toLowerCase().trim();
  if (!r) return 'Other';
  if (r.includes('food') || r.includes('dining') || r.includes('restaurant') || r === 'drink') return 'Food & Dining';
  if (r.includes('gas') || r.includes('fuel') || r.includes('transport') || r.includes('parking')) return 'Gas & Transport';
  if (r.includes('groceri') || r.includes('supermarket')) return 'Groceries';
  if (r.includes('educ') || r.includes('tuition') || r.includes('school')) return 'Education';
  if (r.includes('shop') || r.includes('merchandise') || r === 'personal') return 'Shopping';
  if (r.includes('bill') || r.includes('utilit') || r.includes('subscription') || r.includes('rent') || r.includes('insurance')) return 'Bills & Utilities';
  if (r.includes('atm') || r.includes('cash withdrawal')) return 'Cash Withdrawals';
  if (r.includes('health') || r.includes('medical') || r.includes('pharmacy')) return 'Health';
  if (r.includes('entertain') || r.includes('movie') || r.includes('gaming')) return 'Entertainment';
  if (r.includes('invest')) return 'Investments';
  if (r.includes('income') || r.includes('payroll') || r.includes('salary')) return 'Income';
  if (r.includes('payment') || r.includes('transfer')) return 'Payment/Transfer';
  if (r === 'auto') return 'Auto';
  return raw || 'Other';
}

// Balance from the most recent dated row — export order (newest-first vs
// oldest-first) varies by bank and download settings, so don't trust row 0.
function latestBalanceRow(rows, dateField) {
  let best = null, bestDate = 0;
  for (const r of rows) {
    if (!r.Balance || parseAmt(r.Balance) === 0) continue;
    const d = parseDate(r[dateField])?.getTime() || 0;
    if (d > bestDate) { bestDate = d; best = r; }
  }
  return best;
}

export function detectFormat(headers) {
  const h = headers.map((s) => s.toLowerCase().replace(/[^a-z0-9]/g, ' ').trim());
  if (h.some((s) => s.includes('merchant')) && h.some((s) => s.includes('clearing'))) return 'apple';
  if (h.some((s) => s.includes('transaction id')) && h.some((s) => s.includes('transaction category'))) return 'credit-union';
  if (h.some((s) => s.includes('post date')) && h.some((s) => s.includes('category'))) return 'chase-cc';
  if (h.some((s) => s.includes('posting date')) || h.some((s) => s.includes('check or slip'))) return 'chase-checking';
  if (h.some((s) => s === 'name') && h.some((s) => s === 'memo')) return 'elan';
  if (h.some((s) => s.includes('date')) && h.some((s) => s.includes('amount'))) return 'generic';
  return 'unknown';
}

export const FORMAT_LABELS = {
  apple: 'Apple Card',
  'credit-union': 'Credit union',
  'chase-cc': 'Chase credit card',
  'chase-checking': 'Chase checking',
  elan: 'Elan credit card',
  generic: 'Generic CSV',
  unknown: 'Unrecognized',
};

const CU_CAT_MAP = {
  'paychecks/salary': 'Income',
  payroll: 'Income',
  deposits: 'Income',
  transfers: 'Payment/Transfer',
  'credit card payments': 'Payment/Transfer',
  'restaurants/dining': 'Food & Dining',
  groceries: 'Groceries',
  'gas/automotive': 'Gas & Transport',
  'automotive expenses': 'Auto',
  utilities: 'Bills & Utilities',
  rent: 'Bills & Utilities',
  'online services': 'Bills & Utilities',
  insurance: 'Bills & Utilities',
  fees: 'Bills & Utilities',
  'atm/cash withdrawals': 'Cash Withdrawals',
  'atm/cash': 'Cash Withdrawals',
  'healthcare/medical': 'Health',
  entertainment: 'Entertainment',
  education: 'Education',
  shopping: 'Shopping',
};

function makeTx(date, merchant, rawCat, amount, account, meta = {}) {
  let type = 'expense';
  if (rawCat === 'Income') type = 'income';
  else if (rawCat === 'Payment/Transfer') type = 'payment';
  else if (rawCat === 'Investments') type = 'investment';
  else if (amount > 0 && account.type !== 'checking' && account.type !== 'savings') type = 'payment';
  else if (amount > 0 && (account.type === 'checking' || account.type === 'savings')) type = 'income';
  return {
    id: `${account.id}-${date?.getTime() || 0}-${merchant}-${amount}`,
    date,
    merchant,
    category: rawCat,
    amount,
    type,
    account: account.id,
    accountName: account.name,
    accountColor: account.color,
    rawCategory: meta.rawCategory || '',
    sourceType: meta.sourceType || '',
  };
}

function parseRows(rows, account, balances) {
  if (!rows.length) return [];
  const format = account.format;
  if (format === 'apple') {
    return rows.filter((r) => r['Transaction Date']).map((r) => {
      const raw = parseAmt(r['Amount (USD)']);
      const amount = String(r.Type || '').toLowerCase() === 'purchase' ? -Math.abs(raw) : Math.abs(raw);
      const merchant = r.Merchant || r.Description || '';
      const guessed = guessCategory(merchant);
      return makeTx(parseDate(r['Transaction Date']), merchant, guessed !== 'Other' ? guessed : normalizeCategory(r.Category), amount, account);
    });
  }
  if (format === 'chase-cc') {
    return rows.filter((r) => r['Transaction Date']).map((r) => {
      const merchant = r.Description || '';
      const guessed = guessCategory(merchant);
      return makeTx(parseDate(r['Transaction Date']), merchant, guessed !== 'Other' ? guessed : normalizeCategory(r.Category), parseAmt(r.Amount), account);
    });
  }
  if (format === 'chase-checking') {
    const balRow = latestBalanceRow(rows, 'Posting Date');
    if (balRow) balances[account.id] = parseAmt(balRow.Balance);
    return rows.filter((r) => r['Posting Date']).map((r) => {
      const merchant = r.Description || '';
      return makeTx(parseDate(r['Posting Date']), merchant, guessCategory(merchant), parseAmt(r.Amount), account, { sourceType: r.Type || '' });
    });
  }
  if (format === 'elan') {
    return rows.filter((r) => r.Date).map((r) => makeTx(parseDate(r.Date), r.Name || '', guessCategory(r.Name || ''), parseAmt(r.Amount), account));
  }
  if (format === 'credit-union') {
    const validRows = rows.filter((r) => r['Posting Date']);
    const balRow = latestBalanceRow(validRows, 'Posting Date');
    if (balRow) balances[account.id] = parseAmt(balRow.Balance);
    return validRows.map((r) => {
      const desc = r.Description || '';
      const rawCat = String(r['Transaction Category'] || '').toLowerCase().trim();
      return makeTx(parseDate(r['Posting Date']), desc, CU_CAT_MAP[rawCat] || guessCategory(desc), parseAmt(r.Amount), account, { rawCategory: r['Transaction Category'] || '', sourceType: r.Type || '' });
    });
  }
  if (format === 'generic') {
    const keys = Object.keys(rows[0]);
    const find = (...cands) => keys.find((k) => cands.some((c) => k.toLowerCase().includes(c)));
    const dateK = find('date');
    const amtK = find('amount');
    const descK = find('description', 'payee', 'merchant', 'name', 'memo', 'details') || keys[1];
    const catK = find('category');
    const balK = find('balance');
    if (balK) {
      const balRow = latestBalanceRow(rows.map((r) => ({ ...r, Balance: r[balK] })), dateK);
      if (balRow) balances[account.id] = parseAmt(balRow.Balance);
    }
    return rows.filter((r) => r[dateK]).map((r) => {
      const merchant = r[descK] || '';
      const guessed = guessCategory(merchant);
      const cat = guessed !== 'Other' ? guessed : catK ? normalizeCategory(r[catK]) : 'Other';
      return makeTx(parseDate(r[dateK]), merchant, cat, parseAmt(r[amtK]), account);
    });
  }
  return [];
}

// Guess an account type from format + filename so income/payments classify sensibly.
function guessAccountType(format, fileName) {
  const n = fileName.toLowerCase();
  if (n.includes('savings')) return 'savings';
  if (n.includes('checking') || n.includes('debit')) return 'checking';
  if (['apple', 'chase-cc', 'elan'].includes(format)) return 'credit_card';
  if (format === 'chase-checking') return 'checking';
  if (n.includes('card') || n.includes('credit') || n.includes('visa') || n.includes('amex')) return 'credit_card';
  return 'checking';
}

function cleanName(fileName) {
  return fileName.replace(/\.csv$/i, '').replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 40) || 'Account';
}

// files: [{ id, name, text }] -> { transactions, balances, accounts }
export function parseAll(files) {
  const balances = {};
  const accounts = [];
  const all = [];
  files.forEach((file, i) => {
    const parsed = Papa.parse(file.text, { header: true, skipEmptyLines: true });
    const rows = parsed.data;
    const format = rows.length ? detectFormat(Object.keys(rows[0])) : 'unknown';
    const account = {
      id: file.id,
      name: file.accountName || cleanName(file.name),
      type: file.accountType || guessAccountType(format, file.name),
      bank: FORMAT_LABELS[format],
      color: PALETTE[i % PALETTE.length],
      format,
    };
    accounts.push(account);
    all.push(...parseRows(rows, account, balances));
  });
  const transactions = all.filter((t) => t.date).sort((a, b) => b.date - a.date);
  // Identical same-day purchases (same account/merchant/amount) collide on id;
  // suffix repeats so React keys stay unique and rent overrides target one row.
  const seen = new Map();
  for (const t of transactions) {
    const n = seen.get(t.id) || 0;
    seen.set(t.id, n + 1);
    if (n > 0) t.id = `${t.id}-${n + 1}`;
  }
  return { transactions, balances, accounts };
}

// Optional dev convenience: put CSVs in public/local-data/ (gitignored) plus a
// manifest.json listing them, and they load automatically — no browser import.
// manifest.json: { "files": [{ "file": "checking.csv", "name": "My Checking", "type": "checking" }] }
export async function loadLocalManifest() {
  try {
    const res = await fetch('/local-data/manifest.json');
    if (!res.ok) return null;
    const manifest = await res.json();
    if (!Array.isArray(manifest.files) || !manifest.files.length) return null;
    const files = await Promise.all(manifest.files.map(async (entry, i) => {
      const r = await fetch(`/local-data/${entry.file}`);
      if (!r.ok) return null;
      return { id: `local-${i}-${entry.file}`, name: entry.file, accountName: entry.name, accountType: entry.type, text: await r.text(), local: true };
    }));
    return files.filter(Boolean);
  } catch {
    return null;
  }
}

export function getDateRange(filter) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
  // custom:YYYY-MM-DD:YYYY-MM-DD — user-picked range; either side may be blank.
  if (filter.startsWith('custom:')) {
    const [, s, e] = filter.split(':');
    return [s ? new Date(`${s}T00:00:00`) : new Date(1970, 0, 1), e ? new Date(`${e}T23:59:59`) : today];
  }
  if (/^\d{4}-\d{2}$/.test(filter)) {
    const year = parseInt(filter.slice(0, 4), 10);
    const month = parseInt(filter.slice(5, 7), 10) - 1;
    return [new Date(year, month, 1), new Date(year, month + 1, 0, 23, 59, 59)];
  }
  if (/^\d{4}$/.test(filter)) {
    const year = parseInt(filter, 10);
    return [new Date(year, 0, 1), new Date(year, 11, 31, 23, 59, 59)];
  }
  if (filter === 'this-month') return [new Date(now.getFullYear(), now.getMonth(), 1), today];
  if (filter === 'last-month') return [new Date(now.getFullYear(), now.getMonth() - 1, 1), new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59)];
  if (filter === 'last-3') return [new Date(now.getFullYear(), now.getMonth() - 3, 1), today];
  if (filter === 'last-6') return [new Date(now.getFullYear(), now.getMonth() - 6, 1), today];
  if (filter === 'ytd') return [new Date(now.getFullYear(), 0, 1), today];
  return [null, null];
}

export function filterByDate(transactions, filter) {
  const [start, end] = getDateRange(filter);
  if (!start) return transactions;
  return transactions.filter((t) => t.date && t.date >= start && t.date <= end);
}

export const expenses = (transactions) => transactions.filter((t) => t.type === 'expense');
export const income = (transactions) => transactions.filter((t) => t.type === 'income');
