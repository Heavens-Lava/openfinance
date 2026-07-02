import { useEffect, useMemo, useRef, useState } from 'react';
import { CAT_COLORS, MONTH_NAMES, dollar, expenses, filterByDate, fmtDate, income, loadLocalManifest, parseAll } from './lib/finance.js';
import { loadCategoryOverrides, loadRules, loadStoredFiles, saveCategoryOverrides, saveRules, saveStoredFiles } from './lib/storage.js';
import { demoFiles } from './lib/demo.js';

const VIEWS = [
  ['dashboard', 'Dashboard', 'grid'],
  ['transactions', 'Transactions', 'list'],
  ['categories', 'Categories', 'pie'],
  ['recurring', 'Recurring', 'repeat'],
  ['cashflow', 'Cash Flow', 'flow'],
  ['networth', 'Net Worth', 'trend'],
  ['accounts', 'Accounts', 'card'],
  ['income', 'Income & Savings', 'coin'],
  ['goals', 'Goals', 'target'],
  ['rules', 'Rules', 'wand'],
  ['import', 'Import Data', 'upload'],
];

const sum = (rows, fn) => rows.reduce((total, row) => total + fn(row), 0);
const cats = (rows) => {
  const map = new Map();
  expenses(rows).filter((t) => !['Income', 'Payment/Transfer'].includes(t.category)).forEach((t) => {
    map.set(t.category, (map.get(t.category) || 0) + Math.abs(t.amount));
  });
  return [...map.entries()].sort((a, b) => b[1] - a[1]);
};
const months = (rows) => [...new Set(rows.filter((t) => t.date).map((t) => `${t.date.getFullYear()}-${String(t.date.getMonth() + 1).padStart(2, '0')}`))].sort().reverse();
const labelFor = (filter) => {
  const now = new Date();
  if (filter.startsWith('custom:')) {
    const [, s, e] = filter.split(':');
    const f = (iso) => (iso ? fmtDate(new Date(`${iso}T12:00:00`)) : '…');
    return `${f(s)} – ${f(e)}`;
  }
  if (/^\d{4}-\d{2}$/.test(filter)) {
    const [y, m] = filter.split('-');
    return `${MONTH_NAMES[Number(m) - 1]} ${y}`;
  }
  if (/^\d{4}$/.test(filter)) return `Full Year ${filter}`;
  if (filter === 'ytd') return `Year to Date ${now.getFullYear()}`;
  if (filter === 'this-month') return `${MONTH_NAMES[now.getMonth()]} ${now.getFullYear()}`;
  if (filter === 'last-month') {
    const d = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    return `${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`;
  }
  if (filter === 'last-3') return 'Last 3 Months';
  if (filter === 'last-6') return 'Last 6 Months';
  return 'All Time';
};

