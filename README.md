# Age Verification Bypass (Userscript)

Port of the Firefox add-on [helloyanis/age-verification-bypass](https://github.com/helloyanis/age-verification-bypass) to a userscript (Violentmonkey, Tampermonkey, Greasemonkey).

## Installation

1. Install [Violentmonkey](https://violentmonkey.github.io/) (recommended), [Tampermonkey](https://www.tampermonkey.net/), or [Greasemonkey](https://www.greasespot.net/)
2. Click [install](https://raw.githubusercontent.com/LucianoSkx/age-verification-bypass/main/age-verification-bypass.user.js)
3. Confirm installation

## Supported Services

- **[AgeChecker.net](https://agechecker.net/demo)** — Full bypass (unless the site does a server-side double-check) · **verified**
- **[AgeGO](https://agego.com)** — Basic + advanced integration; server-to-server mode (may fail if site does additional checks) · untested — only reachable inside a real AgeGO integration
- **[AgeVerif.com](https://demo.ageverif.com/)** — Basic integration; advanced and OAuth2 flows are not handled · **verified**
- **[AliExpress](https://aliexpress.com/)** — "For adults" items (removes blur/modal/overlays, including suggested products) · **verified** (de-blur rule; not exercised on a live adult-flagged listing)
- **[Bluesky](https://bsky.app)** — Sensitive posts without login (automod + self-labelled posts); media revealed by clicking "Show" · untested
- **[Reddit](https://reddit.com)** — NSFW communities (works best logged out; consider [redlib](https://redlib.catsarch.com/) for a fully private Reddit frontend) · **partially broken** — see below
- **[SpankBang](https://spankbang.com)** — View videos even when logged out (removes blur/overlay and neutralizes the age verification modal) · untested
- **[Veriff](https://veriff.com)** — Works on only a few sites (don't expect it to work everywhere) · untested — only reachable inside a real Veriff integration
- **[x.com / Twitter](https://x.com)** — **does not match the current API** — see below. Originally targeted `TweetResultByRestId`, `TweetDetail`, `UserOriginalsTimeline` and `UserTweetsAndReplies`; requires being logged in (ported from upstream 1.2.4, still BETA upstream)
- **[Cosxplay](https://cosxplay.com)** — Blocks the age verification script (`age.js`) · untested
- **[AngeloGodsHack](https://angelogodshackxxx.com)** — Removes the age gate modal · untested
- **[rule34.xxx](https://rule34.xxx)** — Geographical IP block — shows a Tor Browser hint (no direct bypass, same as upstream) · **verified**
- **[xHamster](https://xhamster.com)** — Geographical IP block — shows a Tor Browser hint (no direct bypass, same as upstream) · untested — the trigger is geo-gated and does not fire from every region

### Status labels

- **verified** — checked in a real browser against the live service.
- *partially broken* — a known gap, described below.
- *untested* — covered by the test suite only. The code path exists and is
  exercised in CI, but nobody has run it against the real site. Expect breakage.

### x.com: the rules target an API the app no longer uses

The rules match on URL substring only, so the transport (fetch or XHR) does not
matter — the endpoint name does. Observed on a logged-in x.com session, with the
script installed and its hooks confirmed live (`fetchOurs`, `xhrOurs`):

```
XHR  https://x.com/i/api/1.1/flow/timeline.json          <- the home timeline
XHR  https://x.com/i/api/1.1/friends/following/list.json
XHR  https://x.com/i/api/graphql/viewer_context.json
XHR  https://x.com/i/api/graphql/q4Npr1.../ViewerBadgeCounts
XHR  https://x.com/i/api/fleets/v1/avatar_content
```

No API traffic goes through `fetch` at all. The home timeline is served by
`/i/api/1.1/flow/timeline.json`, which no rule covers, so nothing is unblurred
there. This part is settled.

What is **not** settled: the four targeted endpoints (`TweetResultByRestId`,
`TweetDetail`, `UserOriginalsTimeline`, `UserTweetsAndReplies`) did not appear
either — but only home-timeline traffic was observed. A profile page and a
single-post view were never visited with instrumentation active, so those four
rules are unsupported by evidence, not proven dead. They are left in place on
purpose; deleting them would discard possibly-working code on the strength of an
absence I cannot explain.

Fixing the timeline path means writing a rewrite for `flow/timeline.json`, which
needs the real response shape. That shape could not be captured: the response
returns `status 200` with a zero-length body at `readyState 4`, read through the
native `responseText` descriptor, because the app consumes the body before page
script can observe it. Guessing at the field names would repeat the exact class
of mistake this file exists to correct.

### Reddit: injected styles do not survive

Reddit deletes `<style>` elements that it did not create. A `<style>` injected
by this script is gone within seconds.

This is not a CSP problem: Reddit's policy is
`style-src 'self' 'unsafe-inline' www.redditstatic.com ...`, which permits
injected styles. The removal is active.

That breaks the `.rpl-scroll-lock { overflow: auto !important; }` rule, which is
how the scroll lock is defeated. Since 1.7.9 used `GM_addStyle`, which the
manager applies outside the page's DOM, this is a regression.

Re-adding the style in a loop is not a fix. It livelocks the tab: the script
stops responding to execution entirely, and even a cleanup script times out. Do
not attempt it.

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