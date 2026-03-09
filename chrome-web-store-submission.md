# Chrome Web Store Submission Copy (Future Self)

Use this copy in the Chrome Web Store listing to reduce permission-review rejections.

## Permissions Justification

### `<all_urls>` host permission
Future Self is a website blocker that intercepts navigation to user-configured domains during their sleep window. The extension uses `chrome.webNavigation.onBeforeNavigate` to detect when the user visits any blocked site and redirects them to an intercept page. Since users can add custom domains to their block list, the extension must monitor all URLs to determine if a match exists. No page content is read — only the URL domain is checked against the user's block list.

### `https://odcmrhnwxzgyfodoscqw.supabase.co/*`
Used for user authentication (sign up, login, token refresh) and profile data (trial status, payment status). All communication is over HTTPS.

### `identity` permission
Used for Google Sign-In via `chrome.identity.launchWebAuthFlow` from the login screen.

## Store Description Requirements (include all points)

Future Self blocks distracting websites during a calculated sleep window based on your wake time, sleep target, and wind-down buffer.

The extension monitors navigation URLs so it can block any domain in your user-configured block list (including custom domains you add).

Future Self supports Google Sign-In for authentication (uses the Chrome `identity` API), plus email/password login.

All blocking decisions happen locally in the browser. Future Self does not send browsing history, visited page content, or blocked-site activity to external servers.

Privacy Policy: https://getfutureself.com/privacy

## Pre-Submission Checklist

- [ ] `manifest.json` has no `tabs` permission.
- [ ] `manifest.json` has no `activeTab` permission.
- [ ] `web_accessible_resources` is not present (or is minimal if ever reintroduced).
- [ ] Packaged upload includes only production extension files from `dist/`.
- [ ] Google Sign-In flow works from `login.html`.
- [ ] `identity` permission is described in listing text.
- [ ] Privacy policy URL is set in the listing Privacy tab.
