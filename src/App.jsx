import { useEffect, useMemo, useRef, useState } from 'react';
import { BIZ_CAT_COLORS, CAT_COLORS, MONTH_NAMES, dollar, expenses, filterByDate, fmtDate, generateDemoData, income, loadFromFiles } from './lib/finance.js';
import { createSyncedStore } from './lib/sync.js';
import { loadStoredFiles, saveStoredFiles } from './lib/storage.js';

// 4th field tags which mode a view belongs to: 'shared' shows in both
// Personal and Business mode, otherwise it only shows in the matching mode.
const VIEWS = [
  ['dashboard', 'Dashboard', 'grid', 'personal'],
  ['transactions', 'Transactions', 'list', 'shared'],
  ['categories', 'Categories', 'pie', 'personal'],
  ['recurring', 'Recurring', 'repeat', 'personal'],
  ['cashflow', 'Cash Flow', 'flow', 'personal'],
  ['networth', 'Net Worth', 'trend', 'personal'],
  ['accounts', 'Accounts', 'card', 'shared'],
  ['income', 'Income & Savings', 'coin', 'personal'],
  ['goals', 'Goals', 'target', 'personal'],
  ['business', 'Business P&L', 'briefcase', 'business'],
  ['invoices', 'Invoicing', 'invoice', 'business'],
  ['rules', 'Rules', 'wand', 'shared'],
  ['import', 'Import Data', 'upload', 'shared'],
];

const DEFAULT_GOALS = [
  { id: 'food', label: 'Food & Dining', type: 'category', category: 'Food & Dining', target: 450, color: '#f97316' },
  { id: 'groceries', label: 'Groceries', type: 'category', category: 'Groceries', target: 500, color: '#22c55e' },
  { id: 'bills', label: 'Bills & Utilities', type: 'category', category: 'Bills & Utilities', target: 1500, color: '#ef4444' },
  { id: 'entertainment', label: 'Entertainment', type: 'category', category: 'Entertainment', target: 120, color: '#ec4899' },
  { id: 'subscriptions', label: 'Subscriptions', type: 'keyword', keywords: ['netflix', 'spotify', 'github', 'icloud'], target: 80, color: '#8b5cf6' },
];

const PUBLIC_VIEWS = new Set(['import', 'invoices']);

const sum = (rows, fn) => rows.reduce((total, row) => total + fn(row), 0);
const cats = (rows) => {
  const map = new Map();
  expenses(rows).filter((t) => !['Income', 'Payment/Transfer'].includes(t.category)).forEach((t) => {
    map.set(t.category, (map.get(t.category) || 0) + Math.abs(t.amount));
  });
  return [...map.entries()].sort((a, b) => b[1] - a[1]);
};
const months = (rows) => [...new Set(rows.filter((t) => t.date).map((t) => `${t.date.getFullYear()}-${String(t.date.getMonth() + 1).padStart(2, '0')}`))].sort().reverse();
const isCashWithdrawal = (t) => {
  const text = `${t.merchant || ''} ${t.rawCategory || ''} ${t.sourceType || ''}`.toLowerCase();
  return t.amount < 0 && (
    text.includes('atm withdrawal') ||
    text.includes('cash withdrawal') ||
    text.includes('atm/cash withdrawals') ||
    text.includes('atm/cash') ||
    (text.includes('desert financial credit union') && text.includes('atm'))
  );
};

function loadJson(key, fallback) {
  try {
    const parsed = JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback));
    return parsed && typeof parsed === 'object' ? parsed : fallback;
  } catch {
    return fallback;
  }
}

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
    const amounts = txs.map((t) => Math.abs(t.amount));
    const avg = sum(amounts.map((a) => [a]), (a) => a[0]) / amounts.length;
    if (!avg || Math.max(...amounts.map((a) => Math.abs(a - avg))) / avg > 0.15) continue;
    subs.push({ merchant: txs[0].merchant, category: txs[0].category, monthly: avg, count: txs.length, months: monthSet.size, last: txs[0].date });
  }
  return subs.sort((a, b) => b.monthly - a.monthly);
}

