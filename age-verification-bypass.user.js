// ==UserScript==
// @name         Age Verification Bypass
// @namespace    https://github.com/LucianoSkx/age-verification-bypass
// @version      2.0.0
// @description  Bypass age verification on AgeChecker.net, AgeGO, AgeVerif.com, Veriff, AliExpress, Bluesky, Reddit, SpankBang, Cosxplay, angelogodshackxxx.com, x.com/Twitter, plus Tor hints for rule34/xHamster. Intercepts fetch, XHR and <script>-loaded SDKs. No data collected. Port of helloyanis' Firefox add-on; interception engine by xtalia/Hermes Agent.
// @description:pt-BR  Remove popups de verificação de idade em AgeChecker.net, AgeGO, AgeVerif.com, Veriff, AliExpress, Bluesky, Reddit, SpankBang, Cosxplay, angelogodshackxxx.com, x.com/Twitter, mais dicas Tor para rule34/xHamster. Intercepta fetch, XHR e SDKs carregados por <script>. Nenhum dado é coletado. Port do add-on Firefox do helloyanis; interception engine por xtalia/Hermes Agent.
// @author       helloyanis (original), LucianoSkx (port), xtalia/Hermes Agent (interception engine)
// @match        *://*/*
// @run-at       document-start
// @grant        none
// @license      MIT
// @homepageURL  https://github.com/LucianoSkx/age-verification-bypass
// @supportURL   https://github.com/LucianoSkx/age-verification-bypass/issues
// @updateURL    https://raw.githubusercontent.com/LucianoSkx/age-verification-bypass/main/age-verification-bypass.user.js
// @downloadURL  https://raw.githubusercontent.com/LucianoSkx/age-verification-bypass/main/age-verification-bypass.user.js
// @icon         https://raw.githubusercontent.com/helloyanis/age-verification-bypass/main/icon.svg
// ==/UserScript==


/*
 * WHY THIS VERSION:
 * The 1.x port patched only `window.fetch`, inside the userscript sandbox, so the
 * page never saw the patch. This rewrite fixes that and three other gaps:
 *   1. runs in the page world (@grant none, unsafeWindow when a grant is available)
 *   2. intercepts fetch AND XMLHttpRequest through one rule table
 *   3. pre-empts <script>-loaded SDKs by trapping their global config objects
 *   4. scrubs content-length/content-encoding when rewriting bodies
 *
 * Interception engine by xtalia/Hermes Agent, ported from
 * https://github.com/xtalia/age-verification-bypass
 *
 * KNOWN LIMITATION: if the manager refuses MAIN_WORLD injection because of the
 * page's CSP, @grant none also revokes unsafeWindow and every patch below lands
 * on the sandbox window again, silently. Verify with: AgeCheckerAPI in the console.
 */

