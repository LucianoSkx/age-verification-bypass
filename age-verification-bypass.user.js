// ==UserScript==
// @name         Age Verification Bypass
// @namespace    https://github.com/LucianoSkx/age-verification-bypass
// @version      1.6.2
// @description  Bypass age verification popups on AgeChecker.net, AgeGO, AgeVerif.com, AliExpress, Bluesky, Reddit, SpankBang and Veriff (plus experimental x.com support). Removes blur, modals and overlays on NSFW content. No data collected. Port of helloyanis' Firefox add-on.
// @description:pt-BR  Remove popups de verificação de idade em AgeChecker.net, AgeGO, AgeVerif.com, AliExpress, Bluesky, Reddit, SpankBang e Veriff (mais suporte experimental a x.com). Remove desfoque, popups e overlays de conteúdo NSFW. Nenhum dado é coletado. Port do add-on Firefox do helloyanis.
// @icon         https://raw.githubusercontent.com/helloyanis/age-verification-bypass/main/icon.svg
// @author       helloyanis (original), LucianoSkx (port)
// @match        *://*/*
// @grant        GM_addStyle
// @run-at       document-start
// @license      MIT
// @homepageURL  https://github.com/LucianoSkx/age-verification-bypass
// @supportURL   https://github.com/LucianoSkx/age-verification-bypass/issues
// @updateURL    https://raw.githubusercontent.com/LucianoSkx/age-verification-bypass/main/age-verification-bypass.user.js
// @downloadURL  https://raw.githubusercontent.com/LucianoSkx/age-verification-bypass/main/age-verification-bypass.user.js
// ==/UserScript==

