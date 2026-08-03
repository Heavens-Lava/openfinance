import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import test from 'node:test';

import { detectFormat, loadFromCsvTexts } from '../src/lib/finance.js';

const fixtureDir = path.join(path.dirname(fileURLToPath(import.meta.url)), 'fixtures');

async function fixture(name) {
  return { name, text: await readFile(path.join(fixtureDir, name), 'utf8') };
}

test('detects documented bank export structures', () => {
  assert.equal(detectFormat(['Transaction Date', 'Clearing Date', 'Merchant', 'Amount (USD)']), 'apple');
  assert.equal(detectFormat(['Transaction Date', 'Post Date', 'Description', 'Category', 'Amount']), 'chase-cc');
  assert.equal(detectFormat(['Posting Date', 'Description', 'Amount', 'Check or Slip #']), 'chase-checking');
  assert.equal(detectFormat(['Transaction ID', 'Posting Date', 'Transaction Category', 'Amount']), 'desert-financial');
  assert.equal(detectFormat(['Date', 'Name', 'Memo', 'Amount']), 'elan');
  assert.equal(detectFormat(['Date', 'Description', 'Debit', 'Credit']), 'generic');
  assert.equal(detectFormat(['Unrelated', 'Columns']), 'unknown');
});

for (const [name, expectedType] of [
  ['apple-card.csv', 'credit_card'],
  ['chase-credit.csv', 'credit_card'],
  ['chase-checking.csv', 'checking'],
  ['desert-financial.csv', 'checking'],
  ['elan.csv', 'credit_card'],
  ['generic.csv', 'checking'],
]) {
  test(`parses ${name} fixture`, async () => {
    const loaded = loadFromCsvTexts([await fixture(name)]);
    assert.deepEqual(loaded.failed, []);
    assert.equal(loaded.accounts.length, 1);
    assert.equal(loaded.accounts[0].type, expectedType);
    assert.equal(loaded.transactions.length, 2);
    assert.ok(loaded.transactions.every((transaction) => transaction.date instanceof Date));
  });
}

test('reports unsupported CSV structures instead of claiming compatibility', () => {
  const loaded = loadFromCsvTexts([{ name: 'unsupported.csv', text: 'Foo,Bar\n1,2\n' }]);
  assert.deepEqual(loaded.failed, ['unsupported.csv']);
  assert.equal(loaded.transactions.length, 0);
});

test('combines compatible files without reading external data', async () => {
  const loaded = loadFromCsvTexts([
    await fixture('chase-checking.csv'),
    await fixture('apple-card.csv'),
  ]);
  assert.equal(loaded.accounts.length, 2);
  assert.equal(loaded.transactions.length, 4);
  assert.deepEqual(loaded.failed, []);
});