(function () {
    'use strict';

    // Page world, whether we're injected raw (TM/VM with @grant none) or sandboxed (GM4).
    var W = (typeof unsafeWindow !== 'undefined' && unsafeWindow) ? unsafeWindow : window;
    var D = W.document;
    var HOST = W.location.hostname || '';

    // ---------------------------------------------------------------- utils ---

    function log() {
        try { console.log.apply(console, ['%c[age-bypass]', 'color:#4fc3f7'].concat([].slice.call(arguments))); } catch (e) {}
    }

    function uuid() {
        try {
            if (W.crypto && W.crypto.randomUUID) return W.crypto.randomUUID();
            if (W.crypto && W.crypto.getRandomValues) {
                var b = new Uint8Array(16); W.crypto.getRandomValues(b);
                b[6] = (b[6] & 0x0f) | 0x40; b[8] = (b[8] & 0x3f) | 0x80;
                var h = []; for (var i = 0; i < 16; i++) h.push((b[i] + 0x100).toString(16).slice(1));
                return h.slice(0, 4).join('') + '-' + h.slice(4, 6).join('') + '-' + h.slice(6, 8).join('') + '-' + h.slice(8, 10).join('') + '-' + h.slice(10).join('');
            }
        } catch (e) {}
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            var r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }

    function randStr(len) {
        var chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789', out = '';
        for (var i = 0; i < (len || 24); i++) out += chars.charAt(Math.floor(Math.random() * chars.length));
        return out;
    }

    // A plain <style> is subject to the page's style-src CSP. GM_addStyle was not,
    // which is the one capability @grant none gives up.
    function addStyle(css) {
        try {
            var s = D.createElement('style');
            s.textContent = css;
            (D.head || D.documentElement).appendChild(s);
        } catch (e) {}
    }

    function urlOf(input) {
        try {
            if (typeof input === 'string') return input;
            if (input && typeof input.url === 'string') return input.url;
            if (input && typeof input.href === 'string') return input.href;
            if (input && input.toString) return input.toString();
        } catch (e) {}
        return '';
    }

    // Rebuild a Response with a rewritten body, dropping headers that would lie.
    function withBody(resp, body) {
        var headers;
        try { headers = new Headers(resp.headers); } catch (e) { headers = new Headers(); }
        try { headers.delete('content-length'); } catch (e) {}
        try { headers.delete('content-encoding'); } catch (e) {}
        var init = { status: resp.status, statusText: resp.statusText, headers: headers };
        // 204/205/304 may not carry a body.
        if (resp.status === 204 || resp.status === 205 || resp.status === 304) return resp;
        try { return new Response(body, init); } catch (e) { return resp; }
    }

    function jsonRewrite(raw, mutator) {
        try {
            var data = JSON.parse(raw);
            var out = mutator(data);
            return JSON.stringify(out === undefined ? data : out);
        } catch (e) { return null; }
    }

    // Define an accessor on a global so an SDK's `window.X = {...}` assignment is
    // observed instead of racing us. Returns the stub the getter will serve.
    function trapGlobal(name, onSet, stubFactory) {
        var stored, stub;
        try {
            Object.defineProperty(W, name, {
                configurable: true,
                enumerable: true,
                get: function () {
                    if (stub === undefined) {
                        try { stub = stubFactory ? stubFactory() : stored; } catch (e) { stub = stored; }
                    }
                    return stub === undefined ? stored : stub;
                },
                set: function (v) {
                    stored = v;
                    try { if (onSet) onSet(v); } catch (e) { log('trap', name, e); }
                }
            });
            return true;
        } catch (e) { return false; }
    }

    // ---------------------------------------------------------- rule table ---

    // Each rule: { match(url) -> bool, run(raw, ctx) -> string|null }
    // ctx = { url, contentType, via }
    var RULES = [];

    function rule(match, run) {
        RULES.push({ match: match, run: run });
    }

    function ruleFor(url) {
        for (var i = 0; i < RULES.length; i++) {
            try { if (RULES[i].match(url)) return RULES[i]; } catch (e) {}
        }
        return null;
    }

    // ------------------------------------------------------- interception ---

    function installFetch() {
        var origFetch = W.fetch;
        if (typeof origFetch !== 'function') return;
        W.fetch = function (input, init) {
            var url = urlOf(input);
            var p = origFetch.apply(this, arguments);
            if (!url || !ruleFor(url)) return p;
            return p.then(function (resp) {
                try {
                    var r = ruleFor(url);
                    if (!r) return resp;
                    var ct = '';
                    try { ct = resp.headers.get('content-type') || ''; } catch (e) {}
                    return resp.clone().text().then(function (raw) {
                        var out = r.run(raw, { url: url, contentType: ct, via: 'fetch' });
                        return (out == null) ? resp : withBody(resp, out);
                    // The outer try/catch only sees synchronous throws. An unreadable
                    // body (opaque-redirect, already-consumed clone) rejects here and
                    // would surface as a failed fetch instead of the original response.
                    }).catch(function () { return resp; });
                } catch (e) { log('fetch transform failed', url, e); return resp; }
            });
        };
        log('fetch interception installed');
    }

    function installXHR() {
        var XHR = W.XMLHttpRequest;
        if (!XHR || !XHR.prototype) return;
        var proto = XHR.prototype;
        var open = proto.open;
        var send = proto.send;
        var nativeText = Object.getOwnPropertyDescriptor(proto, 'responseText');
        var nativeResp = Object.getOwnPropertyDescriptor(proto, 'response');

        proto.open = function (method, url) {
            try { this.__agebypass_url = urlOf(url); } catch (e) {}
            return open.apply(this, arguments);
        };

        proto.send = function () {
            try {
                var url = this.__agebypass_url;
                var r = url ? ruleFor(url) : null;
                if (r && nativeText && nativeResp) {
                    patchInstance(this, r, nativeText, nativeResp);
                }
            } catch (e) { log('xhr hook failed', e); }
            return send.apply(this, arguments);
        };
        log('XHR interception installed');
    }

    // Override the instance accessors so the page reads our transformed body,
    // not the raw one, no matter when it registered its own listener.
    function patchInstance(xhr, r, nativeText, nativeResp) {
        var doneText = false, doneResp = false, cacheText, cacheResp;

        function transform(raw) {
            try {
                var ct = '';
                try { ct = xhr.getResponseHeader('content-type') || ''; } catch (e) {}
                var out = r.run(raw, { url: xhr.__agebypass_url, contentType: ct, via: 'xhr' });
                return (out == null) ? raw : out;
            } catch (e) { return raw; }
        }

        try {
            Object.defineProperty(xhr, 'responseText', {
                configurable: true,
                get: function () {
                    if (xhr.readyState !== 4) return nativeText.get.call(xhr);
                    if (!doneText) {
                        doneText = true;
                        var raw = nativeText.get.call(xhr);
                        cacheText = transform(raw);
                    }
                    return cacheText;
                }
            });
            Object.defineProperty(xhr, 'response', {
                configurable: true,
                get: function () {
                    var type = xhr.responseType;
                    var isJson = type === 'json';
                    if (type && !isJson && type !== 'text') return nativeResp.get.call(xhr);
                    if (xhr.readyState !== 4) return nativeResp.get.call(xhr);
                    if (!doneResp) {
                        doneResp = true;
                        var native = nativeResp.get.call(xhr);
                        if (isJson) {
                            // The browser already parsed it, but every rule is
                            // text-based. Re-serialize, rewrite, parse back.
                            try { cacheResp = JSON.parse(transform(JSON.stringify(native))); }
                            catch (e) { cacheResp = native; }
                        } else {
                            cacheResp = transform(native);
                        }
                    }
                    return cacheResp;
                }
            });
        } catch (e) { log('xhr instance patch failed', e); }
    }

    // ============================================================ services ===

    // ---------------------------------------------------- agechecker.net ----
    (function () {
        if (!/(^|\.)agechecker\.net$/.test(HOST)) return;

        function acComplete(cfg) {
            cfg = cfg || {};
            try { if (typeof cfg.onready === 'function') cfg.onready(); } catch (e) {}
            var payload = { uuid: uuid(), status: 'accepted' };
            try { if (typeof cfg.onstatuschanged === 'function') cfg.onstatuschanged(payload); } catch (e) {}
            try {
                if (cfg.redirect_url) { W.location.href = cfg.redirect_url; return; }
            } catch (e) {}
            try { if (typeof cfg.onclose === 'function') cfg.onclose(); } catch (e) {}
            try { if (typeof cfg.onclosed === 'function') cfg.onclosed(); } catch (e) {}
        }

        // Works even when the SDK arrives via <script src> (fetch/XHR never see it):
        // the moment the page assigns its config, we immediately report "accepted".
        trapGlobal('AgeCheckerConfig', function (cfg) { acComplete(cfg); });
        trapGlobal('AgeCheckerAPI', null, function () {
            return {
                show: function () { acComplete(W.AgeCheckerConfig); },
                close: function () { acComplete(W.AgeCheckerConfig); }
            };
        });

        rule(function (u) { return u.indexOf('cdn.agechecker.net/static/popup/v1/popup.js') !== -1; },
            function () {
                return '(function (w) {\n' +
                    '  var config = w.AgeCheckerConfig || {};\n' +
                    '  function complete() {\n' +
                    '    if (typeof config.onstatuschanged === "function") config.onstatuschanged({ uuid: "' + uuid() + '", status: "accepted" });\n' +
                    '    if (config.redirect_url) { w.location.href = config.redirect_url; return; }\n' +
                    '    if (typeof config.onclose === "function") config.onclose();\n' +
                    '    if (typeof config.onclosed === "function") config.onclosed();\n' +
                    '  }\n' +
                    '  w.AgeCheckerAPI = { show: complete, close: complete };\n' +
                    '  if (typeof config.onready === "function") config.onready();\n' +
                    '})(window);';
            });

        rule(function (u) {
            return u.indexOf('api.agechecker.net/v1/create') !== -1 || u.indexOf('sa.agechecker.net/ac_create') !== -1;
        }, function (raw) {
            return JSON.stringify({ uuid: uuid(), status: 'accepted' });
        });

        log('agechecker.net armed');
    })();

    // ---------------------------------------------------------- agego.com ---
    (function () {
        if (!/^(verifycdn|myapi)\.agego\.com$/.test(HOST)) return;

        var agegoEvents = null;
        function agegoFire() {
            var ev = agegoEvents;
            if (!ev) return;
            try { if (typeof ev.onVerifiedBefore === 'function') return void ev.onVerifiedBefore(); } catch (e) {}
            try { if (typeof ev.onAgeVerify === 'function') return void ev.onAgeVerify(); } catch (e) {}
            try { if (typeof ev.onVerificationFlowEnd === 'function') return void ev.onVerificationFlowEnd({}); } catch (e) {}
        }
        function scanAgego() {
            for (var i = 0; i < arguments.length; i++) {
                var a = arguments[i];
                if (a && typeof a === 'object' && a.events && typeof a.events === 'object') {
                    agegoEvents = a.events; agegoFire(); return;
                }
            }
        }

        var agegoStub = {
            e: [],
            push: function () { scanAgego(arguments); try { scanAgego.apply(null, arguments); } catch (e) {} return this.e.length; }
        };
        trapGlobal('AGEGO', function (v) {
            try { if (v && v.e && v.e.length) scanAgego.apply(null, v.e); } catch (e) {}
        }, function () { return agegoStub; });

        rule(function (u) { return u.indexOf('verifycdn.agego.com/v1/verify.js') !== -1; }, function () {
            return '(function () {\n' +
                '  var queue = window.AGEGO && window.AGEGO.e;\n' +
                '  var events;\n' +
                '  if (Array.isArray(queue)) {\n' +
                '    for (var i = queue.length - 1; i >= 0 && !events; i--) {\n' +
                '      var args = queue[i];\n' +
                '      for (var j = 0; j < args.length; j++) {\n' +
                '        var c = args[j];\n' +
                '        if (c && typeof c === "object" && c.events) { events = c.events; break; }\n' +
                '      }\n' +
                '    }\n' +
                '  }\n' +
                '  if (!events) { console.warn("[agego] no events found"); return; }\n' +
                '  if (typeof events.onVerifiedBefore === "function") events.onVerifiedBefore();\n' +
                '  else if (typeof events.onAgeVerify === "function") events.onAgeVerify();\n' +
                '  else if (typeof events.onVerificationFlowEnd === "function") events.onVerificationFlowEnd({});\n' +
                '})();';
        });

        rule(function (u) { return u.indexOf('myapi.agego.com/s2s/start/') !== -1; }, function (raw, ctx) {
            try {
                var returnto = new URL(ctx.url).searchParams.get('returnto');
                if (returnto) { W.location.href = returnto; }
            } catch (e) {}
            return null;
        });

        log('agego.com armed');
    })();

    // ------------------------------------------------------ ageverif.com ----
    (function () {
        if (!/(^|\.)ageverif\.com$/.test(HOST)) return;

        rule(function (u) { return u.indexOf('www.ageverif.com/checker.js') !== -1; }, function () {
            // document.currentScript is null when the body is injected, so fall
            // back to scanning for the tag that requested checker.js.
            return '(function () {\n' +
                '  function parseQuery(url) {\n' +
                '    var params = {}, q = (url || "").split("?")[1] || "";\n' +
                '    q.split("&").forEach(function (part) {\n' +
                '      if (!part) return;\n' +
                '      var kv = part.split("=");\n' +
                '      params[decodeURIComponent(kv[0])] = kv[1] ? decodeURIComponent(kv[1]) : true;\n' +
                '    });\n' +
                '    return params;\n' +
                '  }\n' +
                '  function safeCall(name, payload) {\n' +
                '    if (!name) return;\n' +
                '    var fn = window[name];\n' +
                '    if (typeof fn === "function") { try { fn(payload); } catch (e) { console.error("[ageverif]", e); } }\n' +
                '  }\n' +
                '  function emit(name, detail) {\n' +
                '    window.dispatchEvent(new CustomEvent(name, { detail: detail }));\n' +
                '    var legacy = { "ageverif:load": window.ageverifLoaded, "ageverif:ready": window.ageverifReady, "ageverif:success": window.ageverifSuccess };\n' +
                '    if (legacy[name]) { try { legacy[name](detail); } catch (e) {} }\n' +
                '  }\n' +
                '  function randomString(len) {\n' +
                '    len = len || 24;\n' +
                '    var chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789", out = "";\n' +
                '    for (var i = 0; i < len; i++) out += chars.charAt(Math.floor(Math.random() * chars.length));\n' +
                '    return out;\n' +
                '  }\n' +
                '  function createVerification() {\n' +
                '    var now = Math.floor(Date.now() / 1000), expiresIn = 100 * 365 * 24 * 60 * 60;\n' +
                '    return { uid: randomString(), country: "FR", countrySubdivision: null, assuranceLevel: "STRICT", ageThreshold: 0, reused: false, expiresAt: now + expiresIn, expiresIn: expiresIn, token: randomString(48) };\n' +
                '  }\n' +
                '  function findSrc() {\n' +
                '    var el = document.currentScript;\n' +
                '    if (el && el.src) return el.src;\n' +
                '    var tags = document.querySelectorAll(\'script[src*="ageverif.com/checker.js"]\');\n' +
                '    return tags.length ? tags[tags.length - 1].src : "";\n' +
                '  }\n' +
                '  var params = parseQuery(findSrc());\n' +
                '  var hasNoStart = Object.prototype.hasOwnProperty.call(params, "nostart");\n' +
                '  var config = { onload: params.onload, onready: params.onready, onsuccess: params.onsuccess, onclose: params.onclose, onerror: params.onerror };\n' +
                '  var ageverif = {\n' +
                '    started: false, events: {},\n' +
                '    on: function (e, h) { (this.events[e] = this.events[e] || []).push(h); },\n' +
                '    emitLocal: function (e, p) { (this.events[e] || []).forEach(function (fn) { try { fn(p); } catch (x) {} }); },\n' +
                '    start: function () {\n' +
                '      if (this.started) return; this.started = true;\n' +
                '      var v = createVerification(), ready = { verification: v };\n' +
                '      this.emitLocal("ready", ready); emit("ageverif:ready", ready); safeCall(config.onready, ready);\n' +
                '      var ok = { verification: v };\n' +
                '      this.emitLocal("success", ok); emit("ageverif:success", ok); safeCall(config.onsuccess, ok);\n' +
                '      this.emitLocal("close", {}); safeCall(config.onclose, {});\n' +
                '    }\n' +
                '  };\n' +
                '  window.ageverif = ageverif;\n' +
                '  var loadPayload = { verified: true, verification: createVerification() };\n' +
                '  emit("ageverif:load", loadPayload); safeCall(config.onload, loadPayload);\n' +
                '  try { window.ageverif.on("ready", function () { ageverif.start(); }); } catch (e) {}\n' +
                '  if (!hasNoStart) ageverif.start();\n' +
                '})();';
        });

        log('ageverif.com armed');
    })();

    // -------------------------------------------------------- veriff.me -----
    (function () {
        if (!/(^|\.)veriff\.(me|com)$/.test(HOST)) return;

        function veriffResponse() {
            return {
                status: 'success',
                verification: { id: uuid(), url: '', host: W.location.hostname, status: 'approved', sessionToken: '' }
            };
        }

        // Trap the constructors too: covers <script src> SDK loading.
        trapGlobal('Veriff', null, function () {
            return function (config) {
                config = config || {};
                return {
                    setParams: function () {},
                    mount: function () {
                        if (typeof config.onSession === 'function') {
                            try { config.onSession(null, veriffResponse()); } catch (e) {}
                        }
                    }
                };
            };
        });
        trapGlobal('veriffSDK', null, function () {
            var M = { STARTED: 'STARTED', FINISHED: 'FINISHED', SUBMITTED: 'SUBMITTED' };
            return {
                createVeriffFrame: function (opts) {
                    opts = opts || {};
                    if (typeof opts.onEvent !== 'function') return;
                    try { opts.onEvent(M.STARTED); opts.onEvent(M.FINISHED); opts.onEvent(M.SUBMITTED); } catch (e) {}
                }
            };
        });

        rule(function (u) { return u.indexOf('saas.veriff.com/api/v2/sessions') !== -1; }, function (raw, ctx) {
            try {
                var data = JSON.parse(raw);
                var cb = data && data.vendorIntegration && data.vendorIntegration.callback;
                if (cb) W.location.href = cb;
            } catch (e) {}
            return null;
        });

        rule(function (u) { return u.indexOf('cdn.veriff.me/sdk/js/1.5/veriff.min.js') !== -1; }, function () {
            return '(function (w) {\n' +
                '  function createResponse() {\n' +
                '    return { status: "success", verification: { id: "' + uuid() + '", url: "", host: w.location.hostname, status: "approved", sessionToken: "" } };\n' +
                '  }\n' +
                '  w.Veriff = function (config) {\n' +
                '    config = config || {};\n' +
                '    return { setParams: function () {}, mount: function () { if (typeof config.onSession === "function") config.onSession(null, createResponse()); } };\n' +
                '  };\n' +
                '})(window);';
        });

        rule(function (u) { return u.indexOf('cdn.veriff.me/incontext/js/v2.5.0/veriff.js') !== -1; }, function () {
            return 'var MESSAGES = { STARTED: "STARTED", FINISHED: "FINISHED", SUBMITTED: "SUBMITTED" };\n' +
                'window.veriffSDK = {\n' +
                '  createVeriffFrame: function (o) {\n' +
                '    if (!o || typeof o.onEvent !== "function") return;\n' +
                '    o.onEvent(MESSAGES.STARTED); o.onEvent(MESSAGES.FINISHED); o.onEvent(MESSAGES.SUBMITTED);\n' +
                '  }\n' +
                '};';
        });

        log('veriff armed');
    })();

    // ------------------------------------------------------ aliexpress ------
    (function () {
        if (!/(^|\.)aliexpress\.[a-z.]+$/.test(HOST)) return;

        addStyle('.card-dsa-wrapper img, .dsa--visible--wrapper img { filter: none !important; -webkit-filter: none !important; }');

        function cleanElements() {
            D.querySelectorAll('.J_SAFETY_FILER_MODAL').forEach(function (el) { el.style.display = 'none'; });
            D.querySelectorAll('.card-dsa-wrapper').forEach(function (el) { el.classList.remove('card-dsa-wrapper'); });
            D.querySelectorAll('.dsa--visible--wrapper').forEach(function (el) { el.classList.remove('dsa--visible--wrapper'); });
            D.querySelectorAll("img[src='https://ae-pic-a1.aliexpress-media.com/kf/S082ae95bce89462b9548a1d53f222ab4p/72x72.png']").forEach(function (el) { el.style.display = 'none'; });
            D.querySelectorAll("div[data-anc='body']>div>div>div>div>div>div, div[data-spm='platformRecommendH5']>div>div>div").forEach(function (el) { el.style.display = 'none'; });

            var cardList = D.querySelector('#card-list');
            if (cardList) {
                for (var i = 0; i < cardList.children.length; i++) {
                    var wrapper = cardList.children[i].querySelector(':scope > div');
                    if (!wrapper) continue;
                    var divs = wrapper.querySelectorAll(':scope > div');
                    if (divs.length === 2) divs[1].style.display = 'none';
                }
            }
            D.querySelectorAll('.slick-slide').forEach(function (item) {
                var wrapper = item.querySelector(':scope > div > div > div');
                if (!wrapper) return;
                var divs = wrapper.querySelectorAll(':scope > div');
                if (divs.length === 2) divs[1].style.display = 'none';
            });
        }

        cleanElements();
        new MutationObserver(cleanElements).observe(D.documentElement, { childList: true, subtree: true });

        rule(function (u) {
            return u.indexOf('aplus.aliexpress.com/Product.Exposure.Event') !== -1
                || u.indexOf('assets.aliexpress-media.com/g/AWSC/fireyejs/') !== -1;
        }, function () { setTimeout(cleanElements, 0); return null; });

        log('aliexpress armed');
    })();

    // ----------------------------------------------------------- bsky -------
    (function () {
        if (!/(^|\.)bsky\.(app|social)$/.test(HOST)) return;

        function spoof(post) {
            if (post && post.labels && post.labels.forEach) {
                post.labels.forEach(function (label) { label.src = 'did:plc:ar7c4by46qjdydhdevvrndac'; });
            }
            return post;
        }

        rule(function (u) { return u.indexOf('app.bsky.labeler.getServices') !== -1; }, function (raw) {
            return jsonRewrite(raw, function (data) {
                (data.views || []).forEach(function (view) {
                    var p = view.policies || {};
                    p.labelValueDefinitions = [];
                    (p.labelValues || []).forEach(function (label) {
                        p.labelValueDefinitions.push({
                            adultOnly: false, blurs: 'media', defaultSetting: 'show', identifier: label,
                            locales: [{ description: 'Labeled as ' + label + '; unlocked by age-verification bypass. Click "show" for media.', lang: 'en', name: label }],
                            severity: 'inform'
                        });
                    });
                });
                return data;
            });
        });

        rule(function (u) { return u.indexOf('app.bsky.ageassurance.getConfig') !== -1; }, function (raw) {
            return jsonRewrite(raw, function (data) { data.regions = []; return data; });
        });

        rule(function (u) {
            return u.indexOf('app.bsky.unspecced.getPostThreadV2') !== -1
                || u.indexOf('app.bsky.feed.getAuthorFeed') !== -1
                || u.indexOf('app.bsky.actor.getProfile') !== -1
                || u.indexOf('app.bsky.feed.getFeed') !== -1;
        }, function (raw, ctx) {
            return jsonRewrite(raw, function (data) {
                var u = ctx.url;
                if (u.indexOf('getProfile') !== -1) { data.labels = []; }
                else if (u.indexOf('getPostThreadV2') !== -1) { (data.thread || []).forEach(function (t) { if (t && t.value && t.value.post) t.value.post = spoof(t.value.post); }); }
                else if (u.indexOf('getAuthorFeed') !== -1) { (data.feed || []).forEach(function (f) { f.post = spoof(f.post); }); }
                else if (u.indexOf('getFeed') !== -1) { (data.feed || []).forEach(function (f) { f.post = spoof(f.post); }); }
                return data;
            });
        });

        function clean() {
            D.querySelectorAll('div[data-testid="contentHider"], div[data-testid="contentHoor"], div[data-testid="blurred-media"]').forEach(function (el) { el.remove(); });
        }
        clean();
        new MutationObserver(clean).observe(D.documentElement, { childList: true, subtree: true });

        log('bsky armed');
    })();

    // ---------------------------------------------------------- reddit ------
    (function () {
        if (!/(^|\.)reddit\.com$/.test(HOST)) return;

        var POP1 = 'configured-xpromo-blocking_xpromo_nsfw_blocking_desktop';
        var POP2 = 'configured-xpromo-blocking_xpromo_nsfw_blocking';
        var UPSELL = 'desktop-dynamic-upsell-dialog';
        var CONTAINER = 'xpromo-nsfw-blocking-container';
        var STYLE_IDS = ['nsfw-bypassable-modal-client-css', 'experiences-client-css'];

        addStyle('.rpl-scroll-lock { overflow: auto !important; }');

        function killShadow(node) {
            try { var p = node.shadowRoot && node.shadowRoot.querySelector('.prompt'); if (p) p.remove(); } catch (e) {}
        }

        function clean() {
            [POP1, POP2, UPSELL].forEach(function (id) { var el = D.getElementById(id); if (el) el.remove(); });
            D.querySelectorAll(CONTAINER).forEach(killShadow);
            D.querySelectorAll('style[data-testid]').forEach(function (el) {
                if (STYLE_IDS.indexOf(el.getAttribute('data-testid')) !== -1) el.remove();
            });
            D.querySelectorAll('style').forEach(function (el) { if (el.textContent && el.textContent.indexOf('.rpl-scroll-lock') !== -1) el.remove(); });
        }

        clean();
        new MutationObserver(clean).observe(D.documentElement, { childList: true, subtree: true });
        new MutationObserver(clean).observe(D.head || D.documentElement, { childList: true, subtree: true });

        log('reddit armed');
    })();

    // ------------------------------------------------------- spankbang ------
    (function () {
        if (!/(^|\.)spankbang\.com$/.test(HOST)) return;

        try {
            var pre = D.createElement('script');
            pre.textContent = 'var showAdvancedAgeVerification=function(){},showAvRegistrationModal=function(){};';
            (D.head || D.documentElement).appendChild(pre);
            pre.remove();
        } catch (e) {}

        function clean() {
            try {
                var safety = D.querySelector('#safety-blur');
                if (safety) safety.style.display = 'none';
                D.querySelectorAll('.strong-blur').forEach(function (el) {
                    el.classList.remove('strong-blur');
                    el.style.filter = 'none'; el.style.backdropFilter = 'none';
                });
                [D.documentElement, D.body].forEach(function (n) { if (n) n.style.removeProperty('overflow'); });
            } catch (e) {}
        }

        clean();
        try { new MutationObserver(clean).observe(D.documentElement, { childList: true, subtree: true }); } catch (e) {}

        rule(function (u) { return u.indexOf('/users/av-registration') !== -1; }, function () { return ''; });

        D.addEventListener('DOMContentLoaded', clean);
        W.addEventListener('load', clean);

        log('spankbang armed');
    })();

    // ------------------------------------------------------------ x.com -----
    (function () {
        if (!/(^|\.)x\.com$/.test(HOST) && !/(^|\.)twitter\.com$/.test(HOST)) return;

        function unwrap(result) {
            if (!result || result.__typename !== 'TweetWithVisibilityResults' || !result.tweet) return result;
            var tweet = Object.assign({}, result.tweet);
            tweet.__typename = 'Tweet';
            var user = tweet.core && tweet.core.user_results && tweet.core.user_results.result;
            if (user && user.profile_metadata) user.profile_metadata.profile_interstitial_type = '';
            if (tweet.legacy) tweet.legacy.possibly_sensitive = false;
            return tweet;
        }

        function walkEntries(data, instructions) {
            (instructions || []).forEach(function (instruction) {
                if (!instruction || instruction.type !== 'TimelineAddEntries') return;
                (instruction.entries || []).forEach(function (entry) {
                    var tr = entry && entry.content && entry.content.itemContent && entry.content.itemContent.tweet_results;
                    if (tr) tr.result = unwrap(tr.result);
                    var items = entry && entry.content && entry.content.items;
                    (items || []).forEach(function (item) {
                        var itr = item && item.item && item.item.itemContent && item.item.itemContent.tweet_results;
                        if (itr) itr.result = unwrap(itr.result);
                    });
                });
            });
        }

        rule(function (u) { return u.indexOf('x.com/i/api/graphql/') !== -1; }, function (raw, ctx) {
            var u = ctx.url;
            return jsonRewrite(raw, function (data) {
                if (u.indexOf('TweetResultByRestId') !== -1) {
                    var result = data && data.data && data.data.tweetResult && data.data.tweetResult.result;
                    if (result && result.mediaVisibilityResults && result.tweet) data.data.tweetResult.result = unwrap(result);
                } else if (u.indexOf('TweetDetail') !== -1) {
                    var inst = data && data.data && data.data.threaded_conversation_with_injections_v2
                        && data.data.threaded_conversation_with_injections_v2.instructions;
                    walkEntries(data, inst);
                } else if (u.indexOf('UserOriginalsTimeline') !== -1 || u.indexOf('UserTweetsAndReplies') !== -1) {
                    var t = data && data.data && data.data.user && data.data.user.result && data.data.user.result.timeline
                        && data.data.user.result.timeline.timeline;
                    walkEntries(data, t && t.instructions);
                }
                return data;
            });
        });

        log('x.com armed');
    })();

    // --------------------------------------------------------- cosxplay -----
    (function () {
        if (!/(^|\.)cosxplay\.com$/.test(HOST)) return;

        try { D.cookie = 'abn_age_verified=1; path=/; max-age=31536000; SameSite=Lax'; } catch (e) {}

        var SEL = '#abn-age-overlay, .abn-age-overlay, .abn-age-modal, .abn-age-banner';

        function clean() {
            D.querySelectorAll(SEL).forEach(function (el) { el.remove(); });
            D.querySelectorAll('.abn-age-banner, .abn-age-badge, .abn-age-badge-tags, .abn-age-player-gate').forEach(function (el) { el.remove(); });
            if (D.documentElement) { D.documentElement.style.removeProperty('overflow'); D.documentElement.classList.remove('abn-age-lock'); }
            if (D.body) { D.body.style.removeProperty('overflow'); D.body.classList.remove('abn-locked', 'abn-age-locked', 'abn-age-lock'); }
        }

        clean();
        try { new MutationObserver(clean).observe(D.documentElement, { childList: true, subtree: true }); } catch (e) {}
        D.addEventListener('DOMContentLoaded', clean);
        W.addEventListener('load', clean);

        log('cosxplay armed');
    })();

    // ------------------------------------------------- angelogodshackxxx ----
    (function () {
        if (!/(^|\.)angelogodshackxxx\.com$/.test(HOST)) return;

        function clean() {
            D.querySelectorAll('.age-gate-modal, .age-gate, .age-verify-modal, #age-gate').forEach(function (el) { el.remove(); });
            [D.documentElement, D.body].forEach(function (n) { if (n) n.style.removeProperty('overflow'); });
        }
        clean();
        new MutationObserver(clean).observe(D.documentElement, { childList: true, subtree: true });
        D.addEventListener('DOMContentLoaded', clean);
        W.addEventListener('load', clean);

        log('angelogodshackxxx armed');
    })();

    // ------------------------------------------------------- Tor hints ------
    function torHint(id, html) {
        if (D.getElementById(id)) return;
        var b = D.createElement('div');
        b.id = id;
        b.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:2147483647;background:#1a1a2e;color:#fff;padding:12px 16px;text-align:center;font-family:system-ui,-apple-system,sans-serif;font-size:14px;box-shadow:0 2px 8px rgba(0,0,0,.4)';
        b.innerHTML = html + ' <span style="cursor:pointer;margin-left:12px;opacity:.7" data-avb-close>✕</span>';
        b.addEventListener('click', function (ev) { if (ev.target.hasAttribute('data-avb-close')) b.remove(); });
        (D.body || D.documentElement).appendChild(b);
    }

    function whenReady(fn) {
        if (D.readyState === 'loading') D.addEventListener('DOMContentLoaded', fn);
        else fn();
    }

    (function () {
        if (!/(^|\.)rule34\.xxx$/.test(HOST)) return;
        var H = 'This site uses geo-based age verification. Use the <a href="https://www.torproject.org/download/" target="_blank" style="color:#4fc3f7">Tor Browser</a> to get around it.';
        rule(function (u) { return u.indexOf('rule34.xxx/public/ageverify.php') !== -1; }, function () { whenReady(function () { torHint('avb-tor-hint', H); }); return null; });
        if (W.location.pathname.indexOf('ageverify.php') !== -1) whenReady(function () { torHint('avb-tor-hint', H); });
    })();

    (function () {
        if (!/(^|\.)xhamster\.com$/.test(HOST)) return;
        var H = 'Geo-based age verification. Use the <a href="https://www.torproject.org/download/" target="_blank" style="color:#4fc3f7">Tor Browser</a> to get around it.';
        rule(function (u) { return u.indexOf('collector.xhamster.com/?log=user-age-verification') !== -1; }, function () { whenReady(function () { torHint('avb-tor-hint-xh', H); }); return null; });
    })();

    // ----------------------------------------------------- start engines ----
    installFetch();
    installXHR();
})();
