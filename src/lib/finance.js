import Papa from 'papaparse';

// Populated dynamically from uploaded files — starts empty
export let ACCOUNTS = [];

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
  'Cash Withdrawals': '#f59e0b',
  Income: '#10b981',
  'Payment/Transfer': '#6b7280',
  Auto: '#f59e0b',
  Other: '#94a3b8',
};

export const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const ACCOUNT_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#06b6d4', '#14b8a6', '#ef4444', '#ec4899', '#f97316', '#a855f7'];

const KEYWORD_CATS = [
  [['payroll', 'direct deposit', 'adp', 'paychex', 'salary', 'stripe transfer'], 'Income'],
  [['charles schwab', 'schwab invest', 'vanguard', 'fidelity invest'], 'Investments'],
  [['anthropic', 'claude.ai', 'openai', 'chatgpt', 'midjourney', 'perplexity', 'runway', 'elevenlabs', 'deepseek', 'tripo'], 'AI'],
  [['zelle', 'venmo', 'cash app', 'paypal transfer', 'applecard gsbank', 'payment to chase', 'credit card payment', 'online banking transfer', 'internet payment', 'realtime transfer', 'payment thank you', 'autopay payment', 'bill payment', 'online transfer', 'mobile payment', 'loan pmt', 'web pymt'], 'Payment/Transfer'],
  [['restaurant', 'eatery', 'cafe', 'coffee', 'grill', 'kitchen', 'bistro', 'pizzeria', 'taqueria', 'sushi', 'ramen', 'thai ', 'chinese', 'mexican', 'bbq', 'burger', 'taco', 'mcdonald', 'burger king', 'wendy', 'taco bell', 'subway', 'pizza', 'chipotle', 'starbucks', 'kfc', 'popeyes', 'chick-fil', 'sonic', 'panda express', 'doordash', 'uber eats', 'grubhub', 'dunkin', 'panera', 'wingstop', 'raising cane', 'five guys', 'in-n-out', 'whataburger'], 'Food & Dining'],
  [['qt ', 'quiktrip', 'circle k', 'chevron', 'shell ', 'arco ', 'exxon', 'valero', 'bp ', 'sunoco', "fry's fuel", 'frys fuel', 'maverick', 'speedway', 'gas station', 'fuel stop'], 'Gas & Transport'],
  [['parking', 'uber', 'lyft', 'taxi', 'bus pass', 'transit', 'toll ', 'amtrak', 'greyhound', 'airline'], 'Gas & Transport'],
  [['walmart', 'wal-mart', 'target ', 'costco', 'sams club', 'whole foods', 'safeway', 'kroger', "fry's food", 'frys food', 'sprouts', 'albertsons', 'trader joe', 'aldi ', 'grocery', 'supermarket', 'food city', '7-eleven'], 'Groceries'],
  [['cengage', 'mcgraw', 'pearson', 'chegg', 'rio salado', 'college', 'university', 'tuition', 'udemy', 'coursera', 'khan academy', 'skillshare'], 'Education'],
  [['netflix', 'spotify', 'hulu', 'disney', 'youtube premium', 'xbox', 'playstation', 'steam ', 'gaming', 'gamestop', 'nintendo', 'amc ', 'movie ticket', 'museum', 'bowling', 'arcade', 'bambulab'], 'Entertainment'],
  [['aliexpress', 'temu ', 'shein', 'amazon', 'ebay', 'etsy', 'shopify', 'best buy', 'home depot', 'lowes ', 'ikea', 'tj maxx', 'ross stores', 'dollar tree', 'five below'], 'Shopping'],
  [['atm withdrawal', 'cash withdrawal'], 'Cash Withdrawals'],
  [['at&t', 'verizon', 't-mobile', 'tmobile', 'xfinity', 'cox ', 'spectrum', 'simplemobile', 'visible', 'mortgage', 'github', 'google one', 'icloud', 'great clips', 'mvd fee', 'vehicle registration', 'rent pmt', 'rent payment', 'electric', 'southwest gas', 'aps ', 'srp ', 'utility', 'insurance'], 'Bills & Utilities'],
  [['cvs ', 'walgreens', 'rite aid', 'pharmacy', 'clinic', 'doctor', 'hospital', 'urgent care', 'dental', 'vision', 'medical'], 'Health'],
  [['jiffy lube', 'oil change', 'auto zone', 'oreilly', 'car wash', 'valvoline', 'discount tire', 'firestone', 'pep boys'], 'Auto'],
];