const labelFor = (filter) => {
  const now = new Date();
  if (filter.startsWith('custom:')) {
    const [, s, e] = filter.split(':');
    const f = (iso) => (iso ? fmtDate(new Date(`${iso}T12:00:00`)) : '...');
    return `${f(s)} - ${f(e)}`;
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

function Icon({ name }) {
  const paths = {
    grid: <><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></>,
    list: <><path d="M4 6h16M4 12h16M4 18h16" /></>,
    pie: <><path d="M11 3a9 9 0 1 0 9 10h-9z" /><path d="M15 3.5V9h5.5A9 9 0 0 0 15 3.5z" /></>,
    card: <><rect x="3" y="5" width="18" height="14" rx="3" /><path d="M3 10h18M7 15h2M12 15h2" /></>,
    coin: <><circle cx="12" cy="12" r="9" /><path d="M12 7v10M9 10c0-1.2 1.3-2 3-2s3 .8 3 2-1.3 2-3 2-3 .8-3 2 1.3 2 3 2 3-.8 3-2" /></>,
    target: <><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1" /></>,
    repeat: <><path d="M17 2l4 4-4 4" /><path d="M3 11V9a4 4 0 0 1 4-4h14" /><path d="M7 22l-4-4 4-4" /><path d="M21 13v2a4 4 0 0 1-4 4H3" /></>,
    trend: <><path d="M3 17l6-6 4 4 8-8" /><path d="M15 7h6v6" /></>,
    flow: <><path d="M4 6h4c4 0 4 6 8 6h4" /><path d="M4 12h4" /><path d="M4 18h4c4 0 4-6 8-6" /><path d="M17 3l4 3-4 3M17 15l4 3-4 3" /></>,
    wand: <><path d="M15 4V2m0 14v-2m-7-7H6m14 0h-2m-1.8-4.2l1.4-1.4M8.4 8.4L7 7m9.2 1.4l1.4-1.4M4 20l8-8" /></>,
    home: <><path d="M3 11l9-8 9 8" /><path d="M5 10v10h14V10" /><path d="M9 20v-6h6v6" /></>,
    upload: <><path d="M12 16V4m0 0l-4 4m4-4l4 4" /><path d="M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3" /></>,
    briefcase: <><rect x="3" y="7" width="18" height="13" rx="2" /><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /><path d="M3 12h18" /></>,
    invoice: <><path d="M7 3h8l4 4v14H7z" /><path d="M15 3v4h4" /><path d="M9 12h6M9 16h6M9 9h2" /></>,
  };
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>;
}

function Sidebar({ view, setView, status, mode, setMode }) {
  return <aside className="sidebar">
    <div className="brand"><img className="brand-mark" src="/favicon.svg" alt="" /><div><b>OpenFinance</b><small>Private, local-first finance</small></div></div>
    <div className="mode-toggle">
      <button className={mode === 'personal' ? 'active' : ''} onClick={() => setMode('personal')} type="button">Personal</button>
      <button className={mode === 'business' ? 'active' : ''} onClick={() => setMode('business')} type="button">Business</button>
    </div>
    <nav>{VIEWS.filter(([, , , tag]) => tag === 'shared' || tag === mode).map(([id, label, icon]) => <button key={id} className={view === id ? 'active' : ''} onClick={() => setView(id)}><Icon name={icon} /><span>{label}</span></button>)}</nav>
    <p>{status}</p>
  </aside>;
}

function Stat({ label, value, note, tone = 'blue', onClick }) {
  return <button className={`stat ${tone}`} onClick={onClick} type="button"><span>{label}</span><strong>{value}</strong><small>{note}</small></button>;
}

function Panel({ title, action, children }) {
  return <section className="panel"><header><h2>{title}</h2>{action}</header>{children}</section>;
}

function TransactionsList({ rows, rentOverrides = {}, onToggleRent, customizeMode = false, onCategorize, catColors = CAT_COLORS }) {
  if (!rows.length) return <div className="empty">No transactions for this period.</div>;
  const catOptions = Object.keys(catColors);
  return <div className="tx-list">{rows.map((t) => {
    const markedRent = Boolean(rentOverrides[t.id]);
    const canMarkRent = markedRent || isCashWithdrawal(t) || t.category === 'Cash Withdrawals';
    return <div className={`tx ${customizeMode ? 'editable' : ''}`} key={t.id}>
    <span className="date">{fmtDate(t.date)}</span>
    <div className="merchant"><b>{t.merchant || 'Unknown merchant'}</b><small><i style={{ background: markedRent ? '#ef4444' : catColors[t.category] || CAT_COLORS.Other }} />
      {customizeMode && onCategorize
        ? <select className="cat-select" title="Change category" value={t.category} onChange={(e) => onCategorize(t.id, e.target.value)}>{(catOptions.includes(t.category) ? catOptions : [t.category, ...catOptions]).map((c) => <option key={c}>{c}</option>)}</select>
        : markedRent ? 'Rent' : t.category}
    </small></div>
    <span className="account">{t.accountName}</span>
    <strong className={t.amount < 0 ? 'bad' : 'good'}>{t.amount < 0 ? '-' : '+'}{dollar(t.amount)}</strong>
    {customizeMode && onToggleRent && canMarkRent ? <button className={markedRent ? 'rent-toggle active' : 'rent-toggle'} type="button" onClick={() => onToggleRent(t.id)}>{markedRent ? 'Rent' : 'Mark rent'}</button> : null}
  </div>;
  })}</div>;
}

function Bars({ rows, color = '#2563eb', onPick }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return <div className="bars">{rows.map((r) => <button key={r.label} onClick={() => onPick?.(r)} title={`${r.label}: ${dollar(r.value)}`}><strong>{dollar(r.value)}</strong><div><i style={{ height: `${Math.max(4, r.value / max * 100)}%`, background: color }} /></div><span>{r.label}</span></button>)}</div>;
}

function CategoryBars({ rows, catColors = CAT_COLORS }) {
  const total = rows.reduce((s, [, v]) => s + v, 0) || 1;
  return <div className="cat-bars">{rows.map(([cat, amount]) => <div key={cat} className="cat-row"><div><i style={{ background: catColors[cat] || CAT_COLORS.Other }} /><b>{cat}</b></div><strong>{dollar(amount)}</strong><span><em style={{ width: `${amount / total * 100}%`, background: catColors[cat] || CAT_COLORS.Other }} /></span></div>)}</div>;
}

function downloadCsv(filename, rows) {
  const csv = rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function bizCats(rows) {
  const map = new Map();
  expenses(rows).filter((t) => t.category !== 'Owner Draw/Transfer').forEach((t) => {
    map.set(t.category, (map.get(t.category) || 0) + Math.abs(t.amount));
  });
  return [...map.entries()].sort((a, b) => b[1] - a[1]);
}

const BIZ_CATEGORY_SET = new Set(Object.keys(BIZ_CAT_COLORS));
const needsTaxCategory = (t) => !BIZ_CATEGORY_SET.has(t.category);

function Business({ rows, all, filter, taxRate, setTaxRate, setView, setTxFilters, hasBizAccounts, onCategorize }) {
  if (!hasBizAccounts) return <div className="view"><Panel title="Business P&L"><div className="empty">No accounts marked as Business yet. Go to Accounts and mark your business bank or card, then come back here.</div></Panel></div>;
  const exp = expenses(rows).filter((t) => t.category !== 'Owner Draw/Transfer');
  const inc = income(rows);
  const totalIncome = sum(inc, (t) => t.amount);
  const totalExpenses = sum(exp, (t) => Math.abs(t.amount));
  const netProfit = totalIncome - totalExpenses;
  const catRows = bizCats(rows);
  const setAside = netProfit > 0 ? netProfit * taxRate / 100 : 0;
  const uncategorized = all.filter(needsTaxCategory).sort((a, b) => b.date - a.date);
  const exportCsv = () => {
    const lines = [['Category', 'Amount']];
    lines.push(['Business Income', totalIncome.toFixed(2)]);
    catRows.forEach(([c, v]) => lines.push([c, (-v).toFixed(2)]));
    lines.push(['Net Profit', netProfit.toFixed(2)]);
    downloadCsv(`business-pl-${labelFor(filter).replace(/\s+/g, '-').toLowerCase()}.csv`, lines);
  };
  return <div className="view">
    <div className="stats">
      <Stat label="Business Income" value={dollar(totalIncome)} note={labelFor(filter)} tone="green" onClick={() => { setTxFilters({ search: '', account: '', category: '', type: 'income' }); setView('transactions'); }} />
      <Stat label="Business Expenses" value={dollar(totalExpenses)} note={labelFor(filter)} tone="red" onClick={() => { setTxFilters({ search: '', account: '', category: '', type: 'expense' }); setView('transactions'); }} />
      <Stat label="Net Profit" value={`${netProfit >= 0 ? '+' : '-'}${dollar(Math.abs(netProfit))}`} note="income minus expenses" tone={netProfit >= 0 ? 'green' : 'red'} />
      <Stat label="Est. Tax Set-Aside" value={dollar(setAside)} note={`${taxRate}% of net profit`} tone="purple" />
      <Stat label="Needs a Tax Category" value={String(uncategorized.length)} note="across all time" tone={uncategorized.length ? 'red' : 'green'} />
    </div>
    {uncategorized.length > 0 && <Panel title={`Needs a Tax Category (${uncategorized.length})`}>
      <p className="save-error">These business transactions still have their original bank category instead of a tax category, so they're left out of the P&L totals below. Assign one to each — it updates live.</p>
      <TransactionsList rows={uncategorized.slice(0, 30)} customizeMode onCategorize={onCategorize} catColors={BIZ_CAT_COLORS} />
      {uncategorized.length > 30 && <p className="save-error">+ {uncategorized.length - 30} more - open Transactions to work through the rest.</p>}
    </Panel>}
    <Panel title="Tax Set-Aside Rate" action={<button className="link-btn" type="button" onClick={exportCsv}>Export P&L CSV</button>}>
      <div className="rule-form">
        <label>Set aside</label>
        <input type="number" min="0" max="60" value={taxRate} onChange={(e) => setTaxRate(Math.max(0, Math.min(60, Number(e.target.value) || 0)))} style={{ width: '4.5rem' }} />
        <span>% of net profit for federal / state / self-employment tax</span>
      </div>
    </Panel>
    <Panel title={`Profit & Loss by Category - ${labelFor(filter)}`}>{!catRows.length ? <div className="empty">No categorized business expenses yet. Assign tax categories to your business charges above.</div> : <CategoryBars rows={catRows} catColors={BIZ_CAT_COLORS} />}</Panel>
  </div>;
}

function Invoices({ invoices, addInvoice, updateInvoice, deleteInvoice }) {
  const today = new Date().toISOString().slice(0, 10);
  const [form, setForm] = useState({ client: '', description: '', amount: '', issueDate: today, dueDate: '' });
  const submit = (e) => {
    e.preventDefault();
    const amount = Number(form.amount);
    if (!form.client.trim() || !amount) return;
    addInvoice({ id: `inv-${Date.now()}`, client: form.client.trim(), description: form.description.trim(), amount, issueDate: form.issueDate, dueDate: form.dueDate, status: 'unpaid', paidDate: null });
    setForm({ client: '', description: '', amount: '', issueDate: today, dueDate: '' });
  };
  const outstanding = sum(invoices.filter((i) => i.status !== 'paid'), (i) => i.amount);
  const paidYtd = sum(invoices.filter((i) => i.status === 'paid' && i.paidDate?.slice(0, 4) === String(new Date().getFullYear())), (i) => i.amount);
  const overdue = invoices.filter((i) => i.status !== 'paid' && i.dueDate && i.dueDate < today);
  return <div className="view">
    <div className="stats small">
      <Stat label="Outstanding" value={dollar(outstanding)} note={`${invoices.filter((i) => i.status !== 'paid').length} unpaid`} tone="red" />
      <Stat label="Paid YTD" value={dollar(paidYtd)} note={String(new Date().getFullYear())} tone="green" />
      <Stat label="Overdue" value={String(overdue.length)} note="past due date" tone={overdue.length ? 'red' : 'blue'} />
    </div>
    <Panel title="New Invoice">
      <form className="rule-form" onSubmit={submit}>
        <input placeholder="Client name" value={form.client} onChange={(e) => setForm({ ...form, client: e.target.value })} />
        <input placeholder="Description (optional)" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        <input type="number" step="0.01" min="0" placeholder="Amount" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} style={{ width: '7rem' }} />
        <label>Issued <input type="date" value={form.issueDate} onChange={(e) => setForm({ ...form, issueDate: e.target.value })} /></label>
        <label>Due <input type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} /></label>
        <button className="add-btn" type="submit" disabled={!form.client.trim() || !Number(form.amount)}>Add invoice</button>
      </form>
    </Panel>
    <Panel title={`${invoices.length} ${invoices.length === 1 ? 'Invoice' : 'Invoices'}`}>
      {!invoices.length ? <div className="empty">No invoices yet. Add one above to start tracking what clients owe you.</div> : <div className="tx-list">{[...invoices].sort((a, b) => (b.issueDate || '').localeCompare(a.issueDate || '')).map((inv) => {
        const isOverdue = inv.status !== 'paid' && inv.dueDate && inv.dueDate < today;
        return <div className="tx" key={inv.id}>
          <span className="date">{inv.issueDate}</span>
          <div className="merchant"><b>{inv.client}</b><small><i className={`invoice-status ${inv.status}${isOverdue ? ' overdue' : ''}`} />{inv.description || (isOverdue ? 'Overdue' : inv.status === 'paid' ? `Paid ${inv.paidDate}` : inv.dueDate ? `Due ${inv.dueDate}` : 'No due date')}</small></div>
          <span className="account invoice-actions">
            {inv.status === 'paid'
              ? <button className="link-btn" type="button" onClick={() => updateInvoice(inv.id, { status: 'unpaid', paidDate: null })}>Mark unpaid</button>
              : <button className="link-btn" type="button" onClick={() => updateInvoice(inv.id, { status: 'paid', paidDate: today })}>Mark paid</button>}
            <button className="link-btn" type="button" onClick={() => deleteInvoice(inv.id)}>delete</button>
          </span>
          <strong className={inv.status === 'paid' ? 'good' : isOverdue ? 'bad' : ''}>{dollar(inv.amount)}</strong>
        </div>;
      })}</div>}
    </Panel>
  </div>;
}

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
  const shades = ['#f1f5f9', '#fecaca', '#f87171', '#ef4444', '#991b1b'];
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
  return <div className="heatmap">{weeks.map((col, i) => <div className="hm-col" key={i}>{col.map((c) => <button key={c.iso} className="hm-cell" title={`${c.label}: ${dollar(c.value)}`} style={{ background: shades[level(c.value)] }} onClick={() => { setFilter(`custom:${c.iso}:${c.iso}`); setTxFilters({ search: '', account: '', category: '', type: 'expense' }); setView('transactions'); }} />)}</div>)}</div>;
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
  return <div className="view">
    <section className="hero"><div><span>Private command center</span><h1>Know where the money is moving.</h1><p>Spending, income, savings, and goals from CSV exports that stay in your browser.</p></div><div className="hero-grid"><div><small>Selected net</small><b className={net >= 0 ? 'good' : 'bad'}>{net >= 0 ? '+' : '-'}{dollar(Math.abs(net))}</b></div><div><small>Cash balance</small><b>{dollar(cash)}</b></div><div><small>Transactions</small><b>{rows.length.toLocaleString()}</b></div></div></section>
    <div className="stats">
      <Stat label="Income" value={dollar(sum(inc, (t) => t.amount))} note={labelFor(filter)} tone="green" onClick={() => { setTxFilters({ search: '', account: '', category: '', type: 'income' }); setView('transactions'); }} />
      <Stat label="Spent" value={dollar(sum(exp, (t) => Math.abs(t.amount)))} note={labelFor(filter)} tone="red" onClick={() => { setTxFilters({ search: '', account: '', category: '', type: 'expense' }); setView('transactions'); }} />
      <Stat label="This Month Spent" value={dollar(sum(expenses(filterByDate(all, 'this-month')), (t) => Math.abs(t.amount)))} note="click to inspect" tone="red" onClick={() => { setFilter('this-month'); setTxFilters({ search: '', account: '', category: '', type: 'expense' }); setView('transactions'); }} />
      <Stat label="Top Category" value={top?.[0] || 'None'} note={top ? `${dollar(top[1])} spent` : 'by spending'} onClick={() => { if (top) { setTxFilters({ search: '', account: '', category: top[0], type: 'expense' }); setView('transactions'); } }} />
    </div>
    <div className="grid-main"><Panel title="Monthly Spending"><Bars rows={monthly} onPick={(r) => { setFilter(r.key); setTxFilters({ search: '', account: '', category: '', type: '' }); setView('transactions'); }} /></Panel><Panel title="By Category"><CategoryBars rows={categoryRows.slice(0, 8)} /></Panel></div>
    <Panel title="Daily Spending - Last 6 Months"><Heatmap all={all} setFilter={setFilter} setTxFilters={setTxFilters} setView={setView} /></Panel>
    <Panel title="Recent Transactions" action={<button onClick={() => setView('transactions')}>View all</button>}><TransactionsList rows={rows.slice(0, 12)} /></Panel>
  </div>;
}

