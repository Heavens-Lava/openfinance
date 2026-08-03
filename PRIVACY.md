# OpenFinance Privacy Model

The canonical public privacy explanation is published at <https://finance.jeffreymacy.com/privacy/>.

OpenFinance processes selected bank CSV files locally. The public deployment does not connect to financial institutions or transmit imported financial contents to an OpenFinance application server. Imported files are persisted in the current browser's IndexedDB until cleared, while preferences and user-defined rules may use localStorage.

The site must still be delivered over a network. Hosting providers and external resource providers may receive ordinary request metadata such as an IP address. Contributors must not describe the application as making “zero server contact.” The correct narrow claim is that imported financial contents are locally processed and are not transmitted by the public OpenFinance application.

Never add analytics, error reporting, external APIs, or cloud persistence to the public build without documenting the exact data involved, obtaining appropriate consent, updating the published policy, and reviewing whether the local-first promise remains accurate.