const DF_CAT_MAP = {
  'paychecks/salary': 'Income', payroll: 'Income', 'direct deposit': 'Income',
  'investment income': 'Income', 'securities trade': 'Income', deposits: 'Income',
  transfers: 'Payment/Transfer', 'credit card payments': 'Payment/Transfer',
  'restaurants/dining': 'Food & Dining', 'restaurants & dining': 'Food & Dining',
  groceries: 'Groceries', grocery: 'Groceries',
  'gas/automotive': 'Gas & Transport', 'automotive expenses': 'Auto',
  utilities: 'Bills & Utilities', 'personal care': 'Bills & Utilities',
  rent: 'Bills & Utilities', 'online services': 'Bills & Utilities',
  insurance: 'Bills & Utilities', fees: 'Bills & Utilities',
  'service charges & fees': 'Bills & Utilities', 'fees & adjustments': 'Bills & Utilities',
  'government services': 'Bills & Utilities',
  'atm/cash withdrawals': 'Cash Withdrawals', 'atm/cash': 'Cash Withdrawals',
  'healthcare/medical': 'Health', 'healthcare & pharmacy': 'Health',
  entertainment: 'Entertainment', education: 'Education', shopping: 'Shopping',
  'professional services': 'Other',
};

export function parseDate(str) {
  if (!str) return null;
  const clean = String(str).trim().replace(/^"|"$/g, '');
  if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) return new Date(`${clean}T12:00:00`);
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
    if (keywords.some((kw) => low.includes(kw))) return category;
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

function latestBalanceRow(rows, dateField) {
  let best = null, bestDate = 0;
  for (const r of rows) {
    if (!r.Balance || parseAmt(r.Balance) === 0) continue;
    const d = parseDate(r[dateField])?.getTime() || 0;
    if (d > bestDate) { bestDate = d; best = r; }
  }
  return best;
}

function recordBalanceHistory(rows, dateField, balField, account, history) {
  const byMonth = {};
  for (const r of rows) {
    if (!r[balField] || parseAmt(r[balField]) === 0) continue;
    const d = parseDate(r[dateField]);
    if (!d) continue;
    const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    if (!byMonth[ym] || d.getTime() > byMonth[ym].t) byMonth[ym] = { t: d.getTime(), bal: parseAmt(r[balField]) };
  }
  const monthKeys = Object.keys(byMonth);
  if (monthKeys.length) history[account.id] = Object.fromEntries(monthKeys.map((m) => [m, byMonth[m].bal]));
}

export function detectFormat(headers) {
  const h = headers.map((s) => s.toLowerCase().replace(/[^a-z0-9]/g, ' ').trim());
  if (h.some((s) => s.includes('merchant')) && h.some((s) => s.includes('clearing'))) return 'apple';
  if (h.some((s) => s.includes('transaction id')) && h.some((s) => s.includes('transaction category'))) return 'desert-financial';
  if (h.some((s) => s.includes('post date')) && h.some((s) => s.includes('category'))) return 'chase-cc';
  if (h.some((s) => s.includes('posting date')) || h.some((s) => s.includes('check or slip'))) return 'chase-checking';
  if (h.some((s) => s === 'name') && h.some((s) => s === 'memo')) return 'elan';
  return 'unknown';
}

export function inferAccount(filename, format, index) {
  const base = filename.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' ');
  const color = ACCOUNT_COLORS[index % ACCOUNT_COLORS.length];
  const id = `acc-${index}-${filename}`;
  const last4 = base.replace(/\D/g, '').slice(-4) || '';
  const suffix = last4 ? ` ···${last4}` : '';
  switch (format) {
    case 'apple':          return { id, name: `Apple Card${suffix}`,          type: 'credit_card', bank: 'Apple / GS Bank',   color };
    case 'chase-cc':       return { id, name: `Chase Credit Card${suffix}`,   type: 'credit_card', bank: 'Chase',              color };
    case 'chase-checking': return { id, name: `Chase Checking${suffix}`,      type: 'checking',    bank: 'Chase',              color };
    case 'elan':           return { id, name: `Elan Card${suffix}`,           type: 'credit_card', bank: 'Elan / Desert Fin.', color };
    case 'desert-financial': {
      const lc = base.toLowerCase();
      const type = lc.includes('sav') ? 'savings' : 'checking';
      const label = lc.includes('sav') ? 'Savings' : 'Checking';
      return { id, name: `Desert Financial ${label}${suffix}`, type, bank: 'Desert Financial', color };
    }
    default: return { id, name: base || `Account ${index + 1}`, type: 'checking', bank: 'Unknown', color };
  }
}