(function () {
    'use strict';

    // ============================
    // agechecker.net
    // ============================
    (function () {
        if (!/(^|\.)agechecker\.net$/.test(window.location.hostname)) return;

        console.log("[agechecker.net bypass] Running");

        const originalFetch = window.fetch;
        window.fetch = async function (...args) {
            const url = typeof args[0] === "string" ? args[0] : args[0]?.url || args[0]?.href || "";
            if (url.includes('cdn.agechecker.net/static/popup/v1/popup.js')) {
                const response = await originalFetch.apply(this, args);
                try {
                    const modified = `(function (w) {
  const config = w.AgeCheckerConfig || {};

  function complete() {
    if (typeof config.onstatuschanged === 'function') {
      config.onstatuschanged({"uuid": crypto.randomUUID(), "status": "accepted"});
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
                    return response;
                }
            }
            if (url.includes('api.agechecker.net/v1/create') || url.includes('sa.agechecker.net/ac_create')) {
                const response = await originalFetch.apply(this, args);
                try {
                    const uuid = crypto.randomUUID();
                    const modified = JSON.stringify({ uuid, status: "accepted" });
                    return new Response(modified, {
                        status: response.status,
                        statusText: response.statusText,
                        headers: response.headers
                    });
                } catch (e) {
                    console.error("[agechecker.net bypass] Error:", e);
                    return response;
                }
            }
            return originalFetch.apply(this, args);
        };
    })();

    // ============================
    // agego.com
    // ============================
    (function () {
        if (!/^(verifycdn|myapi)\.agego\.com$/.test(window.location.hostname)) return;

        console.log("[agego.com bypass] Running");

        if (/^verifycdn\.agego\.com$/.test(window.location.hostname)) {
            const originalFetch = window.fetch;
            window.fetch = async function (...args) {
                const url = typeof args[0] === "string" ? args[0] : args[0]?.url || args[0]?.href || "";
                if (url.includes('verifycdn.agego.com/v1/verify.js')) {
                    const response = await originalFetch.apply(this, args);
                    try {
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
  } else if (typeof events.onAgeVerify === "function") {
    console.debug("[agego.com bypass] Calling onAgeVerify callback.");
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
                        return response;
                    }
                }
                return originalFetch.apply(this, args);
            };
        }

        if (/^myapi\.agego\.com$/.test(window.location.hostname)) {
            const originalFetch = window.fetch;
            window.fetch = async function (...args) {
                const url = typeof args[0] === "string" ? args[0] : args[0]?.url || args[0]?.href || "";
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
        if (!/(^|\.)ageverif\.com$/.test(window.location.hostname)) return;

        console.log("[ageverif.com bypass] Running");

        const originalFetch = window.fetch;
        window.fetch = async function (...args) {
            const url = typeof args[0] === "string" ? args[0] : args[0]?.url || args[0]?.href || "";
            if (url.includes('www.ageverif.com/checker.js')) {
                const response = await originalFetch.apply(this, args);
                try {
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
                    return response;
                }
            }
            return originalFetch.apply(this, args);
        };
    })();

    // ============================
    // aliexpress.com
    // ============================
    (function () {
        if (!/(^|\.)aliexpress\./.test(window.location.hostname)) return;

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
            const url = typeof args[0] === "string" ? args[0] : args[0]?.url || args[0]?.href || "";
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
        if (!/(^|\.)bsky\.(app|social)$/.test(window.location.hostname)) return;

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
            const url = typeof args[0] === "string" ? args[0] : args[0]?.url || args[0]?.href || "";
            if (url.includes('public.api.bsky.app/xrpc/app.bsky.labeler.getServices')) {
                const response = await originalFetch.apply(this, args);
                try {
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
                    return response;
                }
            }
            if (url.includes('public.api.bsky.app/xrpc/app.bsky.ageassurance.getConfig')) {
                const response = await originalFetch.apply(this, args);
                try {
                    const data = await response.clone().json();
                    data.regions = [];
                    return new Response(JSON.stringify(data), {
                        status: response.status,
                        statusText: response.statusText,
                        headers: response.headers
                    });
                } catch (e) {
                    console.error("[bsky.app bypass] Error:", e);
                    return response;
                }
            }
            if (url.includes('app.bsky.unspecced.getPostThreadV2')
                || url.includes('app.bsky.feed.getAuthorFeed')
                || url.includes('app.bsky.actor.getProfile')
                || url.includes('app.bsky.feed.getFeed')) {
                const response = await originalFetch.apply(this, args);
                try {
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
                    return response;
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
        if (!/(^|\.)reddit\.com$/.test(window.location.hostname)) return;

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
            document.querySelectorAll("style").forEach(el => { if (el.textContent?.includes(".rpl-scroll-lock")) el.remove(); });
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
        if (!/(^|\.)veriff\.(me|com)$/.test(window.location.hostname)) return;

        console.log("[veriff.me bypass] Running");

        const originalFetch = window.fetch;
        window.fetch = async function (...args) {
            const url = typeof args[0] === "string" ? args[0] : args[0]?.url || args[0]?.href || "";

            // Block session creation and redirect to callback
            if (url.includes('saas.veriff.com/api/v2/sessions')) {
                const response = await originalFetch.apply(this, args);
                try {
                    const data = await response.clone().json();
                    if (data.vendorIntegration?.callback) {
                        window.location.href = data.vendorIntegration.callback;
                    }
                } catch (e) {
                    console.error("[veriff.me bypass] Error:", e);
                }
                return response;
            }

            // Spoof JS SDK
            if (url.includes('cdn.veriff.me/sdk/js/1.5/veriff.min.js')) {
                const response = await originalFetch.apply(this, args);
                try {
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
                    return response;
                }
            }

            // Spoof Incontext SDK
            if (url.includes('cdn.veriff.me/incontext/js/v2.5.0/veriff.js')) {
                const response = await originalFetch.apply(this, args);
                try {
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
                    return response;
                }
            }

            return originalFetch.apply(this, args);
        };
    })();

    // ============================
    // spankbang.com
    // ============================
    (function () {
        if (!/(^|\.)spankbang\.com$/.test(window.location.hostname)) return;

        console.log("[spankbang.com bypass] Running");

        // Neutralize the age verification modal functions so they never show.
        // Injected into page context as early as possible (document-start).
        function neutralize() {
            const script = document.createElement("script");
            script.textContent = `
                window.showAdvancedAgeVerification = function() {};
                window.showAvRegistrationModal = function() {};
            `;
            (document.head || document.documentElement).appendChild(script);
        }
        neutralize();

        function cleanSpankbang() {
            const safetyBlur = document.querySelector("#safety-blur");
            if (safetyBlur) safetyBlur.setAttribute("style", "display: none");

            document.querySelectorAll(".strong-blur").forEach(el => el.classList.remove("strong-blur"));

            // Remove the "18+" label from thumbnails
            document.querySelectorAll("div[data-testid='video-item']>a>picture>div").forEach(node => node.remove());
        }
        cleanSpankbang();

        const observer = new MutationObserver(() => cleanSpankbang());
        observer.observe(document.documentElement, { childList: true, subtree: true });
    })();

    // ============================
    // x.com (Twitter) — EXPERIMENTAL / WIP
    // ============================
    (function () {
        if (!/(^|\.)x\.com$/.test(window.location.hostname) && !/(^|\.)twitter\.com$/.test(window.location.hostname)) return;

        console.log("[x.com bypass] Running (EXPERIMENTAL - WIP, may not work)");

        const originalFetch = window.fetch;
        window.fetch = async function (...args) {
            const url = typeof args[0] === "string" ? args[0] : args[0]?.url || args[0]?.href || "";
            if (url.includes("x.com/i/api/graphql/") && url.includes("TweetResultByRestId")) {
                const response = await originalFetch.apply(this, args);
                try {
                    const data = await response.clone().json();
                    const result = data?.data?.tweetResult?.result;
                    if (result?.mediaVisibilityResults && result.tweet) {
                        data.data.tweetResult.result = { ...result.tweet };
                        data.data.tweetResult.result.__typename = "Tweet";
                        const coreUser = data.data.tweetResult.result.core?.user_results?.result;
                        if (coreUser?.profile_metadata) coreUser.profile_metadata.profile_interstitial_type = "";
                        if (data.data.tweetResult.result.legacy) data.data.tweetResult.result.legacy.possibly_sensitive = false;
                    }
                    return new Response(JSON.stringify(data), {
                        status: response.status,
                        statusText: response.statusText,
                        headers: response.headers
                    });
                } catch (e) {
                    console.error("[x.com bypass] Error:", e);
                    return response;
                }
            }
            return originalFetch.apply(this, args);
        };
    })();

})();
