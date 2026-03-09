# Future Self Privacy Policy

Last updated: 2026-03-09

Future Self is a Chrome extension that blocks user-configured websites during a calculated sleep window.

## Data We Collect

- **Email address** (for account creation/login via Supabase authentication).
- **Authentication tokens** (access/refresh tokens required to keep users signed in).
- **Account subscription/trial status** (to determine trial and upgrade eligibility).

## Data We Do Not Collect

- We do **not** collect or transmit browsing history.
- We do **not** collect or transmit the user's blocked-site list to our servers.
- We do **not** collect or transmit page content from visited websites.

## Where Data Is Stored

- **Locally in the browser**: extension settings, block configuration, override logs, and streak-related data are stored in Chrome extension storage.
- **Supabase (HTTPS)**: authentication/session information and profile payment/trial status are stored and retrieved through `https://odcmrhnwxzgyfodoscqw.supabase.co/*`.

## How Data Is Used

- To authenticate users (email/password and optional Google Sign-In).
- To maintain login sessions.
- To determine trial and payment status for premium features.

## Local-Only Blocking Behavior

Website blocking decisions happen locally in the extension. Future Self checks the URL domain locally against the user's configured block list during the configured schedule. Browsing data is not sent to external servers for blocking decisions.

## Google API Data and Limited Use

Future Self's use of information received from Google APIs adheres to the Chrome Web Store User Data Policy, including the Limited Use requirements.

## Contact

For privacy questions, contact: support@getfutureself.com