function makeTx(date, merchant, rawCat, amount, account, meta = {}) {
  let type = 'expense';
  if (rawCat === 'Income') type = 'income';
  else if (rawCat === 'Payment/Transfer') type = 'payment';
  else if (rawCat === 'Investments') type = 'investment';
  else if (amount > 0 && account.type !== 'checking' && account.type !== 'savings') type = 'payment';
  else if (amount > 0 && (account.type === 'checking' || account.type === 'savings')) type = 'income';
  return {
    id: `${account.id}-${date?.getTime() || 0}-${merchant}-${amount}`,
    date, merchant, category: rawCat, amount, type,
    account: account.id, accountName: account.name, accountColor: account.color,
    rawCategory: meta.rawCategory || '', sourceType: meta.sourceType || '',
  };
}

function parseRows(rows, account, balances, history) {
  if (!rows.length) return [];
  const format = detectFormat(Object.keys(rows[0]));
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
    recordBalanceHistory(rows, 'Posting Date', 'Balance', account, history);
    return rows.filter((r) => r['Posting Date']).map((r) => {
      const merchant = r.Description || '';
      return makeTx(parseDate(r['Posting Date']), merchant, guessCategory(merchant), parseAmt(r.Amount), account, { sourceType: r.Type || '' });
    });
  }
  if (format === 'elan') {
    return rows.filter((r) => r.Date).map((r) => makeTx(parseDate(r.Date), r.Name || '', guessCategory(r.Name || ''), parseAmt(r.Amount), account));
  }
  if (format === 'desert-financial') {
    const validRows = rows.filter((r) => r['Posting Date']);
    const balRow = latestBalanceRow(validRows, 'Posting Date');
    if (balRow) balances[account.id] = parseAmt(balRow.Balance);
    recordBalanceHistory(validRows, 'Posting Date', 'Balance', account, history);
    return validRows.map((r) => {
      const desc = r.Description || '';
      const rawCat = String(r['Transaction Category'] || '').toLowerCase().trim();
      return makeTx(parseDate(r['Posting Date']), desc, DF_CAT_MAP[rawCat] || guessCategory(desc), parseAmt(r.Amount), account, { rawCategory: r['Transaction Category'] || '', sourceType: r.Type || '' });
    });
  }
  return [];
}

function dedupeIds(transactions) {
  const seen = new Map();
  for (const t of transactions) {
    const n = seen.get(t.id) || 0;
    seen.set(t.id, n + 1);
    if (n > 0) t.id = `${t.id}-${n + 1}`;
  }
  return transactions;
}

function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.onerror = reject;
    reader.readAsText(file);
  });
}

// Primary entry point for the public app — accepts File objects from drag/drop or input
export async function loadFromFiles(files) {
  const balances = {}, balanceHistory = {}, accounts = [], allTxs = [];
  const failed = [];
  let i = 0;
  for (const file of files) {
    try {
      const text = await readFileAsText(file);
      const parsed = Papa.parse(text, { header: true, skipEmptyLines: true });
      if (!parsed.data.length) { failed.push(file.name); continue; }
      const format = detectFormat(Object.keys(parsed.data[0]));
      if (format === 'unknown') { failed.push(file.name); continue; }
      const account = inferAccount(file.name, format, i++);
      accounts.push(account);
      allTxs.push(...parseRows(parsed.data, account, balances, balanceHistory));
    } catch (err) {
      failed.push(file.name);
      console.warn(`Could not parse ${file.name}:`, err.message);
    }
  }
  ACCOUNTS = accounts;
  const transactions = dedupeIds(allTxs.filter((t) => t.date).sort((a, b) => b.date - a.date));
  return { transactions, balances, balanceHistory, accounts, failed };
}

