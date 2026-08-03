// ==UserScript==
// @name         Age Verification Bypass
// @namespace    https://github.com/LucianoSkx/age-verification-bypass
// @version      1.5.0
// @description  Bypass age verification popups on AgeChecker.net, AgeGO, AgeVerif.com, AliExpress, Bluesky, Reddit and Veriff. Removes blur, modals and overlays on NSFW content. No data collected. Port of helloyanis' Firefox add-on.
// @description:pt-BR  Remove popups de verificação de idade em AgeChecker.net, AgeGO, AgeVerif.com, AliExpress, Bluesky, Reddit e Veriff. Remove desfoque, popups e overlays de conteúdo NSFW. Nenhum dado é coletado. Port do add-on Firefox do helloyanis.
// @icon         data:image/png;base64,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
// @author       helloyanis (original), LucianoSkx (port)
// @match        *://*/*
// @grant        GM_xmlhttpRequest
// @grant        GM_addStyle
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_registerMenuCommand
// @grant        GM_unregisterMenuCommand
// @grant        GM_openInTab
// @grant        GM_info
// @run-at       document-start
// @license      MIT
// @homepageURL  https://github.com/helloyanis/age-verification-bypass
// @supportURL   https://github.com/helloyanis/age-verification-bypass/issues
// @updateURL    https://raw.githubusercontent.com/LucianoSkx/age-verification-bypass/main/age-verification-bypass.user.js
// @downloadURL  https://raw.githubusercontent.com/LucianoSkx/age-verification-bypass/main/age-verification-bypass.user.js
// ==/UserScript==

