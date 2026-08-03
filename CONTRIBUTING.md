# Contributing to OpenFinance

Thank you for helping improve a private, inspectable finance tool.

## Before opening an issue

1. Search existing issues.
2. Reproduce the problem with synthetic data.
3. Record the browser or desktop version and OpenFinance release.
4. Remove all real names, account numbers, balances, transactions, and filenames.

Never upload a real bank statement. For parser problems, create a minimal synthetic CSV containing the same headers and representative data shapes.

## Development

```bash
npm install
npm test
npm run dev
```

Before submitting a pull request, run:

```bash
npm test
npm run build
```

Explain the customer problem, implementation, tests, and any privacy or security effect. New bank-format claims require a synthetic fixture and parser test. Changes that add network calls, analytics, cloud storage, authentication, or third-party scripts require corresponding privacy documentation.
