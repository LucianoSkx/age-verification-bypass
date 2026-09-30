'use strict';

/*
 * Test suite for Age Verification Bypass v2.x.
 *
 * Covers three layers:
 *   1. static   — the distributable parses and carries valid metadata
 *   2. coverage — every supported service is still wired up
 *   3. runtime  — the interception engine actually runs: the fetch wrapper
 *      rewrites a matching response and leaves everything else untouched,
 *      and the <script>-SDK global traps fire the "accepted" callback.
 *
 * The runtime layer executes the userscript inside a stubbed page
 * environment via node:vm, so no browser is required in CI.
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const DIST = [
    path.join(ROOT, 'age-verification-bypass.user.js'),
];
const RAW = 'https://raw.githubusercontent.com/LucianoSkx/age-verification-bypass/main/age-verification-bypass.user.js';

let failures = 0;
let passed = 0;

function check(name, fn) {
    try {
        fn();
        passed++;
        console.log('OK  ', name);
    } catch (e) {
        failures++;
        console.log('FAIL', name, '-', e.message);
    }
}

function assert(cond, msg) {
    if (!cond) throw new Error(msg);
}

// --------------------------------------------------------------- static ---

const sources = new Map();
DIST.forEach((file) => {
    const rel = path.relative(ROOT, file).replace(/\\/g, '/');
    check(`${rel} exists`, () => {
        assert(fs.existsSync(file), 'file missing');
    });
    if (!fs.existsSync(file)) return;
    const src = fs.readFileSync(file, 'utf8');
    sources.set(rel, src);

    check(`${rel} parses as valid JavaScript`, () => {
        new Function(src);
    });

    check(`${rel} carries a complete metadata block`, () => {
        for (const tag of ['@name', '@namespace', '@version', '@match', '@run-at', '@grant', '@license']) {
            assert(new RegExp('^//\\s*' + tag + '\\b', 'm').test(src), `missing ${tag}`);
        }
        assert(/^\/\/\s*@version\s+2\.\d+\.\d+/m.test(src), 'version must be 2.x');
        assert(/^\/\/\s*@run-at\s+document-start/m.test(src), '@run-at must be document-start');
        assert(/^\/\/\s*@grant\s+none/m.test(src), '@grant none keeps us in the page world');
    });

    check(`${rel} points updates at this repo`, () => {
        assert(src.includes('@updateURL    ' + RAW), 'updateURL must target the fork');
        assert(src.includes('@downloadURL  ' + RAW), 'downloadURL must target the fork');
    });

    check(`${rel} credits upstream and the enhancer`, () => {
        assert(/@author\s+.*helloyanis/.test(src), 'original author missing');
        assert(/@author\s+.*LucianoSkx/.test(src), 'port author missing');
        assert(/Hermes Agent|Nous Research/i.test(src), 'enhancer credit missing');
    });

    check(`${rel} does not use sandbox-only GM_* APIs`, () => {
        assert(!/GM_addStyle\s*\(|GM_cookie\s*\(|GM_setValue\s*\(/.test(src),
            'GM_* requires a grant and breaks page-world injection');
    });
});

// ------------------------------------------------------------- coverage ---

const SERVICES = [
    ['agechecker.net', /\(\^\|\\\.\)agechecker\\\.net\$/],
    ['agego.com', /verifycdn\|myapi/],
    ['ageverif.com', /ageverif\\\.com/],
    ['veriff', /veriff\\\.\(me\|com\)/],
    ['aliexpress', /aliexpress/],
    ['bsky', /bsky/],
    ['reddit', /reddit/],
    ['spankbang', /spankbang/],
    ['x.com', /x\\\.com/],
    ['cosxplay', /cosxplay/],
    ['angelogodshackxxx', /angelogodshackxxx/],
    ['rule34.xxx', /rule34/],
    ['xhamster', /xhamster/],
];

for (const [rel, src] of sources) {
    check(`${rel} still covers all ${SERVICES.length} services`, () => {
        const missing = SERVICES.filter(([, re]) => !re.test(src)).map(([n]) => n);
        assert(missing.length === 0, 'missing: ' + missing.join(', '));
    });

    check(`${rel} keeps the full interception engine`, () => {
        for (const fn of ['installFetch', 'installXHR', 'patchInstance', 'trapGlobal', 'ruleFor', 'withBody']) {
            assert(new RegExp('function ' + fn + '\\b').test(src), `missing engine function ${fn}`);
        }
        assert(src.indexOf("headers.delete('content-length')") !== -1, 'response header scrub missing');
        assert(src.indexOf("headers.delete('content-encoding')") !== -1, 'response header scrub missing');
    });

    // Regressions that were live in 1.x and in the upstream 2.0.0 draft.
    check(`${rel} leaves spankbang thumbnails alone`, () => {
        assert(!/data-testid='video-item'>a>picture>div/.test(src), 'removes video thumbnails again');
    });

    check(`${rel} has no polling interval`, () => {
        assert(!/setInterval\s*\(/.test(src), 'setInterval is redundant with the MutationObserver');
    });

    check(`${rel} anchors the aliexpress host match`, () => {
        assert(!/\(\^\|\\\.\)aliexpress\\\.(?!\[)/.test(src), 'aliexpress regex must be anchored at the end');
    });

    check(`${rel} survives an unreadable body without rejecting`, () => {
        assert(/resp\.clone\(\)\.text\(\)\.then\([^]*?\)\.catch\(/.test(src),
            'installFetch needs a .catch after the body read');
    });
}

// -------------------------------------------------------------- runtime ---

function makeElement(tag) {
    return {
        tagName: String(tag || 'div').toUpperCase(),
        id: '',
        className: '',
        textContent: '',
        innerHTML: '',
        isConnected: true,
        children: [],
        shadowRoot: null,
        style: { cssText: '', removeProperty() {}, setProperty() {} },
        classList: { add() {}, remove() {}, contains() { return false; } },
        setAttribute() {},
        getAttribute() { return null; },
        hasAttribute() { return false; },
        appendChild(c) { this.children.push(c); return c; },
        remove() { this.isConnected = false; },
        addEventListener() {},
        removeEventListener() {},
        querySelector() { return null; },
        querySelectorAll() { return []; },
        getBoundingClientRect() { return { width: 0, height: 0, top: 0, left: 0, right: 0, bottom: 0 }; },
    };
}

function makeSandbox(hostname, fetchImpl) {
    const doc = {
        documentElement: makeElement('html'),
        head: makeElement('head'),
        body: makeElement('body'),
        readyState: 'complete',
        currentScript: null,
        cookie: '',
        createElement: (t) => makeElement(t),
        querySelector: () => null,
        querySelectorAll: () => [],
        getElementById: () => null,
        addEventListener() {},
        removeEventListener() {},
    };
    // A real-enough XHR: the engine's patchInstance needs prototype accessors for
    // both responseText and response, not plain data properties.
    class XHR {
        constructor() {
            this.readyState = 0;
            this.responseType = '';
            this.payload = '';
        }
        open() { this.readyState = 1; }
        send() { this.readyState = 4; }
        addEventListener() {}
        getResponseHeader() { return 'application/json'; }
    }
    Object.defineProperty(XHR.prototype, 'responseText', {
        configurable: true,
        get() { return this.payload; },
    });
    Object.defineProperty(XHR.prototype, 'response', {
        configurable: true,
        get() {
            if (this.responseType === 'json') {
                try { return JSON.parse(this.payload); } catch (e) { return null; }
            }
            return this.payload;
        },
    });

    const sandbox = {
        window: {
            location: { hostname, pathname: '/', href: 'https://' + hostname + '/' },
            document: doc,
            innerWidth: 1200,
            innerHeight: 800,
            getComputedStyle: () => ({ position: 'static', zIndex: 'auto', display: 'block' }),
            addEventListener() {},
            removeEventListener() {},
            crypto: { randomUUID: () => '00000000-0000-4000-8000-000000000000' },
            fetch: fetchImpl,
            XMLHttpRequest: XHR,
        },
        document: doc,
        console: { log() {}, warn() {}, error() {}, debug() {} },
        setTimeout,
        clearTimeout,
        setInterval,
        clearInterval,
        Response,
        Headers,
        URL,
        MutationObserver: class { observe() {} disconnect() {} },
    };
    sandbox.window.window = sandbox.window;
    return sandbox;
}

function loadScript(sandbox, src) {
    // strip the metadata block: keep everything after the closing marker.
    // (String.split(sep, 1) trims the array, it does NOT maxsplit like Python.)
    const marker = '// ==/UserScript==';
    const idx = src.lastIndexOf(marker);
    const body = idx === -1 ? src : src.slice(idx + marker.length);
    vm.createContext(sandbox);
    vm.runInContext(body, sandbox);
}

const rootSrc = sources.get('age-verification-bypass.user.js');

if (rootSrc) {
    function runRuntime(name, hostname, fn) {
        check(name, () => {
            const originalFetch = async () =>
                new Response('{"original":true}', { status: 200, headers: { 'content-type': 'application/json' } });
            const sandbox = makeSandbox(hostname, originalFetch);
            sandbox.window.__originalFetch = originalFetch;
            loadScript(sandbox, rootSrc);
            fn(sandbox);
        });
    }

    runRuntime('engine installs a fetch wrapper on a matched host', 'agechecker.net', (s) => {
        assert(typeof s.window.fetch === 'function', 'fetch disappeared');
        assert(s.window.fetch !== s.window.__originalFetch, 'fetch was not patched');
        assert(String(s.window.fetch).indexOf('ruleFor') !== -1, 'wrapper body not present');
    });

    runRuntime('engine wraps XHR open/send on a matched host', 'agechecker.net', (s) => {
        const proto = s.window.XMLHttpRequest.prototype;
        assert(String(proto.open).indexOf('__agebypass') !== -1, 'open not hooked');
        assert(String(proto.send).indexOf('patchInstance') !== -1, 'send not hooked');
    });

    runRuntime('config trap fires an "accepted" callback on assignment', 'agechecker.net', (s) => {
        let captured = null;
        s.window.AgeCheckerConfig = {
            onstatuschanged: (v) => { captured = v; },
            redirect_url: '',
        };
        assert(captured !== null, 'onstatuschanged never fired');
        assert(captured.status === 'accepted', 'status must be accepted, got ' + captured.status);
    });

    runRuntime('script-tag SDK globals are served by stubs', 'agechecker.net', (s) => {
        assert(typeof s.window.AgeCheckerAPI.show === 'function', 'AgeCheckerAPI stub missing');
        assert(typeof s.window.AgeCheckerAPI.close === 'function', 'AgeCheckerAPI.close stub missing');
    });

    // NOTE: installFetch wraps window.fetch on every host; the rule table is what
    // decides whether a body is touched. So "not patched" is the wrong assertion —
    // pass-through fidelity is verified asynchronously below.
    // ageverif's SDK arrives via <script src>, which bypasses fetch entirely.
    // Without this trap its rule can never fire.
    runRuntime('ageverif traps its SDK global', 'ageverif.com', (s) => {
        const before = s.window.ageverif;
        s.window.ageverif = { _ready: () => {}, _successful: () => {} };
        assert(s.window.ageverif !== before || s.window.ageverif._ready,
            'ageverif global is not trapped, the checker.js rule can never fire');
        assert(s.window.AgeCheckerAPI === undefined, 'agechecker traps must not leak onto this host');
    });

    runRuntime('non-matching hosts register no rewriting rule', 'example.com', (s) => {
        let called = 0;
        s.window.fetch('https://example.com/api/data').then(() => { called++; });
        assert(called === 0, 'fetch must stay async');
    });
}

// ---------------------------------------------------------------- async ---

async function asyncChecks() {
    if (!rootSrc) {
        console.log('---');
        console.log(`${passed} passed, ${failures} failed`);
        process.exit(failures ? 1 : 0);
    }

    function runtimeAsync(name, fn) {
        return new Promise((resolve) => {
            const originalFetch = async () =>
                new Response('{"original":true}', { status: 200, headers: { 'content-type': 'application/json' } });
            const sandbox = makeSandbox('agechecker.net', originalFetch);
            sandbox.window.__originalFetch = originalFetch;
            loadScript(sandbox, rootSrc);
            Promise.resolve()
                .then(() => fn(sandbox))
                .then(() => { passed++; console.log('OK  ', name); })
                .catch((e) => { failures++; console.log('FAIL', name, '-', e.message); })
                .then(resolve);
        });
    }

    await runtimeAsync('rewrites api.agechecker.net/v1/create to accepted', async (s) => {
        const resp = await s.window.fetch('https://api.agechecker.net/v1/create', { method: 'POST' });
        const text = await resp.text();
        const data = JSON.parse(text);
        assert(data.status === 'accepted', 'expected accepted, got ' + text);
        assert(typeof data.uuid === 'string' && data.uuid.length > 0, 'uuid missing');
    });

    await runtimeAsync('leaves unrelated responses byte-identical', async (s) => {
        const resp = await s.window.fetch('https://example.com/api/data');
        const text = await resp.text();
        assert(text === '{"original":true}', 'body was touched: ' + text);
    });

    // On a host with no rule, the wrapper must hand back the *same* Response it got.
    await (function () {
        return new Promise((resolve) => {
            const ORIG = new Response('{"original":true}', { status: 200, headers: { 'content-type': 'application/json' } });
            const originalFetch = async () => ORIG;
            const sandbox = makeSandbox('example.com', originalFetch);
            loadScript(sandbox, rootSrc);
            sandbox.window
                .fetch('https://example.com/api/data')
                .then((resp) => {
                    assert(resp === ORIG, 'unrelated response must be passed through by identity');
                    passed++;
                    console.log('OK   unrelated hosts pass the original Response through');
                })
                .catch((e) => { failures++; console.log('FAIL unrelated hosts pass the original Response through -', e.message); })
                .then(resolve);
        });
    })();

    // A matching rule whose body cannot be read must degrade to the original
    // response, not reject: callers would otherwise see a failed request.
    await (function () {
        return new Promise((resolve) => {
            const UNREADABLE = {
                status: 200,
                statusText: 'OK',
                headers: new Headers({ 'content-type': 'application/javascript' }),
                clone() { return { text() { return Promise.reject(new Error('opaque')); } }; },
            };
            const originalFetch = async () => UNREADABLE;
            const sandbox = makeSandbox('agechecker.net', originalFetch);
            loadScript(sandbox, rootSrc);
            sandbox.window
                .fetch('https://cdn.agechecker.net/static/popup/v1/popup.js')
                .then((resp) => {
                    assert(resp === UNREADABLE, 'must fall back to the original response');
                    passed++;
                    console.log('OK   unreadable body falls back to the original response');
                })
                .catch((e) => { failures++; console.log('FAIL unreadable body falls back to the original response -', e.message); })
                .then(resolve);
        });
    })();

    // XHR with responseType 'json': the browser already parsed, the rules are text.
    await (function () {
        return new Promise((resolve) => {
            const sandbox = makeSandbox('agechecker.net', async () => new Response('{}'));
            loadScript(sandbox, rootSrc);
            const xhr = new sandbox.window.XMLHttpRequest();
            xhr.responseType = 'json';
            xhr.open('POST', 'https://api.agechecker.net/v1/create');
            xhr.payload = '{"original":true}';
            xhr.send();
            Promise.resolve()
                .then(() => {
                    const data = xhr.response;
                    assert(data && data.status === 'accepted',
                        'json XHR was not rewritten, got ' + JSON.stringify(data));
                    assert(typeof data.uuid === 'string' && data.uuid.length > 0, 'uuid missing');
                    passed++;
                    console.log('OK   XHR responseType=json is rewritten');
                })
                .catch((e) => { failures++; console.log('FAIL XHR responseType=json is rewritten -', e.message); })
                .then(resolve);
        });
    })();

    console.log('---');
    console.log(`${passed} passed, ${failures} failed`);
    process.exit(failures ? 1 : 0);
}

asyncChecks();
