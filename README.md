# Browser Session Auditor

A local, read-only Manifest V3 Chrome extension for auditing where authenticated sessions live in *your* browser — cookie evidence, visible logout controls, storage counts — and what a "clear browsing data" action would actually do to them. No dependencies, no build step, no backend, no telemetry, no cookie deletion, no credential display.

## What it does

- **Cookie inventory (metadata-only)** — cookie counts grouped by exact domain × cookie store × partition/ancestor context, classified as session vs persistent, with secure/httpOnly flags and earliest expiry. Cookie names, paths and values are never reported.
- **Page observations** — heuristic detection of visible, English logout/sign-out controls on the page you're viewing, checked only when you click **Check this page**.
- **Storage counts** — local/session storage record counts only (not keys or values). IndexedDB, Cache Storage, service-worker state, in-memory tokens, saved passwords and passkeys are not inventoried.
- **Clearing-impact preview** — explains what Chrome's cache-only vs cookies/site-data clearing would do to your sessions *before* you deselect, with honest caveats.
- **Sanitized JSON export** — site domains, partition sites, counts, expiry times, scan time, granted origins and clearing settings. Treat your site inventory as private.

## Requirements

- Chrome 132 or later (Manifest V3 features)
- Node.js — only if you want to run the test suite; the extension itself has zero dependencies

## Install

1. Clone or download this repository.
2. Open `chrome://extensions` in Chrome.
3. Enable **Developer mode**.
4. Click **Load unpacked** and select the cloned directory.
5. Pin the extension, open its popup, then **Open dashboard**.
6. Grant a hostname (HTTPS by default), or explicitly choose **Allow all websites**. Use `http://example.com` to grant HTTP access.
7. To inspect a page, activate that site's tab and choose **Check this page** from the toolbar popup.

The extension is not automatically installed into your browser.

## What the audit means

- Cookie presence is site-data evidence, not proof of authentication. Analytics and preferences also use cookies.
- Session cookies have no persistent expiry; this does not identify a logged-in session. Browser restoration may preserve them.
- Page observations only detect visible, English logout/sign-out controls. False positives and negatives are possible; recheck after navigation or logout. No automatic authenticated requests are made.
- Local/session storage inspection reads counts, not keys or values. IndexedDB, Cache Storage, service-worker state, in-memory tokens, HTTP authentication, saved passwords and passkeys are not inventoried.
- Cookie results are grouped by exact domain, store and partition/ancestor context. Subdomains are not merged, so rows are not account or session counts.
- Host grants may not cover a parent domain or an identity provider used by a site. Broader grants improve cookie coverage but do not prove session completeness.
- Only this profile's accessible stores are scanned. Incognito is disabled. Other devices and server-side sessions are outside scope.

## Privacy

Chrome's cookie API returns raw cookie objects including secret values in scanner memory. The scanner immediately aggregates an allowlist of metadata fields. It does not send raw objects to the dashboard, persist them, log them or export them. Cookie names and paths are omitted too. The permission allows cookie access and modification at the browser level, although this code never calls mutation methods. This is not a browser-enforced metadata-only permission.

Audit results stay in dashboard memory. One sanitized page observation is retained in `chrome.storage.session` until forgotten, extension reload/disable or browser restart. No sync storage is used. A downloaded JSON report contains site domains, partition sites, counts, expiry times, scan time, granted origins and clearing settings; treat your site inventory as private. Revoking site access does not delete already downloaded reports.

## Clearing preview

Cache-only clearing usually preserves authentication data. Cookies/site-data clearing can remove local session state; applications may restore it or immediately sign in again through SSO. Google cookies can be refreshed while Chrome remains signed in. A local wipe does not revoke the server's session. Preview is category based; cookie creation times are not exposed, so exact time-range predictions are unavailable. Chrome clearing settings are a snapshot, not a live guarantee.

## Development and verification

Run `npm test` and `npm run check` with Node.js. Tests exercise secret exclusion, grouping, permission input and mocked scanner failure behavior. Open `index.html` through a local HTTP server for visual preview; scanning requires installation as an extension.

For real-profile verification, use a disposable Chrome profile and synthetic test accounts: inspect logged-out and signed-in pages; compare cache-only and cookies/site-data clearing; exercise partitioned cookies and revoked grants. Never use production sessions for deletion experiments.

## Architecture

- `background.js`: on-demand scanning and aggregate-only messaging.
- `core.js`: cookie aggregation, hostname validation and clearing explanations.
- `popup.js`: user-triggered page check using temporary active-tab access.
- `dashboard.js`: permissions, filtering, preview and sanitized JSON export.

See [TODO.md](TODO.md) for open work and design decisions, and [VERIFICATION.md](VERIFICATION.md) for the current verification status.

## License

Licensed under the [Apache License, Version 2.0](LICENSE). Copyright 2026 RJ Javier.

Provided as-is, with no warranty and no liability. The authors do not endorse, support, or condone unauthorized activity.

## Authorized and responsible use

This tool audits your own browser profile on sites you are legitimately signed in to. Respect website terms of service and applicable law; do not use the export mechanism to inventory sessions on devices you do not own or have permission to audit.