function Transactions({ rows, filters, setFilters, accounts, rentOverrides, onToggleRent, onCategorize, catColors = CAT_COLORS }) {
  const [page, setPage] = useState(0);
  const [customizeMode, setCustomizeMode] = useState(false);
  const filtered = rows.filter((t) => (!filters.search || (t.merchant || '').toLowerCase().includes(filters.search.toLowerCase())) && (!filters.account || t.account === filters.account) && (!filters.category || t.category === filters.category) && (!filters.type || (filters.type === 'withdrawal' ? isCashWithdrawal(t) || t.category === 'Cash Withdrawals' : t.type === filters.type)));
  const catsList = [...new Set(rows.map((t) => t.category))].sort();
  const pageRows = filtered.slice(page * 50, page * 50 + 50);
  useEffect(() => setPage(0), [filters, rows]);
  return <div className="view"><section className="filters"><input placeholder="Search merchant..." value={filters.search} onChange={(e) => setFilters({ search: e.target.value })} /><select value={filters.account} onChange={(e) => setFilters({ account: e.target.value })}><option value="">All Accounts</option>{accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</select><select value={filters.category} onChange={(e) => setFilters({ category: e.target.value })}><option value="">All Categories</option>{catsList.map((c) => <option key={c}>{c}</option>)}</select><select value={filters.type} onChange={(e) => setFilters({ type: e.target.value })}><option value="">All Types</option><option value="expense">Expenses</option><option value="withdrawal">Withdrawals</option><option value="income">Income</option><option value="investment">Investments</option><option value="payment">Payments</option></select></section><Panel title={`${filtered.length.toLocaleString()} Transactions`} action={<button className={customizeMode ? 'customize-toggle active' : 'customize-toggle'} onClick={() => setCustomizeMode(!customizeMode)}>{customizeMode ? 'Done' : 'Customize'}</button>}><TransactionsList rows={pageRows} rentOverrides={rentOverrides} onToggleRent={onToggleRent} customizeMode={customizeMode} onCategorize={onCategorize} catColors={catColors} /><div className="pager"><span>Page {page + 1} of {Math.max(1, Math.ceil(filtered.length / 50))}</span><div><button disabled={page === 0} onClick={() => setPage(page - 1)}>Prev</button><button disabled={page >= Math.ceil(filtered.length / 50) - 1} onClick={() => setPage(page + 1)}>Next</button></div></div></Panel></div>;
}

function Categories({ rows, setView, setTxFilters }) {
  const categoryRows = cats(rows);
  const total = categoryRows.reduce((s, [, v]) => s + v, 0) || 1;
  const exp = expenses(rows);
  return <div className="category-view">
    <section className="category-summary">
      <div>
        <h1>Spending Categories</h1>
        <p>Click any category to inspect its transactions for the selected period.</p>
      </div>
      <div>
        <span>Total categorized spending</span>
        <strong>{dollar(total)}</strong>
      </div>
    </section>
    <div className="category-grid">
      {categoryRows.map(([cat, amount]) => {
        const color = CAT_COLORS[cat] || CAT_COLORS.Other;
        const pct = amount / total * 100;
        const count = exp.filter((t) => t.category === cat).length;
        return <button className="category-card" key={cat} onClick={() => { setTxFilters({ search: '', account: '', category: cat, type: 'expense' }); setView('transactions'); }}>
          <div className="category-card-top">
            <span className="category-dot" style={{ background: color }} />
            <b>{cat}</b>
            <span className="category-percent">{pct.toFixed(1)}%</span>
          </div>
          <div className="category-card-main">
            <strong>{dollar(amount)}</strong>
            <small>{count} {count === 1 ? 'transaction' : 'transactions'}</small>
          </div>
          <div className="category-progress" aria-hidden="true">
            <span style={{ width: `${pct}%`, background: color }} />
          </div>
        </button>;
      })}
    </div>
  </div>;
}

function Accounts({ rows, balances, accounts, bizAccounts = {}, onToggleBiz }) {
  return <div className="accounts">{accounts.map((a) => { const txs = rows.filter((t) => t.account === a.id); const spent = sum(expenses(txs), (t) => Math.abs(t.amount)); const earned = sum(income(txs), (t) => Math.abs(t.amount)); const isBiz = Boolean(bizAccounts[a.id]); return <Panel key={a.id} title={a.name} action={onToggleBiz ? <button className={isBiz ? 'biz-toggle active' : 'biz-toggle'} type="button" onClick={() => onToggleBiz(a.id)}>{isBiz ? 'Business' : 'Mark as Business'}</button> : null}><div className="acct" style={{ borderColor: a.color }}><div><b>{balances[a.id] !== undefined ? dollar(balances[a.id]) : `-${dollar(spent)}`}</b><small>{a.bank} - {a.type.replace('_', ' ')}</small></div><p><span className="good">+{dollar(earned)} in</span><span className="bad">-{dollar(spent)} out</span></p></div><TransactionsList rows={txs.slice(0, 5)} catColors={isBiz ? BIZ_CAT_COLORS : CAT_COLORS} /></Panel>; })}</div>;
}

function Income({ all, setView, setTxFilters }) {
  const monthRows = months(all).slice(0, 13).map((key) => { const txs = filterByDate(all, key); return { key, inc: sum(income(txs), (t) => t.amount), exp: sum(expenses(txs), (t) => Math.abs(t.amount)), inv: sum(txs.filter((t) => t.type === 'investment'), (t) => Math.abs(t.amount)) }; });
  const invested = all.filter((t) => t.type === 'investment');
  return <div className="view"><div className="stats"><Stat label="YTD Income" value={dollar(sum(income(filterByDate(all, 'ytd')), (t) => t.amount))} note={String(new Date().getFullYear())} tone="green" /><Stat label="YTD Expenses" value={dollar(sum(expenses(filterByDate(all, 'ytd')), (t) => Math.abs(t.amount)))} note="cash out" tone="red" /><Stat label="Invested" value={dollar(sum(invested, (t) => Math.abs(t.amount)))} note="investment transfers" tone="purple" onClick={() => { setTxFilters({ search: '', account: '', category: '', type: 'investment' }); setView('transactions'); }} /><Stat label="Savings Rate" value={`${sum(income(filterByDate(all, 'ytd')), (t) => t.amount) ? Math.max(0, (sum(income(filterByDate(all, 'ytd')), (t) => t.amount) - sum(expenses(filterByDate(all, 'ytd')), (t) => Math.abs(t.amount))) / sum(income(filterByDate(all, 'ytd')), (t) => t.amount) * 100).toFixed(0) : 0}%`} note="year to date" tone="green" /></div><Panel title="Monthly Breakdown"><div className="table"><div><b>Month</b><b>Income</b><b>Expenses</b><b>Invested</b><b>Net</b></div>{monthRows.map((r) => <div key={r.key}><span>{labelFor(r.key)}</span><span className="good">{r.inc ? dollar(r.inc) : '-'}</span><span className="bad">{r.exp ? `-${dollar(r.exp)}` : '-'}</span><span className="purple">{r.inv ? `-${dollar(r.inv)}` : '-'}</span><span className={r.inc - r.exp >= 0 ? 'good' : 'bad'}>{r.inc - r.exp >= 0 ? '+' : '-'}{dollar(Math.abs(r.inc - r.exp))}</span></div>)}</div></Panel></div>;
}

function Recurring({ all, setView, setTxFilters }) {
  const subs = detectRecurring(all);
  const total = sum(subs, (s) => s.monthly);
  return <div className="view">
    <div className="stats small"><Stat label="Recurring charges" value={String(subs.length)} note="detected subscriptions" /><Stat label="Monthly total" value={dollar(total)} note="estimated" tone="red" /><Stat label="Yearly cost" value={dollar(total * 12)} note="if nothing changes" tone="red" /></div>
    <Panel title="Likely Subscriptions & Recurring Bills">{!subs.length ? <div className="empty">Nothing recurring detected yet. Needs 3+ months of similar charges from the same merchant.</div> : <div className="tx-list">{subs.map((s) => <div className="tx" key={s.merchant}><span className="date">{fmtDate(s.last)}</span><div className="merchant"><b>{s.merchant}</b><small><i style={{ background: CAT_COLORS[s.category] || CAT_COLORS.Other }} />{s.category} - seen {s.count}x over {s.months} months</small></div><button className="link-btn" onClick={() => { setTxFilters({ search: s.merchant.slice(0, 12), account: '', category: '', type: '' }); setView('transactions'); }}>view charges</button><strong className="bad">-{dollar(s.monthly)}/mo</strong></div>)}</div>}</Panel>
  </div>;
}

function CashFlow({ rows, filter, setView, setTxFilters }) {
  const inc = sum(income(rows), (t) => t.amount);
  const catRows = cats(rows);
  const spent = catRows.reduce((s, [, v]) => s + v, 0);
  if (!spent && !inc) return <div className="view"><Panel title="Cash Flow"><div className="empty">No cash-flow activity in this period.</div></Panel></div>;
  const top = catRows.slice(0, 9);
  const rest = catRows.slice(9).reduce((s, [, v]) => s + v, 0);
  const right = top.map(([cat, val]) => ({ label: cat, val, color: CAT_COLORS[cat] || CAT_COLORS.Other, cat }));
  if (rest > 0) right.push({ label: 'Other categories', val: rest, color: CAT_COLORS.Other });
  const savings = inc - spent;
  if (inc > 0 && savings > 0) right.push({ label: 'Saved', val: savings, color: '#10b981' });
  const total = right.reduce((s, r) => s + r.val, 0);
  const gap = 10, width = 760, leftX = 150, rightX = width - 210, node = 14;
  const height = Math.max(280, right.length * 46);
  const scale = (height - gap * (right.length - 1)) / total;
  let leftY = (height - total * scale) / 2, rightY = 0;
  const ribbons = right.map((r) => { const h = r.val * scale; const rib = { ...r, ly0: leftY, ly1: leftY + h, ry0: rightY, ry1: rightY + h }; leftY += h; rightY += h + gap; return rib; });
  const mid = (leftX + node + rightX) / 2;
  const pick = (r) => { if (r.cat) { setTxFilters({ search: '', account: '', category: r.cat, type: 'expense' }); setView('transactions'); } };
  return <div className="view">
    <div className="stats small"><Stat label={inc > 0 ? 'Income' : 'Total spent'} value={dollar(inc > 0 ? inc : spent)} note={labelFor(filter)} tone={inc > 0 ? 'green' : 'red'} /><Stat label="Spent" value={dollar(spent)} note={inc > 0 ? `${(spent / inc * 100).toFixed(0)}% of income` : 'all categories'} tone="red" /><Stat label="Saved" value={inc > 0 ? dollar(Math.max(0, savings)) : '-'} note={inc > 0 && savings > 0 ? `${(savings / inc * 100).toFixed(0)}% savings rate` : inc > 0 ? 'spent more than earned' : 'no income data'} tone={savings >= 0 ? 'green' : 'red'} /></div>
    <Panel title={`Where the Money Went - ${labelFor(filter)}`}><div className="sankey-wrap"><svg viewBox={`0 0 ${width} ${height}`} className="sankey"><rect x={leftX} y={(height - total * scale) / 2} width={node} height={total * scale} rx="4" fill="#334155" /><text x={leftX - 10} y={height / 2} textAnchor="end" className="sankey-label-main">{inc > 0 ? 'Income' : 'Spending'}</text>{ribbons.map((r) => <g key={r.label} className={r.cat ? 'sankey-flow clickable' : 'sankey-flow'} onClick={() => pick(r)}><path d={`M ${leftX + node} ${r.ly0} C ${mid} ${r.ly0} ${mid} ${r.ry0} ${rightX} ${r.ry0} L ${rightX} ${r.ry1} C ${mid} ${r.ry1} ${mid} ${r.ly1} ${leftX + node} ${r.ly1} Z`} fill={r.color} opacity="0.45" /><rect x={rightX} y={r.ry0} width={node} height={Math.max(2, r.ry1 - r.ry0)} rx="3" fill={r.color} /><text x={rightX + node + 8} y={(r.ry0 + r.ry1) / 2 + 4} className="sankey-label">{r.label} - {dollar(r.val)}</text></g>)}</svg></div></Panel>
  </div>;
}

function NetWorth({ history, accounts }) {
  const tracked = accounts.filter((a) => history?.[a.id] && Object.keys(history[a.id]).length);
  if (!tracked.length) return <div className="view"><Panel title="Net Worth"><div className="empty">No balance history yet. Net worth needs statements with a running Balance column.</div></Panel></div>;
  const allMonths = [...new Set(tracked.flatMap((a) => Object.keys(history[a.id])))].sort();
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
  return <div className="view"><div className="stats small"><Stat label="Current net cash" value={dollar(current)} note={`across ${tracked.length} tracked accounts`} tone={current >= 0 ? 'green' : 'red'} /><Stat label="1-month change" value={change === null ? '-' : `${change >= 0 ? '+' : '-'}${dollar(Math.abs(change))}`} note="vs. prior month-end" tone={change === null || change >= 0 ? 'green' : 'red'} /><Stat label="Months tracked" value={String(series.length)} note="from statement balances" /></div><Panel title="Month-End Net Cash"><Bars rows={recent.map((r) => ({ ...r, value: Math.abs(r.value) }))} color="#14b8a6" /></Panel><Panel title="By Account (latest month-end)"><div className="tx-list">{tracked.map((a) => { const ms = Object.keys(history[a.id]).sort(); const last = ms[ms.length - 1]; const bal = history[a.id][last]; return <div className="tx" key={a.id}><span className="date">{last}</span><div className="merchant"><b>{a.name}</b><small><i style={{ background: a.color }} />{a.type.replace('_', ' ')}</small></div><span className="account" /><strong className={a.type === 'credit_card' ? 'bad' : 'good'}>{a.type === 'credit_card' ? '-' : ''}{dollar(bal)}</strong></div>; })}</div></Panel></div>;
}

function Rules({ rules, setRules, transactions, catColors = CAT_COLORS }) {
  const [keyword, setKeyword] = useState('');
  const [category, setCategory] = useState(Object.keys(catColors)[0]);
  useEffect(() => { if (!Object.keys(catColors).includes(category)) setCategory(Object.keys(catColors)[0]); }, [catColors]);
  const matches = (kw) => transactions.filter((t) => (t.merchant || '').toLowerCase().includes(kw)).length;
  const add = (e) => {
    e.preventDefault();
    const kw = keyword.trim().toLowerCase();
    if (!kw) return;
    setRules([...rules.filter((r) => r.keyword !== kw), { keyword: kw, category }]);
    setKeyword('');
  };
  return <div className="view"><section className="goal-head"><div><h1>Categorization Rules</h1><p>Your rules run before built-in categories and apply to every statement row.</p></div></section><Panel title="Add a Rule"><form className="rule-form" onSubmit={add}><input placeholder='Merchant contains... (e.g. "costco")' value={keyword} onChange={(e) => setKeyword(e.target.value)} /><span>-&gt;</span><select value={category} onChange={(e) => setCategory(e.target.value)}>{Object.keys(catColors).map((c) => <option key={c}>{c}</option>)}</select><button className="add-btn" type="submit" disabled={!keyword.trim()}>Add rule</button>{keyword.trim() && <small>{matches(keyword.trim().toLowerCase())} matching transactions</small>}</form></Panel><Panel title={`${rules.length} Active ${rules.length === 1 ? 'Rule' : 'Rules'}`}>{!rules.length ? <div className="empty">No custom rules yet. Add one above to reclassify merchants automatically.</div> : <div className="tx-list">{rules.map((r) => <div className="tx" key={r.keyword}><span className="date">{matches(r.keyword)} matches</span><div className="merchant"><b>"{r.keyword}"</b><small><i style={{ background: catColors[r.category] || CAT_COLORS.Other }} />{r.category}</small></div><span className="account" /><button className="link-btn" onClick={() => setRules(rules.filter((x) => x.keyword !== r.keyword))}>remove</button></div>)}</div>}</Panel></div>;
}

function mortgagePayment(principal, annualRate, years = 30) {
  const monthly = annualRate / 100 / 12;
  const payments = years * 12;
  return principal * monthly * (1 + monthly) ** payments / ((1 + monthly) ** payments - 1);
}

function Affordability() {
  const priceChange = 22.6;
  const wageChange = 32.4;
  const oldPayment = mortgagePayment(100, 3.0);
  const newPayment = mortgagePayment(100 * (1 + priceChange / 100), 6.5);
  const paymentChange = (newPayment / oldPayment - 1) * 100;
  const rows = [
    { label: 'Regular gas', value: 46.9, tone: 'red' },
    { label: 'Avg hourly earnings', value: wageChange, tone: 'green' },
    { label: 'Rent', value: 32.3, tone: 'orange' },
    { label: 'Food', value: 31.8, tone: 'orange' },
    { label: 'Overall CPI', value: 28.9, tone: 'blue' },
    { label: 'Median new-home price', value: priceChange, tone: 'blue' },
    { label: '30-year mortgage payment on median new home', value: paymentChange, tone: 'purple', featured: true },
  ];
  const max = Math.max(...rows.map((r) => r.value));
  const samePricePaymentChange = (mortgagePayment(100, 6.5) / oldPayment - 1) * 100;
  return <div className="view">
    <section className="afford-hero">
      <div><span>Why homes still feel expensive</span><h1>The price is only part of the payment.</h1><p>Wages can outpace the sticker price of a new home, but mortgage rates decide what the monthly bill feels like.</p></div>
      <div><small>Payment shock</small><strong>+{paymentChange.toFixed(1)}%</strong><em>3.0% to 6.5% mortgage rate, with home price +22.6%</em></div>
    </section>
    <Panel title="Change Since January 2020">
      <div className="afford-bars">{rows.map((r) => <div className={r.featured ? 'afford-row featured' : 'afford-row'} key={r.label}>
        <div><b>{r.label}</b><strong>+{r.value.toFixed(1)}%</strong></div>
        <span><em className={r.tone} style={{ width: `${r.value / max * 100}%` }} /></span>
      </div>)}</div>
    </Panel>
    <div className="afford-grid">
      <Panel title="What Changed"><div className="explain"><p>At first glance, housing looks less scary: average hourly earnings rose <b>32.4%</b>, while the median new-home price rose <b>22.6%</b>.</p><p>But buyers do not experience the purchase price directly. Most experience the monthly mortgage payment, and rates roughly doubled from the 2020 low-rate environment.</p></div></Panel>
      <Panel title="Simple Mortgage Math"><div className="explain"><p>On the same home price, moving from a 3.0% to 6.5% 30-year mortgage raises principal and interest about <b>{samePricePaymentChange.toFixed(1)}%</b>.</p><p>Combine that with a <b>22.6%</b> higher median new-home price, and the estimated payment rises about <b>{paymentChange.toFixed(1)}%</b>.</p></div></Panel>
    </div>
    <Panel title="Interpretation"><div className="explain"><p>The better affordability measure is not <b>house price divided by income</b>. It is <b>monthly mortgage payment divided by monthly income</b>. That is the ratio families feel and lenders underwrite.</p><p>Median new-home price also has a mix problem: builders can shift between starter homes and luxury homes, and the series excludes existing homes, condos, and townhomes.</p></div></Panel>
  </div>;
}

function Goals({ all, rentOverrides, setView, setTxFilters, setFilter }) {
  const [goals, setGoals] = useState(() => { try { const saved = JSON.parse(localStorage.getItem('mf_goals_v2') || '{}'); return DEFAULT_GOALS.map((g) => ({ ...g, target: saved[g.id] ?? g.target })); } catch { return DEFAULT_GOALS; } });
  const [month, setMonth] = useState(months(all)[0] || 'this-month');
  const txs = filterByDate(all, month);
  const actual = (g) => g.type === 'savings_deposit' ? sum(txs.filter((t) => t.account === g.accountId && t.amount > 0), (t) => t.amount) : g.type === 'category' ? sum(expenses(txs).filter((t) => t.category === g.category), (t) => Math.abs(t.amount)) : g.type === 'cash_withdrawal' ? sum(expenses(txs).filter((t) => rentOverrides[t.id] || isCashWithdrawal(t) || g.keywords?.some((k) => (t.merchant || '').toLowerCase().includes(k))), (t) => Math.abs(t.amount)) : sum(expenses(txs).filter((t) => g.keywords?.some((k) => (t.merchant || '').toLowerCase().includes(k))), (t) => Math.abs(t.amount));
  const edit = (g) => { const raw = prompt(`Monthly target for "${g.label}" ($):`, g.target); const value = Number(raw); if (!Number.isFinite(value) || value < 0) return; const next = goals.map((item) => item.id === g.id ? { ...item, target: value } : item); setGoals(next); localStorage.setItem('mf_goals_v2', JSON.stringify(Object.fromEntries(next.map((item) => [item.id, item.target])))); };
  return <div className="view"><section className="goal-head"><div><h1>Monthly Goals</h1><p>Click a target to edit it. Saved in this browser.</p></div><select value={month} onChange={(e) => setMonth(e.target.value)}>{months(all).slice(0, 18).map((m) => <option key={m} value={m}>{labelFor(m)}</option>)}</select></section><div className="stats small"><Stat label="Income" value={dollar(sum(income(txs), (t) => t.amount))} note={labelFor(month)} tone="green" /><Stat label="Spent" value={dollar(sum(expenses(txs), (t) => Math.abs(t.amount)))} note="total expenses" tone="red" /><Stat label="Net Cash Flow" value={`${sum(income(txs), (t) => t.amount) - sum(expenses(txs), (t) => Math.abs(t.amount)) >= 0 ? '+' : '-'}${dollar(Math.abs(sum(income(txs), (t) => t.amount) - sum(expenses(txs), (t) => Math.abs(t.amount))))}`} note="income minus expenses" /></div><Panel title="Goal Tracker"><div className="goals">{goals.map((g) => { const value = actual(g); const pct = g.target > 0 ? Math.min(100, value / g.target * 100) : 0; const openGoalRows = () => { if (g.type === 'cash_withdrawal') { setFilter(month); setTxFilters({ search: '', account: '', category: '', type: 'withdrawal' }); setView('transactions'); } }; return <div key={g.id} className={g.type === 'cash_withdrawal' ? 'goal clickable' : 'goal'} onClick={openGoalRows}><div><i style={{ background: g.color }} /><b>{g.label}</b></div><button onClick={(e) => { e.stopPropagation(); edit(g); }}>Target {dollar(g.target)}</button><strong>{dollar(value)}</strong><span><em style={{ width: `${pct}%`, background: g.color }} /></span></div>; })}</div></Panel></div>;
}

const BANK_GUIDES = [
  { name: 'Chase', steps: ['Sign in → Accounts → your account', 'Click Download Account Activity', 'Choose date range → Download as CSV'] },
  { name: 'Apple Card', steps: ['iPhone: Wallet → Apple Card → ···  → Download Statements', 'Choose year/month → Export CSV', 'AirDrop or email the file to your Mac'] },
  { name: 'Bank of America', steps: ['Sign in → Accounts → your account', 'Click Download Transactions', 'Choose a date range and select CSV format'] },
  { name: 'Wells Fargo', steps: ['Sign in → Account Activity', 'Click Download Account Activity', 'Choose date range → Comma Separated (CSV)'] },
  { name: 'Capital One', steps: ['Sign in → your account → Transactions', 'Click the Download icon', 'Choose a date range → Download as CSV'] },
  { name: 'Citi', steps: ['Sign in → Account Details', 'Click Download Transactions', 'Choose date range → CSV format'] },
  { name: 'American Express', steps: ['Sign in → Statements & Activity', 'Click Download', 'Choose date range → Comma Delimited (CSV)'] },
  { name: 'Discover', steps: ['Sign in → Account Details → Statements', 'Click Download Transactions', 'Choose a date range → CSV'] },
  { name: 'US Bank / PNC / Regional Banks', steps: ['Sign in → Account History or Activity', 'Look for a Download, Export, or Print icon', 'Choose CSV or Excel format if offered'] },
  { name: 'Credit Unions & Other Banks', steps: ['Log in → Account History or Statements', 'Look for Export, Download, or CSV link', 'Any CSV with Date, Amount, and Description columns works'] },
];

function ImportView({ data, status, onFiles, onDemo, onLocal, onClear, pendingImport, onRestore, onDiscardPending }) {
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);
  const chooseFiles = (fileList) => onFiles([...fileList].filter((f) => /\.csv$/i.test(f.name)));
  const hasData = data.transactions.length > 0;
  return <div className="view">
    {!hasData && pendingImport && <Panel title="Previous Import Found">
      <div className="empty-actions">
        <p>You have {pendingImport.length} CSV file{pendingImport.length === 1 ? '' : 's'} saved from last time ({pendingImport.map((f) => f.name).join(', ')}).</p>
        <div className="action-row">
          <button className="add-btn" onClick={onRestore}>Load last import</button>
          <button className="secondary-btn" onClick={onDiscardPending}>Start fresh</button>
        </div>
      </div>
    </Panel>}
    <div className={`dropzone ${dragging ? 'dragging' : ''}`} onDragOver={(e) => { e.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={(e) => { e.preventDefault(); setDragging(false); chooseFiles(e.dataTransfer.files); }} onClick={() => inputRef.current?.click()}>
      <Icon name="upload" />
      <b>Drop bank CSV exports here</b>
      <p>Any bank or credit union — drop one or more CSVs and everything stays in your browser.</p>
      <button type="button" className="add-btn" onClick={(e) => { e.stopPropagation(); inputRef.current?.click(); }}>Browse files</button>
      <input ref={inputRef} type="file" accept=".csv" multiple hidden onChange={(e) => { chooseFiles(e.target.files); e.target.value = ''; }} />
    </div>
    <p className="privacy-banner">Everything is parsed in your browser. No account connection, no server upload, no tracking.</p>
    <Panel title="Quick Start">
      <div className="empty-actions">
        <p style={{ color: hasData ? '#059669' : '#475569' }}>{status}</p>
        <div className="action-row">
          <button className="add-btn" onClick={onDemo}>Try demo data</button>
          {onLocal && <button className="secondary-btn" onClick={onLocal}>Load local folder</button>}
          {hasData && <button className="secondary-btn" onClick={onClear}>Clear data</button>}
        </div>
      </div>
    </Panel>
    {hasData && <Panel title={`${data.accounts.length} Accounts · ${data.transactions.length.toLocaleString()} Transactions`}><div className="tx-list">{data.accounts.map((a) => <div className="tx" key={a.id}><span className="date">{a.bank}</span><div className="merchant"><b>{a.name}</b><small><i style={{ background: a.color }} />{a.type.replace('_', ' ')}</small></div><span className="account">{data.transactions.filter((t) => t.account === a.id).length.toLocaleString()} transactions</span><strong>{data.balances[a.id] !== undefined ? dollar(data.balances[a.id]) : '-'}</strong></div>)}</div></Panel>}
    <Panel title="How to Download Your Bank CSV">
      <div className="bank-guides">{BANK_GUIDES.map((b) => <div className="bank-guide" key={b.name}><b>{b.name}</b><ol>{b.steps.map((s, i) => <li key={i}>{s}</li>)}</ol></div>)}</div>
    </Panel>
  </div>;
}

export default function App() {
  const [view, setView] = useState('import');
  const [filter, setFilter] = useState('ytd');
  const [data, setData] = useState({ transactions: [], balances: {}, balanceHistory: {}, accounts: [], failed: [] });
  const [status, setStatus] = useState('No data loaded yet. Import CSVs or load demo data to explore.');
  const [txFilters, setTxFiltersValue] = useState({ search: '', account: '', category: '', type: '' });
  const [rentOverrides, setRentOverrides] = useState(() => { try { return JSON.parse(localStorage.getItem('mf_rent_tx_v1') || '{}'); } catch { return {}; } });
  const [pendingImport, setPendingImport] = useState(null);

  const [mode, setModeRaw] = useState(() => localStorage.getItem('mf_mode_v1') || 'personal');
  const [bizAccounts, setBizAccounts] = useState(() => loadJson('mf_biz_accounts_v1', {}));
  const [invoices, setInvoices] = useState(() => { try { const saved = JSON.parse(localStorage.getItem('mf_invoices_v1') || '[]'); return Array.isArray(saved) ? saved : []; } catch { return []; } });
  const [taxRate, setTaxRateRaw] = useState(() => Number(localStorage.getItem('mf_biz_tax_rate_v1')) || 25);
  const setMode = (next) => {
    setModeRaw(next);
    localStorage.setItem('mf_mode_v1', next);
    const tag = VIEWS.find(([id]) => id === view)?.[3];
    if (tag && tag !== 'shared' && tag !== next) setView(next === 'business' ? 'business' : 'dashboard');
  };
  const setTaxRate = (next) => { setTaxRateRaw(next); localStorage.setItem('mf_biz_tax_rate_v1', String(next)); };
  const toggleBizAccount = (id) => setBizAccounts((prev) => {
    const next = { ...prev };
    if (next[id]) delete next[id]; else next[id] = true;
    localStorage.setItem('mf_biz_accounts_v1', JSON.stringify(next));
    return next;
  });
  const addInvoice = (inv) => setInvoices((prev) => { const next = [...prev, inv]; localStorage.setItem('mf_invoices_v1', JSON.stringify(next)); return next; });
  const updateInvoice = (id, patch) => setInvoices((prev) => { const next = prev.map((i) => i.id === id ? { ...i, ...patch } : i); localStorage.setItem('mf_invoices_v1', JSON.stringify(next)); return next; });
  const deleteInvoice = (id) => setInvoices((prev) => { const next = prev.filter((i) => i.id !== id); localStorage.setItem('mf_invoices_v1', JSON.stringify(next)); return next; });

  useEffect(() => {
    loadStoredFiles().then((files) => { if (files.length) setPendingImport(files); });
  }, []);

  // catOverrides/rules are synced across devices via the raft-sync
  // companion process, if one is running (ws://localhost:7001 by
  // default) — see src/lib/sync.js. Falls back to plain localStorage
  // (unchanged from before) when no companion process is reachable, so
  // openfinance works exactly as before without it.
  const catStoreRef = useRef(null);
  if (!catStoreRef.current) catStoreRef.current = createSyncedStore('catOverride');
  const ruleStoreRef = useRef(null);
  if (!ruleStoreRef.current) ruleStoreRef.current = createSyncedStore('rule');

  const [catOverrides, setCatOverridesRaw] = useState(() => {
    const fromStore = catStoreRef.current.get();
    return Object.keys(fromStore).length ? fromStore : loadJson('mf_cat_overrides_v1', {});
  });
  const [rules, setRulesRaw] = useState(() => {
    const fromStore = ruleStoreRef.current.get();
    if (Object.keys(fromStore).length) {
      return Object.entries(fromStore).map(([keyword, category]) => ({ keyword, category }));
    }
    const saved = loadJson('mf_rules_v1', []);
    return Array.isArray(saved) ? saved.filter((r) => r && r.keyword && r.category) : [];
  });

  useEffect(() => {
    const unsubCat = catStoreRef.current.subscribeToRemoteUpdates((next) => {
      setCatOverridesRaw(next);
      localStorage.setItem('mf_cat_overrides_v1', JSON.stringify(next));
    });
    const unsubRules = ruleStoreRef.current.subscribeToRemoteUpdates((next) => {
      const asList = Object.entries(next).map(([keyword, category]) => ({ keyword, category }));
      setRulesRaw(asList);
      localStorage.setItem('mf_rules_v1', JSON.stringify(asList));
    });
    return () => { unsubCat(); unsubRules(); };
  }, []);
  const applyLoaded = (loaded, nextStatus) => {
    setData({ accounts: [], failed: [], ...loaded });
    setStatus(nextStatus || (loaded.failed?.length ? `${loaded.transactions.length.toLocaleString()} transactions loaded - failed: ${loaded.failed.join(', ')}` : `${loaded.transactions.length.toLocaleString()} transactions loaded`));
    setFilter('ytd');
    setTxFiltersValue({ search: '', account: '', category: '', type: '' });
    setView('dashboard');
  };
  const loadFiles = async (files) => {
    if (!files.length) return;
    try {
      const loaded = await loadFromFiles(files);
      applyLoaded(loaded, loaded.failed?.length ? `${loaded.transactions.length.toLocaleString()} transactions loaded - skipped: ${loaded.failed.join(', ')}` : `${loaded.transactions.length.toLocaleString()} transactions loaded from ${files.length} file${files.length === 1 ? '' : 's'}`);
      setPendingImport(null);
      const stored = await Promise.all(files.map(async (f) => ({ name: f.name, text: await f.text() })));
      saveStoredFiles(stored);
    } catch (err) {
      setStatus(err.message);
    }
  };
  const restoreImport = () => {
    if (!pendingImport) return;
    loadFiles(pendingImport.map((f) => new File([f.text], f.name, { type: 'text/csv' })));
  };
  const discardPendingImport = () => setPendingImport(null);
  const loadDemo = () => applyLoaded(generateDemoData(), 'Demo data loaded');
  const clearData = () => {
    setData({ transactions: [], balances: {}, balanceHistory: {}, accounts: [], failed: [] });
    setStatus('No data loaded yet. Import CSVs or load demo data to explore.');
    setView('import');
    setPendingImport(null);
    saveStoredFiles([]);
  };
  const setRules = (next) => {
    setRulesRaw((prev) => {
      // Diff by keyword so only changed/added/removed entries write
      // through the sync store — writing the whole list every time would
      // make every edit look like every rule changed, which is wrong for
      // per-entry conflict resolution across devices.
      const prevByKeyword = Object.fromEntries(prev.map((r) => [r.keyword, r.category]));
      const nextByKeyword = Object.fromEntries(next.map((r) => [r.keyword, r.category]));
      for (const [keyword, category] of Object.entries(nextByKeyword)) {
        if (prevByKeyword[keyword] !== category) ruleStoreRef.current.set(keyword, category);
      }
      return next;
    });
    localStorage.setItem('mf_rules_v1', JSON.stringify(next));
  };
  const categorize = (id, category) => setCatOverridesRaw((prev) => {
    const next = { ...prev, [id]: category };
    catStoreRef.current.set(id, category);
    localStorage.setItem('mf_cat_overrides_v1', JSON.stringify(next));
    return next;
  });
  const transactions = useMemo(() => data.transactions.map((t) => {
    const rule = rules.find((r) => (t.merchant || '').toLowerCase().includes(r.keyword));
    const category = catOverrides[t.id] || rule?.category;
    if (!category || category === t.category) return t;
    let type = t.type;
    if (category === 'Income') type = 'income';
    else if (category === 'Payment/Transfer') type = 'payment';
    else if (category === 'Investments') type = 'investment';
    else if (t.amount < 0) type = 'expense';
    return { ...t, category, type };
  }), [data.transactions, catOverrides, rules]);
  const personalTransactions = useMemo(() => transactions.filter((t) => !bizAccounts[t.account]), [transactions, bizAccounts]);
  const businessTransactions = useMemo(() => transactions.filter((t) => bizAccounts[t.account]), [transactions, bizAccounts]);
  const modeTransactions = mode === 'business' ? businessTransactions : personalTransactions;
  const filtered = useMemo(() => filterByDate(modeTransactions, filter), [modeTransactions, filter]);
  const filteredAllAccounts = useMemo(() => filterByDate(transactions, filter), [transactions, filter]);
  const monthList = useMemo(() => months(transactions), [transactions]);
  const setTxFilters = (patch) => setTxFiltersValue((prev) => ({ ...prev, ...patch }));
  const custom = filter.startsWith('custom:') ? filter.split(':') : null;
  const setCustom = (from, to) => setFilter(from || to ? `custom:${from || ''}:${to || ''}` : 'ytd');
  const toggleRentOverride = (id) => setRentOverrides((prev) => {
    const next = { ...prev };
    if (next[id]) delete next[id];
    else next[id] = true;
    localStorage.setItem('mf_rent_tx_v1', JSON.stringify(next));
    return next;
  });
  const hasData = data.transactions.length > 0;
  const hasBizAccounts = data.accounts.some((a) => bizAccounts[a.id]);
  const modeCatColors = mode === 'business' ? BIZ_CAT_COLORS : CAT_COLORS;
  const activeView = hasData || PUBLIC_VIEWS.has(view) ? view : 'import';
  return <div className="app"><Sidebar view={activeView} setView={(next) => setView(hasData || PUBLIC_VIEWS.has(next) ? next : 'import')} status={status} mode={mode} setMode={setMode} /><main><header className="top"><div><h1>{VIEWS.find(([id]) => id === activeView)?.[1]}</h1><p>Private by design - all analysis happens in this browser</p></div>{hasData && <div className="range-controls"><select value={custom ? 'custom' : filter} onChange={(e) => { if (e.target.value !== 'custom') setFilter(e.target.value); }}><option value="all">All Time</option><option value="this-month">This Month</option><option value="last-month">Last Month</option><option value="last-3">Last 3 Months</option><option value="last-6">Last 6 Months</option><option value="ytd">Year to Date</option>{custom && <option value="custom">{labelFor(filter)}</option>}<optgroup label="By Month">{monthList.map((m) => <option key={m} value={m}>{labelFor(m)}</option>)}</optgroup></select><label className="date-input">From <input type="date" value={custom?.[1] || ''} onChange={(e) => setCustom(e.target.value, custom?.[2] || '')} /></label><label className="date-input">To <input type="date" value={custom?.[2] || ''} onChange={(e) => setCustom(custom?.[1] || '', e.target.value)} /></label></div>}</header><div className="content" key={activeView}>{activeView === 'import' && <ImportView data={data} status={status} onFiles={loadFiles} onDemo={loadDemo} onClear={clearData} pendingImport={pendingImport} onRestore={restoreImport} onDiscardPending={discardPendingImport} />}{activeView === 'affordability' && <Affordability />}{hasData && activeView === 'dashboard' && <Dashboard all={personalTransactions} rows={filtered} balances={data.balances} accounts={data.accounts} setView={setView} setFilter={setFilter} setTxFilters={setTxFilters} filter={filter} />}{hasData && activeView === 'transactions' && <Transactions rows={filtered} filters={txFilters} setFilters={setTxFilters} accounts={mode === 'business' ? data.accounts.filter((a) => bizAccounts[a.id]) : data.accounts.filter((a) => !bizAccounts[a.id])} rentOverrides={rentOverrides} onToggleRent={toggleRentOverride} onCategorize={categorize} catColors={modeCatColors} />}{hasData && activeView === 'categories' && <Categories rows={filtered} setView={setView} setTxFilters={setTxFilters} />}{hasData && activeView === 'recurring' && <Recurring all={personalTransactions} setView={setView} setTxFilters={setTxFilters} />}{hasData && activeView === 'cashflow' && <CashFlow rows={filtered} filter={filter} setView={setView} setTxFilters={setTxFilters} />}{hasData && activeView === 'networth' && <NetWorth history={data.balanceHistory} accounts={data.accounts} />}{activeView === 'accounts' && <Accounts rows={filteredAllAccounts} balances={data.balances} accounts={data.accounts} bizAccounts={bizAccounts} onToggleBiz={toggleBizAccount} />}{hasData && activeView === 'income' && <Income all={personalTransactions} setView={setView} setTxFilters={setTxFilters} />}{hasData && activeView === 'goals' && <Goals all={personalTransactions} rentOverrides={rentOverrides} setView={setView} setTxFilters={setTxFilters} setFilter={setFilter} />}{hasData && activeView === 'business' && <Business rows={filtered} all={businessTransactions} filter={filter} taxRate={taxRate} setTaxRate={setTaxRate} setView={setView} setTxFilters={setTxFilters} hasBizAccounts={hasBizAccounts} onCategorize={categorize} />}{activeView === 'invoices' && <Invoices invoices={invoices} addInvoice={addInvoice} updateInvoice={updateInvoice} deleteInvoice={deleteInvoice} />}{activeView === 'rules' && <Rules rules={rules} setRules={setRules} transactions={transactions} catColors={modeCatColors} />}</div></main></div>;
}
