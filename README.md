# Age Verification Bypass (Userscript)

Port of the Firefox add-on [helloyanis/age-verification-bypass](https://github.com/helloyanis/age-verification-bypass) to a userscript (Violentmonkey, Tampermonkey, Greasemonkey).

## Installation

1. Install [Violentmonkey](https://violentmonkey.github.io/) (recommended), [Tampermonkey](https://www.tampermonkey.net/), or [Greasemonkey](https://www.greasespot.net/)
2. Click [install](https://raw.githubusercontent.com/LucianoSkx/age-verification-bypass/main/age-verification-bypass.user.js)
3. Confirm installation

## Supported Services

- **[AgeChecker.net](https://agechecker.net/demo)** — Full bypass (unless the site does a server-side double-check) · **verified**
- **[AgeGO](https://agego.com)** — Basic + advanced integration; server-to-server mode (may fail if site does additional checks) · untested
- **[AgeVerif.com](https://demo.ageverif.com/)** — Basic integration; advanced and OAuth2 flows are not handled · **verified**
- **[AliExpress](https://aliexpress.com/)** — "For adults" items (removes blur/modal/overlays, including suggested products) · **verified** (de-blur rule; not exercised on a live adult-flagged listing)
- **[Bluesky](https://bsky.app)** — Sensitive posts without login (automod + self-labelled posts); media revealed by clicking "Show" · untested
- **[Reddit](https://reddit.com)** — NSFW communities (works best logged out; consider [redlib](https://redlib.catsarch.com/) for a fully private Reddit frontend) · untested
- **[SpankBang](https://spankbang.com)** — View videos even when logged out (removes blur/overlay and neutralizes the age verification modal) · untested
- **[Veriff](https://veriff.com)** — Works on only a few sites (don't expect it to work everywhere) · untested
- **[x.com / Twitter](https://x.com)** — Unblurs sensitive posts in single post view (`TweetResultByRestId`, `TweetDetail`) and profile timelines (`UserOriginalsTimeline`, `UserTweetsAndReplies`); requires being logged in (ported from upstream 1.2.4, still BETA upstream) · untested
- **[Cosxplay](https://cosxplay.com)** — Blocks the age verification script (`age.js`) · untested
- **[AngeloGodsHack](https://angelogodshackxxx.com)** — Removes the age gate modal · untested
- **[rule34.xxx](https://rule34.xxx)** — Geographical IP block — shows a Tor Browser hint (no direct bypass, same as upstream)
- **[xHamster](https://xhamster.com)** — Geographical IP block — shows a Tor Browser hint (no direct bypass, same as upstream)

### Status labels

- **verified** — checked in a real browser against the live service.
- *untested* — covered by the test suite only. The code path exists and is
  exercised in CI, but nobody has run it against the real site. Expect breakage.

A passing CI run means the interception engine is internally consistent, not
that every listed service works. Several of these need a real third-party
integration to reach at all.

## How It Works

Two main methods:

### Rewrite Server Response
Intercepts requests that would create the age verification popup and replaces them with code that automatically sends the "verification approved" callback to the website. Example: Bluesky.

### Trap SDK Globals
Some SDKs are loaded by a plain `<script src>` tag, which neither `fetch` nor XHR ever sees. The script defines accessors on the config globals those SDKs assign themselves (`AgeCheckerConfig`, `AgeCheckerAPI`, `AGEGO`, `Veriff`, `veriffSDK`), so the moment the page hands over its callbacks the "accepted" verdict is returned immediately.

### Hide and Remove DOM Elements
Removes popups, blurs, and overlays added when a page is marked NSFW. Example: AliExpress, Reddit.

**No data is collected.** There is no tracking of which sites you visit.

## Requirements

The script uses `@grant none` so it runs in the page's own JavaScript context. This is required — in a sandboxed userscript, patching `window.fetch` has no effect on the page, and the whole script silently does nothing.

The trade-off: a plain `<style>` element is subject to the site's `style-src` CSP, so the CSS-based de-blurring can be blocked on sites with a strict policy. `GM_addStyle` was not subject to it.

## Troubleshooting

If nothing happens on a supported site, check that the script actually reached the page:

1. Open the site and the browser console.
2. Run `typeof AgeCheckerAPI` on an AgeChecker.net page.
3. `undefined` means the script did not reach the page world. Usually the userscript
   manager refused MAIN_WORLD injection because of the site's CSP. Try a different
   manager, or report it with the site and the console output.

## Updates

The script checks for updates automatically via `@updateURL`/`@downloadURL` pointing to this repository.

## Credits

- Original: [helloyanis](https://github.com/helloyanis) — [Firefox add-on](https://github.com/helloyanis/age-verification-bypass)
- Port: [LucianoSkx](https://github.com/LucianoSkx)
- Interception engine: [xtalia](https://github.com/xtalia/age-verification-bypass) / Hermes Agent

## License

MIT