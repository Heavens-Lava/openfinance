// Synthetic demo data so the app has something to show before any import.
// Two fake accounts: a checking account (generic CSV format) and a credit
// card (Chase-style format), covering roughly the last seven months.

function monthsBack(n, day) {
  const now = new Date();
  const d = new Date(now.getFullYear(), now.getMonth() - n, day);
  return `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}/${d.getFullYear()}`;
}

function buildChecking() {
  const rows = ['Date,Description,Amount,Balance'];
  let balance = 4200;
  const lines = [];
  for (let m = 6; m >= 0; m--) {
    lines.push([m, 1, 'ACME CORP PAYROLL DIRECT DEPOSIT', 2450.0]);
    lines.push([m, 15, 'ACME CORP PAYROLL DIRECT DEPOSIT', 2450.0]);
    lines.push([m, 2, 'APARTMENT RENT PAYMENT', -1400.0]);
    lines.push([m, 3, 'CITY ELECTRIC UTILITY', -95.5]);
    lines.push([m, 5, 'ONLINE TRANSFER TO SAVINGS', -400.0]);
    lines.push([m, 8, 'TRADER JOES #112', -87.32]);
    lines.push([m, 12, 'COSTCO WHOLESALE', -164.75]);
    lines.push([m, 18, 'SAFEWAY STORE 1668', -52.4]);
    lines.push([m, 20, 'CREDIT CARD PAYMENT THANK YOU', -650.0]);
    lines.push([m, 22, 'ATM WITHDRAWAL', -100.0]);
    lines.push([m, 26, 'STATE FARM INSURANCE', -128.6]);
  }
  for (const [m, day, desc, amt] of lines) {
    balance += amt;
    rows.push(`${monthsBack(m, day)},"${desc}",${amt.toFixed(2)},${balance.toFixed(2)}`);
  }
  return rows.join('\n');
}

function buildCard() {
  const rows = ['Transaction Date,Post Date,Description,Category,Type,Amount'];
  const lines = [];
  for (let m = 6; m >= 0; m--) {
    lines.push([m, 3, 'STARBUCKS STORE 8841', 'Food & Drink', -6.45]);
    lines.push([m, 4, 'CHIPOTLE 2211', 'Food & Drink', -13.85]);
    lines.push([m, 7, 'NETFLIX.COM', 'Bills & Utilities', -15.49]);
    lines.push([m, 9, 'SHELL OIL 5744', 'Gas', -48.2]);
    lines.push([m, 11, 'AMAZON MKTPL*2Y4XR', 'Shopping', -34.99]);
    lines.push([m, 13, 'SPOTIFY USA', 'Bills & Utilities', -11.99]);
    lines.push([m, 16, 'CHEVRON 0093', 'Gas', -51.75]);
    lines.push([m, 17, 'PANDA EXPRESS 1077', 'Food & Drink', -11.2]);
    lines.push([m, 19, 'CVS/PHARMACY #08421', 'Health & Wellness', -22.14]);
    lines.push([m, 24, 'STEAM PURCHASE', 'Entertainment', -19.99]);
    lines.push([m, 27, 'TARGET 00028031', 'Shopping', -66.3]);
    lines.push([m, 20, 'Payment Thank You - Web', 'Payment', 650.0]);
  }
  for (const [m, day, desc, cat, amt] of lines) {
    const date = monthsBack(m, day);
    rows.push(`${date},${date},"${desc}",${cat},${amt > 0 ? 'Payment' : 'Sale'},${amt.toFixed(2)}`);
  }
  return rows.join('\n');
}

export function demoFiles() {
  return [
    { id: 'demo-checking', name: 'Demo Checking.csv', accountName: 'Demo Checking', accountType: 'checking', text: buildChecking() },
    { id: 'demo-card', name: 'Demo Credit Card.csv', accountName: 'Demo Credit Card', accountType: 'credit_card', text: buildCard() },
  ];
}