(function () {
    'use strict';

    // ============================
    // agechecker.net
    // ============================
    (function () {
        if (!/cdn\.agechecker\.net/.test(window.location.hostname) && !/api\.agechecker\.net|sa\.agechecker\.net/.test(window.location.hostname)) return;

        console.log("[agechecker.net bypass] Running");

        const originalFetch = window.fetch;
        window.fetch = async function (...args) {
            const [url] = args;
            if (url.includes('cdn.agechecker.net/static/popup/v1/popup.js')) {
                try {
                    const response = await originalFetch.apply(this, args);
                    const text = await response.clone().text();

                    const modified = `(function (w) {
  const config = w.AgeCheckerConfig || {};

  function complete() {
    if (typeof config.onstatuschanged === 'function') {
      config.onstatuschange({"uuid": crypto.randomUUID(), "status": "accepted"});
    }
    if (config.redirect_url) {
      w.location.href = config.redirect_url;
      return;
    }
    if (typeof config.onclose === 'function') {
      config.onclose();
    }
    if (typeof config.onclosed === 'function') {
      config.onclosed();
    }
  }

  w.AgeCheckerAPI = {
    show: function () { complete(); },
    close: function () { complete(); }
  };

  if (typeof config.onready === 'function') {
    config.onready();
  }
})(window);`;

                    return new Response(modified, {
                        status: response.status,
                        statusText: response.statusText,
                        headers: response.headers
                    });
                } catch (e) {
                    console.error("[agechecker.net bypass] Error:", e);
                }
            }
            if (url.includes('api.agechecker.net/v1/create') || url.includes('sa.agechecker.net/ac_create')) {
                try {
                    const response = await originalFetch.apply(this, args);
                    const uuid = crypto.randomUUID();
                    const modified = JSON.stringify({ uuid, status: "accepted" });
                    return new Response(modified, {
                        status: response.status,
                        statusText: response.statusText,
                        headers: response.headers
                    });
                } catch (e) {
                    console.error("[agechecker.net bypass] Error:", e);
                }
            }
            return originalFetch.apply(this, args);
        };
    })();

    // ============================
    // agego.com
    // ============================
    (function () {
        if (!/verifycdn\.agego\.com/.test(window.location.hostname) && !/myapi\.agego\.com/.test(window.location.hostname)) return;

        console.log("[agego.com bypass] Running");

        if (/verifycdn\.agego\.com/.test(window.location.hostname)) {
            const originalFetch = window.fetch;
            window.fetch = async function (...args) {
                const [url] = args;
                if (url.includes('verifycdn.agego.com/v1/verify.js')) {
                    try {
                        const response = await originalFetch.apply(this, args);
                        const text = await response.clone().text();

                        const modified = `(function () {
  const queue = window.AGEGO?.e;
  if (!Array.isArray(queue) || queue.length === 0) {
    console.warn("[agego.com bypass] AGEGO queue is empty");
    return;
  }
  let events;
  for (let i = queue.length - 1; i >= 0; i--) {
    const args = queue[i];
    for (let j = 0; j < args.length; j++) {
      const candidate = args[j];
      if (candidate && typeof candidate === "object" && candidate.events && typeof candidate.events === "object") {
        events = candidate.events;
        break;
      }
    }
    if (events) break;
  }
  if (!events) {
    console.warn("[agego.com bypass] No AGEGO events found.");
    return;
  }
  if (typeof events.onVerifiedBefore === "function") {
    console.debug("[agego.com bypass] Calling onVerifiedBefore callback.");
    events.onVerifiedBefore();
  } else if (typeof events.onAPIVerify === "function") {
    console.debug("[agego.com bypass] Calling onAPIVerify callback.");
    events.onAgeVerify();
  } else if (typeof events.onVerificationFlowEnd === "function") {
    console.debug("[agego.com bypass] Calling onVerificationFlowEnd callback.");
    events.onVerificationFlowEnd({});
  }
})();`;

                        return new Response(modified, {
                            status: response.status,
                            statusText: response.statusText,
                            headers: response.headers
                        });
                    } catch (e) {
                        console.error("[agego.com bypass] Error:", e);
                    }
                }
                return originalFetch.apply(this, args);
            };
        }

        if (/myapi\.agego\.com/.test(window.location.hostname)) {
            const originalFetch = window.fetch;
            window.fetch = async function (...args) {
                const [url] = args;
                if (url.includes('myapi.agego.com/s2s/start/')) {
                    try {
                        const redirectUrl = new URL(url).searchParams.get("returnto");
                        if (redirectUrl) {
                            window.location.href = redirectUrl;
                            return new Response("", { status: 302, headers: { Location: redirectUrl } });
                        }
                    } catch (e) {
                        console.error("[agego.com bypass] Error:", e);
                    }
                }
                return originalFetch.apply(this, args);
            };
        }
    })();

    // ============================
    // ageverif.com
    // ============================
    (function () {
        if (!/www\.ageverif\.com/.test(window.location.hostname)) return;

        console.log("[ageverif.com bypass] Running");

        const originalFetch = window.fetch;
        window.fetch = async function (...args) {
            const [url] = args;
            if (url.includes('www.ageverif.com/checker.js')) {
                try {
                    const response = await originalFetch.apply(this, args);
                    const text = await response.clone().text();

                    const modified = `(function () {
  function parseQuery(url) {
    const params = {};
    const queryString = url.split("?")[1] || "";
    queryString.split("&").forEach(part => {
      if (!part) return;
      const [key, value] = part.split("=");
      params[decodeURIComponent(key)] = value ? decodeURIComponent(value) : true;
    });
    return params;
  }

  function safeCall(fnName, payload) {
    if (!fnName) return;
    const fn = window[fnName];
    if (typeof fn === "function") {
      try { fn(payload); } catch (e) { console.error("[ageverif] callback error:", e); }
    }
  }

  function emit(eventName, detail) {
    window.dispatchEvent(new CustomEvent(eventName, { detail }));
    const legacyMap = {
      "ageverif:load": window.ageverifLoaded,
      "ageverif:ready": window.ageverifReady,
      "ageverif:success": window.ageverifSuccess
    };
    if (legacyMap[eventName]) {
      try { legacyMap[eventName](detail); } catch (e) { console.error("[ageverif] legacy handler error:", e); }
    }
  }

  function randomString(len = 24) {
    const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let out = "";
    for (let i = 0; i < len; i++) out += chars[Math.floor(Math.random() * chars.length)];
    return out;
  }

  function createVerification() {
    const now = Math.floor(Date.now() / 1000);
    const expiresIn = 100 * 365 * 24 * 60 * 60;
    return {
      uid: randomString(),
      country: "FR",
      countrySubdivision: null,
      assuranceLevel: "STRICT",
      ageThreshold: 0,
      reused: false,
      expiresAt: now + expiresIn,
      expiresIn,
      token: randomString(48)
    };
  }

  const scriptEl = document.currentScript;
  const src = scriptEl ? scriptEl.src : "";
  const params = parseQuery(src);
  const hasNoStart = Object.prototype.hasOwnProperty.call(params, "nostart");

  const config = {
    onload: params.onload,
    onready: params.onready,
    onsuccess: params.onsuccess,
    onclose: params.onclose,
    onerror: params.onerror
  };

  const ageverif = {
    started: false,
    events: {},
    on(event, handler) { if (!this.events[event]) this.events[event] = []; this.events[event].push(handler); },
    emitLocal(event, payload) { (this.events[event] || []).forEach(fn => { try { fn(payload); } catch (e) { console.error("[ageverif] local handler error:", e); } }); },
    start() {
      if (this.started) return;
      this.started = true;
      const verification = createVerification();
      const readyPayload = { verification };
      this.emitLocal("ready", readyPayload);
      emit("ageverif:ready", readyPayload);
      safeCall(config.onready, readyPayload);
      const successPayload = { verification };
      this.emitLocal("success", successPayload);
      emit("ageverif:success", successPayload);
      safeCall(config.onsuccess, successPayload);
      this.emitLocal("close", {});
      safeCall(config.onclose, {});
    }
  };

  window.ageverif = ageverif;

  let verificationForLoad = createVerification();
  const loadPayload = { verified: true, verification: verificationForLoad };
  emit("ageverif:load", loadPayload);
  safeCall(config.onload, loadPayload);

  if (window.ageverif && typeof window.ageverif.on === "function") {
    try {
      window.ageverif.on("ready", () => { ageverif.start(); });
    } catch (e) { console.warn("[ageverif] ageverif hook failed", e); }
  }

  if (!hasNoStart) {
    ageverif.start();
  }
})();`;

                    return new Response(modified, {
                        status: response.status,
                        statusText: response.statusText,
                        headers: response.headers
                    });
                } catch (e) {
                    console.error("[ageverif.com bypass] Error:", e);
                }
            }
            return originalFetch.apply(this, args);
        };
    })();

    // ============================
    // aliexpress.com
    // ============================
    (function () {
        if (!/aliexpress/.test(window.location.hostname)) return;

        console.log("[aliexpress.com bypass] Running");

        GM_addStyle(`
            .card-dsa-wrapper img {
               filter: none !important; -webkit-filter: none !important;
            }
            .dsa--visible--wrapper img {
               filter: none !important; -webkit-filter: none !important;
            }
        `);

        function cleanElements() {
            // Popup on the product page
            document.querySelectorAll(".J_SAFETY_FILER_MODAL").forEach(el => el.style.display = "none");

            // Remove the class that keeps the blur/overlay on product cards
            document.querySelectorAll(".card-dsa-wrapper").forEach(el => el.classList.remove("card-dsa-wrapper"));
            document.querySelectorAll(".dsa--visible--wrapper").forEach(el => el.classList.remove("dsa--visible--wrapper"));

            // Crossed eye icon in search results
            document.querySelectorAll("img[src='https://ae-pic-a1.aliexpress-media.com/kf/S082ae95bce89462b9548a1d53f222ab4p/72x72.png']").forEach(el => el.style.display = "none");

            // Blur on search results mobile
            document.querySelectorAll("div[data-anc='body']>div>div>div>div>div>div, div[data-spm='platformRecommendH5']>div>div>div").forEach(el => el.style.display = "none");

            // Remove the overlay over the products that opens the popup
            const cardList = document.querySelector("#card-list");
            if (cardList) {
                for (const item of cardList.children) {
                    const wrapper = item.querySelector(":scope > div");
                    if (!wrapper) continue;
                    const divs = wrapper.querySelectorAll(":scope > div");
                    if (divs.length === 2) {
                        divs[1].style.display = "none";
                    }
                }
            }

            // Recommended products on the product page
            document.querySelectorAll(".slick-slide").forEach(item => {
                const wrapper = item.querySelector(":scope > div > div > div");
                if (!wrapper) return;
                const divs = wrapper.querySelectorAll(":scope > div");
                if (divs.length === 2) {
                    divs[1].style.display = "none";
                }
            });
        }

        cleanElements();

        const observer = new MutationObserver(() => cleanElements());
        observer.observe(document.documentElement, { childList: true, subtree: true });

        // Re-run whenever a new batch of products is loaded
        const originalFetch = window.fetch;
        window.fetch = async function (...args) {
            const [url] = args;
            if (url.includes('aplus.aliexpress.com/Product.Exposure.Event') || url.includes('assets.aliexpress-media.com/g/AWSC/fireyejs/')) {
                try {
                    return await originalFetch.apply(this, args);
                } finally {
                    setTimeout(cleanElements, 0);
                }
            }
            return originalFetch.apply(this, args);
        };
    })();

    // ============================
    // bsky.app (Bluesky)
    // ============================
    (function () {
        if (!/bsky\.(app|social)/.test(window.location.hostname) && !/public\.api\.bsky\.app/.test(window.location.hostname)) return;

        console.log("[bsky.app bypass] Running");

        // Spoof label source to look like it came from Bluesky's automod,
        // which lets people see self-labelled (18+) posts even without login.
        function spoofBlueskyAutomod(post) {
            if (post?.labels) {
                post.labels.forEach(label => {
                    label.src = "did:plc:ar7c4by46qjdydhdevvrndac";
                });
            }
            return post;
        }

        const originalFetch = window.fetch;
        window.fetch = async function (...args) {
            const [url] = args;
            if (url.includes('public.api.bsky.app/xrpc/app.bsky.labeler.getServices')) {
                try {
                    const response = await originalFetch.apply(this, args);
                    const data = await response.clone().json();
                    data.views.forEach(view => {
                        view.policies.labelValueDefinitions = [];
                        view.policies.labelValues.forEach(label => {
                            view.policies.labelValueDefinitions.push({
                                adultOnly: false,
                                blurs: "media",
                                defaultSetting: "show",
                                identifier: label,
                                locales: [{
                                    description: `This content is labeled as ${label} and is unlocked by the age-verification bypass. If it contains media, click on "show" to view it.`,
                                    lang: "en",
                                    name: label
                                }],
                                severity: "inform"
                            });
                        });
                    });
                    return new Response(JSON.stringify(data), {
                        status: response.status,
                        statusText: response.statusText,
                        headers: response.headers
                    });
                } catch (e) {
                    console.error("[bsky.app bypass] Error:", e);
                }
            }
            if (url.includes('public.api.bsky.app/xrpc/app.bsky.ageassurance.getConfig')) {
                try {
                    const response = await originalFetch.apply(this, args);
                    const data = await response.clone().json();
                    data.regions = [];
                    return new Response(JSON.stringify(data), {
                        status: response.status,
                        statusText: response.statusText,
                        headers: response.headers
                    });
                } catch (e) {
                    console.error("[bsky.app bypass] Error:", e);
                }
            }
            if (url.includes('app.bsky.unspecced.getPostThreadV2')
                || url.includes('app.bsky.feed.getAuthorFeed')
                || url.includes('app.bsky.actor.getProfile')
                || url.includes('app.bsky.feed.getFeed')) {
                try {
                    const response = await originalFetch.apply(this, args);
                    const data = await response.clone().json();
                    if (url.includes('getProfile')) {
                        data.labels = [];
                    } else if (url.includes('getPostThreadV2')) {
                        data?.thread?.forEach(thread => { thread.value.post = spoofBlueskyAutomod(thread.value.post); });
                    } else if (url.includes('getAuthorFeed')) {
                        data?.feed?.forEach(feed => { feed.post = spoofBlueskyAutomod(feed.post); });
                    } else if (url.includes('getFeed')) {
                        data?.feed?.forEach(feed => { feed.post = spoofBlueskyAutomod(feed.post); });
                    }
                    return new Response(JSON.stringify(data), {
                        status: response.status,
                        statusText: response.statusText,
                        headers: response.headers
                    });
                } catch (e) {
                    console.error("[bsky.app bypass] Error:", e);
                }
            }
            return originalFetch.apply(this, args);
        };

        // Remove sensitive media hiders on the page
        function cleanBluesky() {
            document.querySelectorAll('div[data-testid="contentHider"], div[data-testid="contentHoor"], div[data-testid="blurred-media"]').forEach(el => el.remove());
        }
        cleanBluesky();
        const observer = new MutationObserver(() => {
            if (window.location.hostname.includes('bsky')) cleanBluesky();
        });
        observer.observe(document.documentElement, { childList: true, subtree: true });
    })();

    // ============================
    // reddit.com
    // ============================
    (function () {
        if (!/reddit/.test(window.location.hostname)) return;

        console.log("[reddit.com bypass] Running");

        const nsfwSubredditPopup = "configured-xpromo-blocking_xpromo_nsfw_blocking_desktop";
        const loginUpsell = "desktop-dynamic-upsell-dialog";
        const promptContainerTagName = "xpromo-nsfw-blocking-container";
        const TEST_IDS = ["nsfw-bypassable-modal-client-css", "experiences-client-css"];

        function removeRedditPopups() {
            if (document.getElementById(nsfwSubredditPopup)) document.getElementById(nsfwSubredditPopup).remove();
            if (document.getElementById(loginUpsell)) document.getElementById(loginUpsell).remove();
            const container = document.querySelector(promptContainerTagName);
            if (container?.shadowRoot?.querySelector(".prompt")) container.shadowRoot.querySelector(".prompt").remove();

            document.querySelectorAll(`style[data-testid]`).forEach(el => {
                if (TEST_IDS.includes(el.getAttribute("data-testid"))) el.remove();
            });
            Array.from(document.querySelectorAll("style")).filter(item => item.innerText?.includes(".rpl-scroll-lock"))[0]?.remove();
        }

        removeRedditPopups();

        const observer = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                for (const node of mutation.addedNodes) {
                    if (node.nodeType !== Node.ELEMENT_NODE) continue;
                    if (node.id === nsfwSubredditPopup || node.id === loginUpsell) { node.remove(); continue; }
                    if (node.tagName === promptContainerTagName.toUpperCase()) {
                        node.shadowRoot?.querySelector?.(".prompt")?.remove();
                    }
                    const target = node.querySelector?.(`#${CSS.escape(nsfwSubredditPopup)}`);
                    if (target) target.remove();
                    const target2 = node.querySelector?.(promptContainerTagName);
                    if (target2 && target2.shadowRoot) {
                        target2.shadowRoot.querySelector?.(".prompt")?.remove();
                    }
                }
            }
        });
        observer.observe(document.documentElement, { childList: true, subtree: true });

        // Remove CSS styles from response (handled by fetch interception for main_frame)
        const cssObserver = new MutationObserver(() => {
            document.querySelectorAll('style[data-testid]').forEach(el => {
                if (TEST_IDS.includes(el.getAttribute('data-testid'))) el.remove();
            });
        });
        cssObserver.observe(document.head || document.documentElement, { childList: true, subtree: true });
    })();

    // ============================
    // veriff.me
    // ============================
    (function () {
        if (!/veriff\.(me|com)/.test(window.location.hostname) && !/cdn\.veriff\.(me|com)/.test(window.location.hostname)) return;

        console.log("[veriff.me bypass] Running");

        const originalFetch = window.fetch;
        window.fetch = async function (...args) {
            const [url] = args;

            // Block session creation and redirect to callback
            if (url.includes('saas.veriff.com/api/v2/sessions')) {
                try {
                    const response = await originalFetch.apply(this, args);
                    const data = await response.clone().json();
                    if (data.vendorIntegration?.callback) {
                        window.location.href = data.vendorIntegration.callback;
                    }
                    return response;
                } catch (e) {
                    console.error("[veriff.me bypass] Error:", e);
                }
            }

            // Spoof JS SDK
            if (url.includes('cdn.veriff.me/sdk/js/1.5/veriff.min.js')) {
                try {
                    const response = await originalFetch.apply(this, args);
                    const text = await response.clone().text();
                    const modified = `(function (w) {
    function createResponse() {
        return {
            status: "success",
            verification: {
                id: crypto.randomUUID(),
                url: "",
                host: w.location.hostname,
                status: "approved",
                sessionToken: ""
            }
        };
    }
    w.Veriff = function (config) {
        config = config || {};
        return {
            setParams: function () {},
            mount: function () {
                if (typeof config.onSession === 'function') {
                    config.onSession(null, createResponse());
                }
            }
        };
    };
})(window);`;
                    return new Response(modified, {
                        status: response.status,
                        statusText: response.statusText,
                        headers: response.headers
                    });
                } catch (e) {
                    console.error("[veriff.me bypass] Error:", e);
                }
            }

            // Spoof Incontext SDK
            if (url.includes('cdn.veriff.me/incontext/js/v2.5.0/veriff.js')) {
                try {
                    const response = await originalFetch.apply(this, args);
                    const modified = `const MESSAGES = {
  STARTED: "STARTED",
  FINISHED: "FINISHED",
  SUBMITTED: "SUBMITTED",
};
window.veriffSDK = {
  createVeriffFrame({ onEvent }) {
    if (typeof onEvent !== "function") return;
    onEvent(MESSAGES.STARTED);
    onEvent(MESSAGES.FINISHED);
    onEvent(MESSAGES.SUBMITTED);
  },
};`;
                    return new Response(modified, {
                        status: response.status,
                        statusText: response.statusText,
                        headers: response.headers
                    });
                } catch (e) {
                    console.error("[veriff.me bypass] Error:", e);
                }
            }

            return originalFetch.apply(this, args);
        };
    })();

})();