// Merchants with 3+ near-identical charges in 3+ distinct months = likely subscription.
function detectRecurring(all) {
  const groups = new Map();
  for (const t of expenses(all)) {
    const key = (t.merchant || '').toLowerCase().replace(/[#*\d]+/g, '').trim().slice(0, 24);
    if (!key) continue;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(t);
  }
  const subs = [];
  for (const txs of groups.values()) {
    if (txs.length < 3) continue;
    const monthSet = new Set(txs.map((t) => `${t.date.getFullYear()}-${t.date.getMonth()}`));
    if (monthSet.size < 3) continue;
    const amts = txs.map((t) => Math.abs(t.amount));
    const avg = sum(amts.map((a) => [a]), (a) => a[0]) / amts.length;
    if (!avg || Math.max(...amts.map((a) => Math.abs(a - avg))) / avg > 0.15) continue;
    subs.push({ merchant: txs[0].merchant, category: txs[0].category, monthly: avg, count: txs.length, months: monthSet.size, last: txs[0].date });
  }
  return subs.sort((a, b) => b.monthly - a.monthly);
}

function Icon({ name }) {
  const paths = {
    grid: <><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></>,
    list: <><path d="M4 6h16M4 12h16M4 18h16" /></>,
    pie: <><path d="M11 3a9 9 0 1 0 9 10h-9z" /><path d="M15 3.5V9h5.5A9 9 0 0 0 15 3.5z" /></>,
    card: <><rect x="3" y="5" width="18" height="14" rx="3" /><path d="M3 10h18M7 15h2M12 15h2" /></>,
    coin: <><circle cx="12" cy="12" r="9" /><path d="M12 7v10M9 10c0-1.2 1.3-2 3-2s3 .8 3 2-1.3 2-3 2-3 .8-3 2 1.3 2 3 2 3-.8 3-2" /></>,
    target: <><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1" /></>,
    upload: <><path d="M12 16V4m0 0l-4 4m4-4l4 4" /><path d="M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3" /></>,
    repeat: <><path d="M17 2l4 4-4 4" /><path d="M3 11V9a4 4 0 0 1 4-4h14" /><path d="M7 22l-4-4 4-4" /><path d="M21 13v2a4 4 0 0 1-4 4H3" /></>,
    trend: <><path d="M3 17l6-6 4 4 8-8" /><path d="M15 7h6v6" /></>,
    flow: <><path d="M4 6h4c4 0 4 6 8 6h4" /><path d="M4 12h4" /><path d="M4 18h4c4 0 4-6 8-6" /><path d="M17 3l4 3-4 3M17 15l4 3-4 3" /></>,
    wand: <><path d="M15 4V2m0 14v-2m-7-7H6m14 0h-2m-1.8-4.2l1.4-1.4M8.4 8.4L7 7m9.2 1.4l1.4-1.4M4 20l8-8" /></>,
  };
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>;
}

function Sidebar({ view, setView, status }) {
  return <aside className="sidebar">
    <div className="brand"><div className="brand-mark">OF</div><div><b>OpenFinance</b><small>Private, local-first finance</small></div></div>
    <nav>{VIEWS.map(([id, label, icon]) => <button key={id} className={view === id ? 'active' : ''} onClick={() => setView(id)}><Icon name={icon} /><span>{label}</span></button>)}</nav>
    <p>{status}</p>
    <p className="privacy-note">Your data never leaves this browser.</p>
  </aside>;
}

function Stat({ label, value, note, tone = 'blue', onClick }) {
  return <button className={`stat ${tone}`} onClick={onClick} type="button"><span>{label}</span><strong>{value}</strong><small>{note}</small></button>;
}

function Panel({ title, action, children }) {
  return <section className="panel"><header><h2>{title}</h2>{action}</header>{children}</section>;
}

function TransactionsList({ rows, onCategorize }) {
  if (!rows.length) return <div className="empty">No transactions for this period.</div>;
  const catOptions = Object.keys(CAT_COLORS);
  return <div className="tx-list">{rows.map((t) => <div className="tx" key={t.id}>
    <span className="date">{fmtDate(t.date)}</span>
    <div className="merchant"><b>{t.merchant || 'Unknown merchant'}</b><small><i style={{ background: CAT_COLORS[t.category] || CAT_COLORS.Other }} />
      {onCategorize
        ? <select className="cat-select" title="Change category" value={t.category} onChange={(e) => onCategorize(t.id, e.target.value)}>{(catOptions.includes(t.category) ? catOptions : [t.category, ...catOptions]).map((c) => <option key={c}>{c}</option>)}</select>
        : t.category}
    </small></div>
    <span className="account">{t.accountName}</span>
    <strong className={t.amount < 0 ? 'bad' : 'good'}>{t.amount < 0 ? '-' : '+'}{dollar(t.amount)}</strong>
  </div>)}</div>;
}

function Bars({ rows, color = '#2563eb', onPick }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return <div className="bars">{rows.map((r) => <button key={r.label} onClick={() => onPick?.(r)} title={`${r.label}: ${dollar(r.value)}`}><strong>{dollar(r.value)}</strong><div><i style={{ height: `${Math.max(4, r.value / max * 100)}%`, background: color }} /></div><span>{r.label}</span></button>)}</div>;
}

function CategoryBars({ rows }) {
  const total = rows.reduce((s, [, v]) => s + v, 0) || 1;
  return <div className="cat-bars">{rows.map(([cat, amount]) => <div key={cat} className="cat-row"><div><i style={{ background: CAT_COLORS[cat] || CAT_COLORS.Other }} /><b>{cat}</b></div><strong>{dollar(amount)}</strong><span><em style={{ width: `${amount / total * 100}%`, background: CAT_COLORS[cat] || CAT_COLORS.Other }} /></span></div>)}</div>;
}

// GitHub-style daily spending heatmap, last ~6 months. Click a day to drill in.
function Heatmap({ all, setFilter, setTxFilters, setView }) {
  const today = new Date();
  const daily = new Map();
  for (const t of expenses(all)) {
    const k = `${t.date.getFullYear()}-${String(t.date.getMonth() + 1).padStart(2, '0')}-${String(t.date.getDate()).padStart(2, '0')}`;
    daily.set(k, (daily.get(k) || 0) + Math.abs(t.amount));
  }
  const nonzero = [...daily.values()].sort((a, b) => a - b);
  const q = (p) => nonzero[Math.floor(p * (nonzero.length - 1))] || 1;
  const buckets = [q(0.25), q(0.5), q(0.75), q(0.92)];
  const SHADES = ['#f1f5f9', '#fecaca', '#f87171', '#ef4444', '#991b1b'];
  const level = (v) => (!v ? 0 : Math.min(4, 1 + buckets.filter((b) => v > b).length));
  const weeks = [];
  const start = new Date(today);
  start.setDate(start.getDate() - start.getDay() - 25 * 7);
  for (let w = 0; w < 26; w++) {
    const col = [];
    for (let d = 0; d < 7; d++) {
      const cur = new Date(start);
      cur.setDate(start.getDate() + w * 7 + d);
      if (cur > today) break;
      const iso = `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, '0')}-${String(cur.getDate()).padStart(2, '0')}`;
      col.push({ iso, label: fmtDate(cur), value: daily.get(iso) || 0 });
    }
    weeks.push(col);
  }
  return <div className="heatmap">{weeks.map((col, i) => <div className="hm-col" key={i}>{col.map((c) => <button
    key={c.iso} className="hm-cell" title={`${c.label}: ${dollar(c.value)}`}
    style={{ background: SHADES[level(c.value)] }}
    onClick={() => { setFilter(`custom:${c.iso}:${c.iso}`); setTxFilters({ search: '', account: '', category: '', type: 'expense' }); setView('transactions'); }}
  />)}</div>)}</div>;
}

function Dashboard({ all, rows, balances, accounts, setView, setFilter, setTxFilters, filter }) {
  const exp = expenses(rows);
  const inc = income(rows);
  const net = sum(inc, (t) => t.amount) - sum(exp, (t) => Math.abs(t.amount));
  const cash = accounts.filter((a) => ['checking', 'savings'].includes(a.type) && balances[a.id] !== undefined).reduce((s, a) => s + balances[a.id], 0);
  const categoryRows = cats(rows);
  const top = categoryRows[0];
  const now = new Date();
  const monthly = Array.from({ length: 13 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (12 - i), 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    return { key, label: `${MONTH_NAMES[d.getMonth()]} '${String(d.getFullYear()).slice(2)}`, value: sum(expenses(filterByDate(all, key)), (t) => Math.abs(t.amount)) };
  });
  const reset = { search: '', account: '', category: '', type: '' };
  return <div className="view">
    <section className="hero"><div><span>Personal command center</span><h1>Know where the money is moving.</h1><p>Spending, income, savings, and goals from your imported statements.</p></div><div className="hero-grid"><div><small>Selected net</small><b className={net >= 0 ? 'good' : 'bad'}>{net >= 0 ? '+' : '-'}{dollar(Math.abs(net))}</b></div><div><small>Cash balance</small><b>{dollar(cash)}</b></div><div><small>Transactions</small><b>{rows.length.toLocaleString()}</b></div></div></section>
    <div className="stats">
      <Stat label="Income" value={dollar(sum(inc, (t) => t.amount))} note={labelFor(filter)} tone="green" onClick={() => { setTxFilters({ ...reset, type: 'income' }); setView('transactions'); }} />
      <Stat label="Spent" value={dollar(sum(exp, (t) => Math.abs(t.amount)))} note={labelFor(filter)} tone="red" onClick={() => { setTxFilters({ ...reset, type: 'expense' }); setView('transactions'); }} />
      <Stat label="This Month Spent" value={dollar(sum(expenses(filterByDate(all, 'this-month')), (t) => Math.abs(t.amount)))} note="click to inspect" tone="red" onClick={() => { setFilter('this-month'); setTxFilters({ ...reset, type: 'expense' }); setView('transactions'); }} />
      <Stat label="Top Category" value={top?.[0] || 'None'} note={top ? `${dollar(top[1])} spent` : 'by spending'} onClick={() => { if (top) { setTxFilters({ ...reset, category: top[0], type: 'expense' }); setView('transactions'); } }} />
    </div>
    <div className="grid-main"><Panel title="Monthly Spending"><Bars rows={monthly} onPick={(r) => { setFilter(r.key); setTxFilters(reset); setView('transactions'); }} /></Panel><Panel title="By Category"><CategoryBars rows={categoryRows.slice(0, 8)} /></Panel></div>
    <Panel title="Daily Spending — Last 6 Months"><Heatmap all={all} setFilter={setFilter} setTxFilters={setTxFilters} setView={setView} /></Panel>
    <Panel title="Recent Transactions" action={<button onClick={() => setView('transactions')}>View all</button>}><TransactionsList rows={rows.slice(0, 12)} /></Panel>
  </div>;
}

function exportCsv(rows) {
  const esc = (s) => `"${String(s ?? '').replace(/"/g, '""')}"`;
  const lines = ['Date,Merchant,Category,Account,Type,Amount'];
  for (const t of rows) lines.push([t.date.toISOString().slice(0, 10), esc(t.merchant), esc(t.category), esc(t.accountName), t.type, t.amount.toFixed(2)].join(','));
  const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'transactions.csv';
  a.click();
  URL.revokeObjectURL(a.href);
}

function Transactions({ rows, filters, setFilters, accounts, onCategorize }) {
  const [page, setPage] = useState(0);
  const filtered = rows.filter((t) => (!filters.search || (t.merchant || '').toLowerCase().includes(filters.search.toLowerCase())) && (!filters.account || t.account === filters.account) && (!filters.category || t.category === filters.category) && (!filters.type || t.type === filters.type));
  const catsList = [...new Set(rows.map((t) => t.category))].sort();
  const pageRows = filtered.slice(page * 50, page * 50 + 50);
  useEffect(() => setPage(0), [filters, rows]);
  return <div className="view"><section className="filters"><input placeholder="Search merchant..." value={filters.search} onChange={(e) => setFilters({ search: e.target.value })} /><select value={filters.account} onChange={(e) => setFilters({ account: e.target.value })}><option value="">All Accounts</option>{accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</select><select value={filters.category} onChange={(e) => setFilters({ category: e.target.value })}><option value="">All Categories</option>{catsList.map((c) => <option key={c}>{c}</option>)}</select><select value={filters.type} onChange={(e) => setFilters({ type: e.target.value })}><option value="">All Types</option><option value="expense">Expenses</option><option value="income">Income</option><option value="investment">Investments</option><option value="payment">Payments</option></select></section><Panel title={`${filtered.length.toLocaleString()} Transactions`} action={<button onClick={() => exportCsv(filtered)}>Export CSV</button>}><TransactionsList rows={pageRows} onCategorize={onCategorize} /><div className="pager"><span>Page {page + 1} of {Math.max(1, Math.ceil(filtered.length / 50))}</span><div><button disabled={page === 0} onClick={() => setPage(page - 1)}>Prev</button><button disabled={page >= Math.ceil(filtered.length / 50) - 1} onClick={() => setPage(page + 1)}>Next</button></div></div></Panel></div>;
}

function Categories({ rows, setView, setTxFilters }) {
  const categoryRows = cats(rows);
  const total = categoryRows.reduce((s, [, v]) => s + v, 0) || 1;
  const exp = expenses(rows);
  return <div className="category-view">
    <section className="category-summary">
      <div><h1>Spending Categories</h1><p>Click any category to inspect its transactions for the selected period.</p></div>
      <div><span>Total categorized spending</span><strong>{dollar(total)}</strong></div>
    </section>
    <div className="category-grid">
      {categoryRows.map(([cat, amount]) => {
        const color = CAT_COLORS[cat] || CAT_COLORS.Other;
        const pct = amount / total * 100;
        const count = exp.filter((t) => t.category === cat).length;
        return <button className="category-card" key={cat} onClick={() => { setTxFilters({ search: '', account: '', category: cat, type: 'expense' }); setView('transactions'); }}>
          <div className="category-card-top"><span className="category-dot" style={{ background: color }} /><b>{cat}</b><span className="category-percent">{pct.toFixed(1)}%</span></div>
          <div className="category-card-main"><strong>{dollar(amount)}</strong><small>{count} {count === 1 ? 'transaction' : 'transactions'}</small></div>
          <div className="category-progress" aria-hidden="true"><span style={{ width: `${pct}%`, background: color }} /></div>
        </button>;
      })}
    </div>
  </div>;
}

function Recurring({ all, setView, setTxFilters }) {
  const subs = detectRecurring(all);
  const total = sum(subs, (s) => s.monthly);
  return <div className="view">
    <div className="stats small">
      <Stat label="Recurring charges" value={String(subs.length)} note="detected subscriptions" />
      <Stat label="Monthly total" value={dollar(total)} note="estimated" tone="red" />
      <Stat label="Yearly cost" value={dollar(total * 12)} note="if nothing changes" tone="red" />
    </div>
    <Panel title="Likely Subscriptions & Recurring Bills">
      {!subs.length ? <div className="empty">Nothing recurring detected yet — needs 3+ months of similar charges from the same merchant.</div> :
        <div className="tx-list">{subs.map((s) => <div className="tx" key={s.merchant}>
          <span className="date">{fmtDate(s.last)}</span>
          <div className="merchant"><b>{s.merchant}</b><small><i style={{ background: CAT_COLORS[s.category] || CAT_COLORS.Other }} />{s.category} · seen {s.count}× over {s.months} months</small></div>
          <button className="link-btn" onClick={() => { setTxFilters({ search: s.merchant.slice(0, 12), account: '', category: '', type: '' }); setView('transactions'); }}>view charges</button>
          <strong className="bad">-{dollar(s.monthly)}/mo</strong>
        </div>)}</div>}
    </Panel>
  </div>;
}

function Accounts({ rows, balances, accounts }) {
  if (!accounts.length) return <div className="empty">No accounts yet — import a CSV to get started.</div>;
  return <div className="accounts">{accounts.map((a) => { const txs = rows.filter((t) => t.account === a.id); const spent = sum(expenses(txs), (t) => Math.abs(t.amount)); const earned = sum(income(txs), (t) => Math.abs(t.amount)); return <Panel key={a.id} title={a.name}><div className="acct" style={{ borderColor: a.color }}><div><b>{balances[a.id] !== undefined ? dollar(balances[a.id]) : `-${dollar(spent)}`}</b><small>{a.bank} - {a.type.replace('_', ' ')}</small></div><p><span className="good">+{dollar(earned)} in</span><span className="bad">-{dollar(spent)} out</span></p></div><TransactionsList rows={txs.slice(0, 5)} /></Panel>; })}</div>;
}

function IncomeView({ all, setView, setTxFilters }) {
  const monthRows = months(all).slice(0, 13).map((key) => { const txs = filterByDate(all, key); return { key, inc: sum(income(txs), (t) => t.amount), exp: sum(expenses(txs), (t) => Math.abs(t.amount)), inv: sum(txs.filter((t) => t.type === 'investment'), (t) => Math.abs(t.amount)) }; });
  const invested = all.filter((t) => t.type === 'investment');
  const year = new Date().getFullYear();
  return <div className="view"><div className="stats"><Stat label="YTD Income" value={dollar(sum(income(filterByDate(all, 'ytd')), (t) => t.amount))} note={String(year)} tone="green" /><Stat label={`${year - 1} Income`} value={dollar(sum(income(filterByDate(all, String(year - 1))), (t) => t.amount))} note="full year" tone="green" /><Stat label="YTD Expenses" value={dollar(sum(expenses(filterByDate(all, 'ytd')), (t) => Math.abs(t.amount)))} note="cash out" tone="red" /><Stat label="Invested" value={dollar(sum(invested, (t) => Math.abs(t.amount)))} note="brokerage transfers" tone="purple" onClick={() => { setTxFilters({ search: '', account: '', category: '', type: 'investment' }); setView('transactions'); }} /></div><Panel title="Monthly Breakdown"><div className="table"><div><b>Month</b><b>Income</b><b>Expenses</b><b>Invested</b><b>Net</b></div>{monthRows.map((r) => <div key={r.key}><span>{labelFor(r.key)}</span><span className="good">{r.inc ? dollar(r.inc) : '-'}</span><span className="bad">{r.exp ? `-${dollar(r.exp)}` : '-'}</span><span className="purple">{r.inv ? `-${dollar(r.inv)}` : '-'}</span><span className={r.inc - r.exp >= 0 ? 'good' : 'bad'}>{r.inc - r.exp >= 0 ? '+' : '-'}{dollar(Math.abs(r.inc - r.exp))}</span></div>)}</div></Panel></div>;
}

// Hand-rolled SVG Sankey: income (or total spend) on the left flowing into
// spending categories and savings on the right. No chart library needed.
function CashFlow({ rows, filter, setView, setTxFilters }) {
  const inc = sum(income(rows), (t) => t.amount);
  const catRows = cats(rows);
  const spent = catRows.reduce((s, [, v]) => s + v, 0);
  if (!spent && !inc) return <div className="view"><Panel title="Cash Flow"><div className="empty">No income or spending in this period.</div></Panel></div>;
  const top = catRows.slice(0, 9);
  const rest = catRows.slice(9).reduce((s, [, v]) => s + v, 0);
  const right = top.map(([cat, val]) => ({ label: cat, val, color: CAT_COLORS[cat] || CAT_COLORS.Other, cat }));
  if (rest > 0) right.push({ label: 'Other categories', val: rest, color: CAT_COLORS.Other });
  const savings = inc - spent;
  if (inc > 0 && savings > 0) right.push({ label: 'Saved', val: savings, color: '#10b981' });
  const leftTotal = right.reduce((s, r) => s + r.val, 0);
  const leftLabel = inc > 0 ? 'Income' : 'Spending';
  const GAP = 10, W = 760, LX = 150, RX = W - 210, NODE = 14;
  const H = Math.max(280, right.length * 46);
  const scale = (H - GAP * (right.length - 1)) / leftTotal;
  let ly = (H - leftTotal * scale) / 2, ry = 0;
  const ribbons = right.map((r) => {
    const h = r.val * scale;
    const rib = { ...r, ly0: ly, ly1: ly + h, ry0: ry, ry1: ry + h };
    ly += h; ry += h + GAP;
    return rib;
  });
  const mid = (LX + NODE + RX) / 2;
  const pick = (r) => { if (r.cat) { setTxFilters({ search: '', account: '', category: r.cat, type: 'expense' }); setView('transactions'); } };
  return <div className="view">
    <div className="stats small">
      <Stat label={inc > 0 ? 'Income' : 'Total spent'} value={dollar(inc > 0 ? inc : spent)} note={labelFor(filter)} tone={inc > 0 ? 'green' : 'red'} />
      <Stat label="Spent" value={dollar(spent)} note={inc > 0 ? `${(spent / inc * 100).toFixed(0)}% of income` : 'all categories'} tone="red" />
      <Stat label="Saved" value={inc > 0 ? dollar(Math.max(0, savings)) : '—'} note={inc > 0 && savings > 0 ? `${(savings / inc * 100).toFixed(0)}% savings rate` : inc > 0 ? 'spent more than earned' : 'no income data in period'} tone={savings >= 0 ? 'green' : 'red'} />
    </div>
    <Panel title={`Where the Money Went — ${labelFor(filter)}`}>
      <div className="sankey-wrap"><svg viewBox={`0 0 ${W} ${H}`} className="sankey">
        <rect x={LX} y={(H - leftTotal * scale) / 2} width={NODE} height={leftTotal * scale} rx="4" fill="#334155" />
        <text x={LX - 10} y={H / 2} textAnchor="end" className="sankey-label-main">{leftLabel}</text>
        {ribbons.map((r) => <g key={r.label} className={r.cat ? 'sankey-flow clickable' : 'sankey-flow'} onClick={() => pick(r)}>
          <path d={`M ${LX + NODE} ${r.ly0} C ${mid} ${r.ly0} ${mid} ${r.ry0} ${RX} ${r.ry0} L ${RX} ${r.ry1} C ${mid} ${r.ry1} ${mid} ${r.ly1} ${LX + NODE} ${r.ly1} Z`} fill={r.color} opacity="0.45" />
          <rect x={RX} y={r.ry0} width={NODE} height={Math.max(2, r.ry1 - r.ry0)} rx="3" fill={r.color} />
          <text x={RX + NODE + 8} y={(r.ry0 + r.ry1) / 2 + 4} className="sankey-label">{r.label} · {dollar(r.val)}</text>
        </g>)}
      </svg></div>
    </Panel>
  </div>;
}

function NetWorth({ history, accounts }) {
  const tracked = accounts.filter((a) => history[a.id] && Object.keys(history[a.id]).length);
  if (!tracked.length) return <div className="view"><Panel title="Net Worth"><div className="empty">No balance history yet. Net worth needs statements with a running Balance column (most checking/savings exports have one — credit card exports usually don't).</div></Panel></div>;
  const allMonths = [...new Set(tracked.flatMap((a) => Object.keys(history[a.id])))].sort();
  // Credit balances are debt; carry each account's last known balance forward
  // through months where it has no statement rows.
  const carried = {};
  const series = allMonths.map((m) => {
    let total = 0;
    for (const a of tracked) {
      if (history[a.id][m] !== undefined) carried[a.id] = history[a.id][m];
      const bal = carried[a.id] ?? 0;
      total += a.type === 'credit_card' ? -Math.abs(bal) : bal;
    }
    return { key: m, label: `${MONTH_NAMES[Number(m.slice(5)) - 1]} '${m.slice(2, 4)}`, value: total };
  });
  const recent = series.slice(-13);
  const current = series[series.length - 1]?.value ?? 0;
  const prev = series[series.length - 2]?.value;
  const change = prev !== undefined ? current - prev : null;
  return <div className="view">
    <div className="stats small">
      <Stat label="Current net cash" value={dollar(current)} note={`across ${tracked.length} tracked ${tracked.length === 1 ? 'account' : 'accounts'}`} tone={current >= 0 ? 'green' : 'red'} />
      <Stat label="1-month change" value={change === null ? '—' : `${change >= 0 ? '+' : '-'}${dollar(Math.abs(change))}`} note="vs. prior month-end" tone={change === null || change >= 0 ? 'green' : 'red'} />
      <Stat label="Months tracked" value={String(series.length)} note="from statement balances" />
    </div>
    <Panel title="Month-End Net Cash"><Bars rows={recent} color="#14b8a6" /></Panel>
    <Panel title="By Account (latest month-end)"><div className="tx-list">{tracked.map((a) => { const ms = Object.keys(history[a.id]).sort(); const last = ms[ms.length - 1]; const bal = history[a.id][last]; return <div className="tx" key={a.id}><span className="date">{last}</span><div className="merchant"><b>{a.name}</b><small><i style={{ background: a.color }} />{a.type.replace('_', ' ')}</small></div><span className="account" /><strong className={a.type === 'credit_card' ? 'bad' : 'good'}>{a.type === 'credit_card' ? '-' : ''}{dollar(bal)}</strong></div>; })}</div></Panel>
  </div>;
}

function Rules({ rules, setRules, transactions }) {
  const [keyword, setKeyword] = useState('');
  const [category, setCategory] = useState('Food & Dining');
  const matches = (kw) => transactions.filter((t) => (t.merchant || '').toLowerCase().includes(kw)).length;
  const add = (e) => {
    e.preventDefault();
    const kw = keyword.trim().toLowerCase();
    if (!kw) return;
    setRules([...rules.filter((r) => r.keyword !== kw), { keyword: kw, category }]);
    setKeyword('');
  };
  return <div className="view">
    <section className="goal-head"><div><h1>Categorization Rules</h1><p>Your rules run before the built-in ones and apply to every import, past and future. Saved in this browser.</p></div></section>
    <Panel title="Add a Rule">
      <form className="rule-form" onSubmit={add}>
        <input placeholder='Merchant contains… (e.g. "costco")' value={keyword} onChange={(e) => setKeyword(e.target.value)} />
        <span>→</span>
        <select value={category} onChange={(e) => setCategory(e.target.value)}>{Object.keys(CAT_COLORS).map((c) => <option key={c}>{c}</option>)}</select>
        <button className="add-btn" type="submit" disabled={!keyword.trim()}>Add rule</button>
        {keyword.trim() && <small>{matches(keyword.trim().toLowerCase())} matching transactions</small>}
      </form>
    </Panel>
    <Panel title={`${rules.length} Active ${rules.length === 1 ? 'Rule' : 'Rules'}`}>
      {!rules.length ? <div className="empty">No custom rules yet. Add one above — e.g. put your gym on "Health" or your landlord on "Bills & Utilities".</div> :
        <div className="tx-list">{rules.map((r) => <div className="tx" key={r.keyword}>
          <span className="date">{matches(r.keyword)} matches</span>
          <div className="merchant"><b>"{r.keyword}"</b><small><i style={{ background: CAT_COLORS[r.category] || CAT_COLORS.Other }} />{r.category}</small></div>
          <span className="account" />
          <button className="link-btn" onClick={() => setRules(rules.filter((x) => x.keyword !== r.keyword))}>remove</button>
        </div>)}</div>}
    </Panel>
  </div>;
}

const GOAL_COLORS = ['#14b8a6', '#f97316', '#ef4444', '#f59e0b', '#0ea5e9', '#8b5cf6'];

function Goals({ all }) {
  const [goals, setGoals] = useState(() => { try { const g = JSON.parse(localStorage.getItem('of_goals_v1') || '[]'); return Array.isArray(g) ? g : []; } catch { return []; } });
  const [month, setMonth] = useState(months(all)[0] || 'this-month');
  const txs = filterByDate(all, month);
  const persist = (next) => { setGoals(next); localStorage.setItem('of_goals_v1', JSON.stringify(next)); };
  const actual = (g) => g.type === 'category'
    ? sum(expenses(txs).filter((t) => t.category === g.category), (t) => Math.abs(t.amount))
    : sum(expenses(txs).filter((t) => (g.keywords || []).some((k) => (t.merchant || '').toLowerCase().includes(k))), (t) => Math.abs(t.amount));
  const addGoal = () => {
    const label = prompt('Goal name (e.g. "Food budget"):');
    if (!label) return;
    const catsAvail = [...new Set(expenses(all).map((t) => t.category))].sort().join(', ');
    const category = prompt(`Track which category? One of:\n${catsAvail}\n\n(or leave blank to track a merchant keyword instead)`);
    let goal;
    if (category && category.trim()) goal = { id: `g${goals.length}-${label}`, label, type: 'category', category: category.trim() };
    else {
      const kw = prompt('Merchant keyword to track (e.g. "netflix"):');
      if (!kw) return;
      goal = { id: `g${goals.length}-${label}`, label, type: 'keyword', keywords: [kw.toLowerCase()] };
    }
    const target = Number(prompt('Monthly budget target ($):', '100'));
    if (!Number.isFinite(target) || target <= 0) return;
    persist([...goals, { ...goal, target, color: GOAL_COLORS[goals.length % GOAL_COLORS.length] }]);
  };
  const edit = (g) => {
    const raw = prompt(`Monthly target for "${g.label}" ($) — or type "delete" to remove:`, g.target);
    if (raw === null) return;
    if (String(raw).trim().toLowerCase() === 'delete') return persist(goals.filter((item) => item.id !== g.id));
    const value = Number(raw);
    if (!Number.isFinite(value) || value < 0) return;
    persist(goals.map((item) => item.id === g.id ? { ...item, target: value } : item));
  };
  return <div className="view"><section className="goal-head"><div><h1>Monthly Goals</h1><p>Budgets per category or merchant. Saved in this browser.</p></div><div className="goal-controls"><select value={month} onChange={(e) => setMonth(e.target.value)}>{months(all).slice(0, 18).map((m) => <option key={m} value={m}>{labelFor(m)}</option>)}</select><button className="add-btn" onClick={addGoal}>+ Add goal</button></div></section><div className="stats small"><Stat label="Income" value={dollar(sum(income(txs), (t) => t.amount))} note={labelFor(month)} tone="green" /><Stat label="Spent" value={dollar(sum(expenses(txs), (t) => Math.abs(t.amount)))} note="total expenses" tone="red" /><Stat label="Net Cash Flow" value={`${sum(income(txs), (t) => t.amount) - sum(expenses(txs), (t) => Math.abs(t.amount)) >= 0 ? '+' : '-'}${dollar(Math.abs(sum(income(txs), (t) => t.amount) - sum(expenses(txs), (t) => Math.abs(t.amount))))}`} note="income minus expenses" /></div><Panel title="Goal Tracker">{!goals.length ? <div className="empty">No goals yet. Click "+ Add goal" to set a budget for any category or merchant.</div> : <div className="goals">{goals.map((g) => { const value = actual(g); const pct = g.target > 0 ? Math.min(100, value / g.target * 100) : 0; return <div key={g.id} className="goal"><div><i style={{ background: g.color }} /><b>{g.label}</b></div><button onClick={() => edit(g)}>Target {dollar(g.target)}</button><strong className={value > g.target ? 'bad' : ''}>{dollar(value)}</strong><span><em style={{ width: `${pct}%`, background: value > g.target ? '#ef4444' : g.color }} /></span></div>; })}</div>}</Panel></div>;
}

// Stable id from the filename so re-importing an updated export replaces the
// old one and per-transaction category overrides keep pointing at real rows.
const fileId = (name) => `f-${name.toLowerCase().replace(/\.csv$/, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}`;

function ImportView({ files, setFiles, saveError }) {
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);
  const addFiles = async (fileList) => {
    const added = await Promise.all([...fileList].filter((f) => /\.csv$/i.test(f.name)).map(async (f) => ({ id: fileId(f.name), name: f.name, text: await f.text() })));
    if (added.length) setFiles([...files.filter((f) => !f.demo && !added.some((a) => a.id === f.id)), ...added]);
  };
  const loadDemo = () => setFiles(demoFiles().map((f) => ({ ...f, demo: true })));
  const { accounts, transactions } = useMemo(() => parseAll(files), [files]);
  return <div className="view">
    <div
      className={`dropzone ${dragging ? 'dragging' : ''}`}
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => { e.preventDefault(); setDragging(false); addFiles(e.dataTransfer.files); }}
      onClick={() => inputRef.current?.click()}
    >
      <Icon name="upload" />
      <b>Drop bank CSV exports here</b>
      <p>or click to browse. Apple Card, Chase, Elan, and credit-union formats are auto-detected; any CSV with date + amount columns works too.</p>
      <input ref={inputRef} type="file" accept=".csv" multiple hidden onChange={(e) => { addFiles(e.target.files); e.target.value = ''; }} />
    </div>
    <p className="privacy-banner">🔒 Everything is parsed and stored in <b>your browser only</b> — no server, no upload, no tracking. Clearing site data removes it completely.</p>
    {saveError && <p className="save-error">{saveError}</p>}
    {files.length > 0 && <Panel title={`${files.length} Imported ${files.length === 1 ? 'File' : 'Files'} · ${transactions.length.toLocaleString()} transactions`} action={<button onClick={() => setFiles([])}>Remove all</button>}>
      <div className="tx-list">{files.map((f) => {
        const acct = accounts.find((a) => a.id === f.id);
        const count = transactions.filter((t) => t.account === f.id).length;
        return <div className="tx" key={f.id}>
          <span className="date">{acct?.bank || ''}</span>
          <div className="merchant"><b>{acct?.name || f.name}</b><small><i style={{ background: acct?.color || '#94a3b8' }} />{f.name}{f.local ? ' (local folder)' : ''}{f.demo ? ' (demo)' : ''}</small></div>
          <span className="account">{count.toLocaleString()} transactions</span>
          {!f.local && <button className="link-btn" onClick={() => setFiles(files.filter((x) => x.id !== f.id))}>remove</button>}
        </div>;
      })}</div>
    </Panel>}
    {!files.length && <Panel title="No data yet"><div className="empty-actions"><p>Export CSVs from your bank's website, drop them above, and every view lights up. Or take a look around first:</p><button className="add-btn" onClick={loadDemo}>Load demo data</button></div></Panel>}
  </div>;
}

export default function App() {
  const [view, setView] = useState('dashboard');
  const [filter, setFilter] = useState('ytd');
  const [files, setFilesRaw] = useState(loadStoredFiles);
  const [saveError, setSaveError] = useState(null);
  const [txFilters, setTxFiltersValue] = useState({ search: '', account: '', category: '', type: '' });
  useEffect(() => {
    if (files.length) return;
    loadLocalManifest().then((local) => { if (local?.length) setFilesRaw((prev) => (prev.length ? prev : local)); });
  }, []);
  const setFiles = (next) => { setFilesRaw(next); setSaveError(saveStoredFiles(next)); };
  const [catOverrides, setCatOverrides] = useState(loadCategoryOverrides);
  const [rules, setRulesRaw] = useState(loadRules);
  const setRules = (next) => { setRulesRaw(next); saveRules(next); };
  const categorize = (id, category) => setCatOverrides((prev) => {
    const next = { ...prev, [id]: category };
    saveCategoryOverrides(next);
    return next;
  });
  const data = useMemo(() => parseAll(files), [files]);
  // User re-categorizations layer over the parsed data. Precedence: manual
  // override > custom rule > parser guess. Type follows category so totals
  // (income/expenses/investments) stay consistent.
  const transactions = useMemo(() => {
    if (!Object.keys(catOverrides).length && !rules.length) return data.transactions;
    return data.transactions.map((t) => {
      const rule = rules.find((r) => (t.merchant || '').toLowerCase().includes(r.keyword));
      const c = catOverrides[t.id] || rule?.category;
      if (!c || c === t.category) return t;
      let type = t.type;
      if (c === 'Income') type = 'income';
      else if (c === 'Payment/Transfer') type = 'payment';
      else if (c === 'Investments') type = 'investment';
      else if (t.amount < 0) type = 'expense';
      return { ...t, category: c, type };
    });
  }, [data.transactions, catOverrides, rules]);
  const filtered = useMemo(() => filterByDate(transactions, filter), [transactions, filter]);
  const monthList = useMemo(() => months(transactions), [transactions]);
  const setTxFilters = (patch) => setTxFiltersValue((prev) => ({ ...prev, ...patch }));
  const status = files.length ? `${transactions.length.toLocaleString()} transactions · ${data.accounts.length} accounts` : 'No data imported yet';
  const custom = filter.startsWith('custom:') ? filter.split(':') : null;
  const setCustom = (from, to) => setFilter(from || to ? `custom:${from || ''}:${to || ''}` : 'ytd');
  const showEmpty = !files.length && view !== 'import';
  return <div className="app"><Sidebar view={view} setView={setView} status={status} /><main><header className="top"><div><h1>{VIEWS.find(([id]) => id === view)?.[1]}</h1><p>Private by design — all analysis happens in your browser</p></div><div className="range-controls"><select value={custom ? 'custom' : filter} onChange={(e) => { if (e.target.value !== 'custom') setFilter(e.target.value); }}><option value="all">All Time</option><option value="this-month">This Month</option><option value="last-month">Last Month</option><option value="last-3">Last 3 Months</option><option value="last-6">Last 6 Months</option><option value="ytd">Year to Date</option>{custom && <option value="custom">{labelFor(filter)}</option>}<optgroup label="By Month">{monthList.map((m) => <option key={m} value={m}>{labelFor(m)}</option>)}</optgroup></select><label className="date-input">From <input type="date" value={custom?.[1] || ''} onChange={(e) => setCustom(e.target.value, custom?.[2] || '')} /></label><label className="date-input">To <input type="date" value={custom?.[2] || ''} onChange={(e) => setCustom(custom?.[1] || '', e.target.value)} /></label></div></header><div className="content">
    {showEmpty && <div className="welcome"><h2>Welcome to OpenFinance</h2><p>A private, local-first personal finance dashboard. Import your bank CSV exports — nothing ever leaves your browser.</p><button className="add-btn" onClick={() => setView('import')}>Import your data</button></div>}
    {!showEmpty && view === 'dashboard' && <Dashboard all={transactions} rows={filtered} balances={data.balances} accounts={data.accounts} setView={setView} setFilter={setFilter} setTxFilters={setTxFilters} filter={filter} />}
    {!showEmpty && view === 'transactions' && <Transactions rows={filtered} filters={txFilters} setFilters={setTxFilters} accounts={data.accounts} onCategorize={categorize} />}
    {!showEmpty && view === 'categories' && <Categories rows={filtered} setView={setView} setTxFilters={setTxFilters} />}
    {!showEmpty && view === 'recurring' && <Recurring all={transactions} setView={setView} setTxFilters={setTxFilters} />}
    {!showEmpty && view === 'cashflow' && <CashFlow rows={filtered} filter={filter} setView={setView} setTxFilters={setTxFilters} />}
    {!showEmpty && view === 'networth' && <NetWorth history={data.balanceHistory} accounts={data.accounts} />}
    {!showEmpty && view === 'rules' && <Rules rules={rules} setRules={setRules} transactions={transactions} />}
    {!showEmpty && view === 'accounts' && <Accounts rows={filtered} balances={data.balances} accounts={data.accounts} />}
    {!showEmpty && view === 'income' && <IncomeView all={transactions} setView={setView} setTxFilters={setTxFilters} />}
    {!showEmpty && view === 'goals' && <Goals all={transactions} />}
    {view === 'import' && <ImportView files={files} setFiles={setFiles} saveError={saveError} />}
  </div></main></div>;
}
