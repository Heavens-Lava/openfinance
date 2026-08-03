# Security Policy

## Supported version

Security fixes are applied to the latest release and the default branch. Older builds may not receive fixes.

## Reporting a vulnerability

Do not open a public issue containing an exploitable vulnerability. Use GitHub private vulnerability reporting when it is enabled for this repository, or contact the repository owner through <https://www.jeffreymacy.com/>.

Include the affected version, environment, reproduction steps, impact, and a safe proof of concept. Do not include actual bank statements, account numbers, credentials, or other financial data.

## Security boundaries

- The public application does not request banking credentials or connect to bank APIs.
- Imported CSV contents are stored locally in IndexedDB for restoration. Android application backup is disabled so this database is not copied into Android cloud backups by the app.
- Local-first storage does not protect data from malware, another user of an unlocked device, browser extensions, compromised dependencies, or a compromised hosting/build pipeline.
- Users should verify financial output against original records and maintain their own backups.
- The unsigned Windows build may display an unknown-publisher warning. Native mobile packages must be signed through the official Apple or Android release process before public distribution. Verify releases through this repository and the official store listing when available.
