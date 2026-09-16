# Cookierule

View, edit, delete, protect, import and export cookies for the current site. A clean, open-source cookie editor for Chrome, Edge and Firefox (Manifest V3).

- **No accounts, no tracking, no network calls.** The only request this extension can make is the optional Pro license check, and `npm run lint:network` fails the build if anything else tries. Read the code: it is all here.
- **Protect list.** Mark cookies you never want wiped; "Delete all" skips them.
- **Import your old files.** Reads Cookie-Editor JSON, EditThisCookie JSON and Netscape `cookies.txt`. Exports Cookierule JSON and Cookie-Editor JSON for free.
- **Minimal permissions.** Only the tab you open it on, via `activeTab`. Access to all sites is optional and off by default.

**Pro ($9 one-time, or $15 bundled with [Headrule](https://github.com/yemoyang9-a11y/headrule)):** named cookie profiles per site (save a logged-in state, swap in one click), sync across devices, `cookies.txt` export for curl/wget/yt-dlp, and bulk rules across all sites. Everything you need on one machine stays free, forever.

## Develop

```
npm install                 # playwright for e2e
npm test                    # unit tests (format parsers)
npm run lint:network        # proves no network calls outside lib/license.js
npm run build               # dist/cookierule-<v>-{chrome,edge,firefox}.zip
npm run test:e2e            # needs: npx playwright install chromium
```

Load `extension/` unpacked in `chrome://extensions` (Developer mode) to try it.

## License

MIT. Cookierule is not affiliated with Cookie-Editor, EditThisCookie or any browser vendor; those names are used only to describe file compatibility.