// Demo data — no files needed, showcases every feature
export function generateDemoData() {
  const chk = { id: 'demo-chk', name: 'My Checking', type: 'checking', bank: 'First National', color: '#10b981' };
  const cc  = { id: 'demo-cc',  name: 'Rewards Visa', type: 'credit_card', bank: 'First National', color: '#f59e0b' };
  const sav = { id: 'demo-sav', name: 'My Savings',   type: 'savings', bank: 'First National', color: '#14b8a6' };
  const accounts = [chk, cc, sav];
  ACCOUNTS = accounts;

  const now = new Date();
  const tx = (mAgo, day, merchant, amount, cat, acc) => {
    const d = new Date(now.getFullYear(), now.getMonth() - mAgo, day);
    if (d > now) return null;
    let type = amount < 0 ? 'expense' : acc.type === 'credit_card' ? 'payment' : 'income';
    if (cat === 'Income') type = 'income';
    if (cat === 'Payment/Transfer') type = 'payment';
    if (cat === 'Investments') type = 'investment';
    return { id: `demo-${mAgo}-${day}-${merchant}`, date: d, merchant, category: cat, amount, type, account: acc.id, accountName: acc.name, accountColor: acc.color, rawCategory: '', sourceType: '' };
  };

  const rows = [];
  for (let m = 0; m < 7; m++) {
    const jitter = () => (Math.random() - 0.5) * 3;
    // Income (bi-weekly paycheck)
    rows.push(tx(m, 1,  'PAYROLL DIRECT DEPOSIT', 2850 + jitter(), 'Income', chk));
    rows.push(tx(m, 15, 'PAYROLL DIRECT DEPOSIT', 2850 + jitter(), 'Income', chk));
    // Rent
    rows.push(tx(m, 2,  'RENT PAYMENT', -1200, 'Bills & Utilities', chk));
    // Savings transfer
    rows.push(tx(m, 3,  'TRANSFER TO SAVINGS', -400, 'Payment/Transfer', chk));
    rows.push(tx(m, 3,  'TRANSFER FROM CHECKING', 400, 'Payment/Transfer', sav));
    // Utilities
    rows.push(tx(m, 5,  'ELECTRIC BILL',     -(85 + jitter()),   'Bills & Utilities', chk));
    rows.push(tx(m, 7,  'T-Mobile',          -(80 + jitter()),   'Bills & Utilities', cc));
    rows.push(tx(m, 12, 'Netflix',           -15.49,             'Entertainment', cc));
    rows.push(tx(m, 14, 'Spotify',           -9.99,              'Entertainment', cc));
    rows.push(tx(m, 20, 'iCloud Storage',    -2.99,              'Bills & Utilities', cc));
    rows.push(tx(m, 22, 'GitHub',            -4.00,              'Bills & Utilities', cc));
    // Food
    rows.push(tx(m, 3,  "McDonald's",         -(8 + jitter()),   'Food & Dining', cc));
    rows.push(tx(m, 6,  'Chipotle',           -(13 + jitter()),  'Food & Dining', cc));
    rows.push(tx(m, 9,  'Starbucks',          -(6 + jitter()),   'Food & Dining', cc));
    rows.push(tx(m, 11, 'DoorDash',           -(32 + jitter()),  'Food & Dining', cc));
    rows.push(tx(m, 17, 'Chick-fil-A',        -(11 + jitter()),  'Food & Dining', cc));
    rows.push(tx(m, 23, 'Panera Bread',       -(14 + jitter()),  'Food & Dining', cc));
    // Groceries
    rows.push(tx(m, 8,  'Walmart Supercenter',-(92 + jitter()),  'Groceries', cc));
    rows.push(tx(m, 21, 'Kroger',             -(64 + jitter()),  'Groceries', cc));
    // Gas
    rows.push(tx(m, 4,  'Shell Station',      -(51 + jitter()),  'Gas & Transport', cc));
    rows.push(tx(m, 18, 'QuikTrip',           -(47 + jitter()),  'Gas & Transport', cc));
    // Shopping
    rows.push(tx(m, 10, 'Amazon.com',         -(38 + jitter()),  'Shopping', cc));
    rows.push(tx(m, 16, 'Target',             -(55 + jitter()),  'Shopping', cc));
    // Health
    rows.push(tx(m, 13, 'CVS Pharmacy',       -(22 + jitter()),  'Health', cc));
    // Entertainment
    rows.push(tx(m, 25, 'AMC Theaters',       -(28 + jitter()),  'Entertainment', cc));
    // AI (every other month)
    if (m % 2 === 0) rows.push(tx(m, 6, 'ANTHROPIC* CLAUDE SUB', -20, 'AI', cc));
    if (m % 2 === 1) rows.push(tx(m, 6, 'OpenAI ChatGPT Plus',   -20, 'AI', cc));
    // Investments (monthly)
    rows.push(tx(m, 8,  'Charles Schwab',     -200, 'Investments', chk));
  }

  const transactions = dedupeIds(rows.filter(Boolean).filter((t) => t.date).sort((a, b) => b.date - a.date));
  const balances = { 'demo-chk': 3241.18, 'demo-cc': -847.32, 'demo-sav': 4800 };
  const balanceHistory = {
    'demo-chk': Object.fromEntries(Array.from({ length: 7 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (6 - i), 1);
      return [`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`, 2800 + i * 180 + Math.random() * 200];
    })),
  };
  return { transactions, balances, balanceHistory, accounts };
}

export function getDateRange(filter) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
  if (filter.startsWith('custom:')) {
    const [, s, e] = filter.split(':');
    return [s ? new Date(`${s}T00:00:00`) : new Date(1970, 0, 1), e ? new Date(`${e}T23:59:59`) : today];
  }
  if (/^\d{4}-\d{2}$/.test(filter)) {
    const year = parseInt(filter.slice(0, 4), 10), month = parseInt(filter.slice(5, 7), 10) - 1;
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
export const income   = (transactions) => transactions.filter((t) => t.type === 'income');
