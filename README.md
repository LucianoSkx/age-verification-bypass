# Age Verification Bypass (Userscript)

Port of the Firefox add-on [helloyanis/age-verification-bypass](https://github.com/helloyanis/age-verification-bypass) to a userscript (Violentmonkey, Tampermonkey, Greasemonkey).

## Installation

1. Install [Violentmonkey](https://violentmonkey.github.io/) (recommended), [Tampermonkey](https://www.tampermonkey.net/), or [Greasemonkey](https://www.greasespot.net/)
2. Click [install](https://raw.githubusercontent.com/LucianoSkx/age-verification-bypass/main/age-verification-bypass.user.js)
3. Confirm installation

## Supported Services

- **[AgeChecker.net](https://agechecker.net/demo)** — Full bypass (unless the site does a server-side double-check)
- **[AgeGO](https://agego.com)** — Basic + advanced integration; server-to-server mode (may fail if site does additional checks)
- **[AgeVerif.com](https://demo.ageverif.com/)** — Basic and advanced integrations (not oAuth2 flow)
- **[AliExpress](https://aliexpress.com/)** — "For adults" items (removes blur/modal)
- **[Bluesky](https://bsky.app)** — Sensitive posts without login; media revealed by clicking "Show"
- **[Reddit](https://reddit.com)** — NSFW communities (works best logged out; consider [redlib](https://redlib.catsarch.com/) for a fully private Reddit frontend)
- **[Veriff](https://veriff.com)** — Works on only a few sites (don't expect it to work everywhere)

## How It Works

Two main methods:

### Rewrite Server Response
Intercepts requests that would create the age verification popup and replaces them with code that automatically sends the "verification approved" callback to the website. Example: Bluesky.

### Hide and Remove DOM Elements
Removes popups, blurs, and overlays added when a page is marked NSFW. Example: AliExpress, Reddit.

**No data is collected.** There is no tracking of which sites you visit.

## Updates

The script checks for updates automatically via `@updateURL`/`@downloadURL` pointing to this repository.

## Credits

- Original: [helloyanis](https://github.com/helloyanis) — [Firefox add-on](https://github.com/helloyanis/age-verification-bypass)
- Port: [LucianoSkx](https://github.com/LucianoSkx)

## License

MIT