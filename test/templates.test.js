'use strict';

/*
 * Suíte de testes do Age Verification Bypass v2.x.
 *
 * Cobre três camadas:
 *   1. estática  — o distribuível faz parse e tem metadata válido
 *   2. cobertura — todo serviço suportado continua conectado
 *   3. runtime   — o engine de interceptação roda de fato: o wrapper de fetch
 *      reescreve uma response que casa e não toca no resto, e os traps de
 *      global dos SDKs via <script> disparam o callback "accepted".
 *
 * A camada de runtime executa o userscript num ambiente de página stubbado
 * via node:vm, então o CI não precisa de navegador.
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

// ------------------------------------------------------------- estática ---

const sources = new Map();
DIST.forEach((file) => {
    const rel = path.relative(ROOT, file).replace(/\\/g, '/');
    check(`${rel} existe`, () => {
        assert(fs.existsSync(file), 'arquivo ausente');
    });
    if (!fs.existsSync(file)) return;
    const src = fs.readFileSync(file, 'utf8');
    sources.set(rel, src);

    check(`${rel} faz parse como JavaScript válido`, () => {
        new Function(src);
    });

    check(`${rel} tem um bloco de metadata completo`, () => {
        for (const tag of ['@name', '@namespace', '@version', '@match', '@run-at', '@grant', '@license']) {
            assert(new RegExp('^//\\s*' + tag + '\\b', 'm').test(src), `falta ${tag}`);
        }
        assert(/^\/\/\s*@version\s+2\.\d+\.\d+/m.test(src), 'a versão tem que ser 2.x');
        assert(/^\/\/\s*@run-at\s+document-start/m.test(src), '@run-at tem que ser document-start');
        assert(/^\/\/\s*@grant\s+none/m.test(src), '@grant none nos mantém no mundo da página');
    });

    check(`${rel} aponta as atualizações para este repo`, () => {
        assert(src.includes('@updateURL    ' + RAW), 'updateURL tem que apontar para o fork');
        assert(src.includes('@downloadURL  ' + RAW), 'downloadURL tem que apontar para o fork');
    });

    check(`${rel} credita o upstream e quem melhorou`, () => {
        assert(/@author\s+.*helloyanis/.test(src), 'falta o autor original');
        assert(/@author\s+.*LucianoSkx/.test(src), 'falta o autor do port');
        assert(/Hermes Agent|Nous Research/i.test(src), 'falta o crédito de quem melhorou');
    });

    check(`${rel} não usa APIs GM_*, que exigem sandbox`, () => {
        assert(!/GM_addStyle\s*\(|GM_cookie\s*\(|GM_setValue\s*\(/.test(src),
            'GM_* exige grant e quebra a injeção no mundo da página');
    });
});

// ------------------------------------------------------------ cobertura ---

const SERVICES = [
    ['agechecker.net', /\(\^\|\\\.\)agechecker\\\.net\$/],
    ['agego.com', /verifycdn\|myapi/],
    ['ageverif.com', /ageverif\\\.com/],
    ['veriff', /veriff\\\.\(me\|com\)/],
    ['aliexpress', /aliexpress/],
    ['bsky', /bsky/],
    ['reddit', /reddit/],
    ['redgifs', /redgifs/],
    ['spankbang', /spankbang/],
    ['x.com', /x\\\.com/],
    ['cosxplay', /cosxplay/],
    ['angelogodshackxxx', /angelogodshackxxx/],
    ['rule34.xxx', /rule34/],
    ['xhamster', /xhamster/],
];

for (const [rel, src] of sources) {
    check(`${rel} ainda cobre os ${SERVICES.length} serviços`, () => {
        const missing = SERVICES.filter(([, re]) => !re.test(src)).map(([n]) => n);
        assert(missing.length === 0, 'faltando: ' + missing.join(', '));
    });

    check(`${rel} mantém o engine de interceptação completo`, () => {
        for (const fn of ['installFetch', 'installXHR', 'patchInstance', 'trapGlobal', 'ruleFor', 'withBody']) {
            assert(new RegExp('function ' + fn + '\\b').test(src), `missing engine function ${fn}`);
        }
        assert(src.indexOf("headers.delete('content-length')") !== -1, 'falta a limpeza de header da response');
        assert(src.indexOf("headers.delete('content-encoding')") !== -1, 'falta a limpeza de header da response');
    });

    // Regressões que existiam no 1.x e no rascunho 2.0.0 do upstream.
    check(`${rel} não apaga as thumbnails do spankbang`, () => {
        assert(!/data-testid='video-item'>a>picture>div/.test(src), 'remove as thumbnails de vídeo de novo');
    });

    check(`${rel} não tem interval de polling`, () => {
        assert(!/setInterval\s*\(/.test(src), 'setInterval é redundante com o MutationObserver');
    });

    check(`${rel} ancora o match de host do aliexpress`, () => {
        assert(!/\(\^\|\\\.\)aliexpress\\\.(?!\[)/.test(src), 'a regex do aliexpress tem que ter âncora no final');
    });

    check(`${rel} sobrevive a corpo ilegível sem rejeitar`, () => {
        assert(/resp\.clone\(\)\.text\(\)\.then\([^]*?\)\.catch\(/.test(src),
            'installFetch precisa de um .catch depois da leitura do corpo');
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
    // XHR suficiente para o teste: o patchInstance do engine precisa de accessors
    // no prototype para responseText e response, não de propriedades de dados.
    class XHR {
        constructor() {
            this.readyState = 0;
            this.responseType = '';
            this.payload = '';
            this.responseURL = '';
        }
        open(url) { this.readyState = 1; if (url) this.responseURL = String(url); }
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

    const timers = [];
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
            localStorage: {
                _v: {},
                getItem(k) { return Object.prototype.hasOwnProperty.call(this._v, k) ? this._v[k] : null; },
                setItem(k, v) { this._v[k] = String(v); },
            },
            // Registrado em vez de agendado, para o teste poder disparar os
            // ticks de re-arm.
            __timers: timers,
        },
        document: doc,
        console: { log() {}, warn() {}, error() {}, debug() {} },
        setTimeout(fn, ms) { timers.push(fn); return timers.length; },
        clearTimeout() {},
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
    // remove o bloco de metadata: fica tudo depois do marcador de fechamento.
    // (String.split(sep, 1) recorta o array, NÃO faz maxsplit como no Python.)
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

    runRuntime('o engine instala um wrapper de fetch em host que casa', 'agechecker.net', (s) => {
        assert(typeof s.window.fetch === 'function', 'o fetch sumiu');
        assert(s.window.fetch !== s.window.__originalFetch, 'o fetch não foi patcheado');
        assert(String(s.window.fetch).indexOf('ruleFor') !== -1, 'o corpo do wrapper não está presente');
    });

    runRuntime('o engine embrulha open/send de XHR em host que casa', 'agechecker.net', (s) => {
        const proto = s.window.XMLHttpRequest.prototype;
        assert(String(proto.open).indexOf('__agebypass') !== -1, 'open não foi hooked');
        assert(String(proto.send).indexOf('patchInstance') !== -1, 'send não foi hooked');
    });

    runRuntime('o trap de config dispara o callback "accepted" na atribuição', 'agechecker.net', (s) => {
        let captured = null;
        s.window.AgeCheckerConfig = {
            onstatuschanged: (v) => { captured = v; },
            redirect_url: '',
        };
        assert(captured !== null, 'onstatuschanged nunca disparou');
        assert(captured.status === 'accepted', 'o status tem que ser accepted, veio ' + captured.status);
    });

    runRuntime('globais de SDK via script-tag são servidos por stubs', 'agechecker.net', (s) => {
        assert(typeof s.window.AgeCheckerAPI.show === 'function', 'falta o stub de AgeCheckerAPI');
        assert(typeof s.window.AgeCheckerAPI.close === 'function', 'falta o stub de AgeCheckerAPI.close');
    });

    // NOTA: installFetch embrulha window.fetch em todo host; o que decide se um
    // corpo é tocado é a tabela de regras. Então "não patcheado" é a asserção
    // errada — a fidelidade do pass-through é verificada de forma assíncrona
    // mais abaixo.
    // O SDK do ageverif chega por <script src>, que ignora o fetch por completo.
    // O trap precisa sombrear, não só observar.
    runRuntime('o ageverif sombreia o global do SDK', 'ageverif.com', (s) => {
        const realSdk = { _decodeJwt: () => {}, _emitter: {}, _ready: false, verified: false };
        s.window.ageverif = realSdk;
        const seen = s.window.ageverif;
        assert(seen !== realSdk, 'o SDK real continua acessível, o trap só observou');
        assert(seen.verified === true, 'verified tem que ler true');
        assert(seen.requiresVerification === false, 'requiresVerification tem que ler false');
        assert(seen._ready === true && seen._successful === true, 'as flags de estado têm que ler true');
        assert(typeof seen.blur === 'function' && typeof seen.unblur === 'function', 'falta a API de blur');
        assert(seen.verification && seen.verification.token, 'falta o payload de verification');
        assert(s.window.AgeCheckerAPI === undefined, 'os traps do agechecker não podem vazar para este host');
    });

    runRuntime('o stub do ageverif dispara os listeners do site no start', 'ageverif.com', (s) => {
        s.window.ageverif = { _decodeJwt: () => {} };
        const got = [];
        s.window.ageverif.on('success', (p) => got.push(p && p.status));
        s.window.ageverif.start();
        assert(got.join(',') === 'success', 'start() tem que emitir success, veio: ' + JSON.stringify(got));
    });

    // Medido no bsky.app: o app reatribui XMLHttpRequest.prototype.open depois do
    // document-start, sobrescrevendo nosso hook. A interceptação tem que sobreviver.
    runRuntime('XHR sobrevive a prototype.open sobrescrito', 'agechecker.net', (s) => {
        const proto = s.window.XMLHttpRequest.prototype;
        // Wrapper de biblioteca: não é mais o nosso hook, mas se comporta como
        // o nativo, então responseURL é populado igual o navegador faria.
        proto.open = function (method, url) { this.readyState = 1; this.responseURL = String(url); };
        const xhr = new s.window.XMLHttpRequest();
        xhr.responseType = 'json';
        xhr.open('POST', 'https://api.agechecker.net/v1/create');
        xhr.payload = '{"original":true}';
        xhr.send();
        assert(xhr.__agebypass_url === undefined, 'open não deve mais ser o nosso hook');
        const data = xhr.response;
        assert(data && data.status === 'accepted',
            'a reescrita tem que cair em responseURL, veio ' + JSON.stringify(data));
    });

    // Medido no reddit.com: a página reatribuiu window.fetch para a função nativa
    // depois do document-start, desarmando em silêncio toda regra de fetch.
    runRuntime('a interceptação de fetch sobrevive à página trocando window.fetch', 'agechecker.net', (s) => {
        const ours = s.window.fetch;
        s.window.fetch = function () { return Promise.resolve(new Response('{}')); };
        assert(!/ruleFor/.test(String(s.window.fetch)), 'pré-condição: o fetch não é o nosso');
        s.window.__timers.forEach((fn) => fn());
        assert(s.window.fetch !== ours && /ruleFor/.test(String(s.window.fetch)),
            'o re-arm tem que re-embrulhar o fetch trocado');
    });

    runRuntime('o re-arm não empilha wrappers', 'agechecker.net', (s) => {
        const first = s.window.fetch;
        s.window.__timers.forEach((fn) => fn());
        assert(s.window.fetch === first, 're-armar o nosso próprio wrapper tem que ser no-op');
    });

    runRuntime('hosts que não casam não registram regra de reescrita', 'example.com', (s) => {
        let called = 0;
        s.window.fetch('https://example.com/api/data').then(() => { called++; });
        assert(called === 0, 'o fetch tem que continuar assíncrono');
    });
}

// ---------------------------------------------------------- assíncrono ---

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

    await runtimeAsync('reescreve api.agechecker.net/v1/create para accepted', async (s) => {
        const resp = await s.window.fetch('https://api.agechecker.net/v1/create', { method: 'POST' });
        const text = await resp.text();
        const data = JSON.parse(text);
        assert(data.status === 'accepted', 'expected accepted, got ' + text);
        assert(typeof data.uuid === 'string' && data.uuid.length > 0, 'falta o uuid');
    });

    await runtimeAsync('deixa responses sem relação byte a byte idênticas', async (s) => {
        const resp = await s.window.fetch('https://example.com/api/data');
        const text = await resp.text();
        assert(text === '{"original":true}', 'o corpo foi tocado: ' + text);
    });

    // Num host sem regra, o wrapper tem que devolver a *mesma* Response que recebeu.
    await (function () {
        return new Promise((resolve) => {
            const ORIG = new Response('{"original":true}', { status: 200, headers: { 'content-type': 'application/json' } });
            const originalFetch = async () => ORIG;
            const sandbox = makeSandbox('example.com', originalFetch);
            loadScript(sandbox, rootSrc);
            sandbox.window
                .fetch('https://example.com/api/data')
                .then((resp) => {
                    assert(resp === ORIG, 'a response sem relação tem que passar por identidade');
                    passed++;
                    console.log('OK   hosts sem relação passam a Response original adiante');
                })
                .catch((e) => { failures++; console.log('FAIL hosts sem relação passam a Response original adiante -', e.message); })
                .then(resolve);
        });
    })();

    // Uma regra que casa, cujo corpo não pode ser lido, tem que degradar para a
    // response original, não rejeitar: senão quem chama veria um request falho.
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
                    assert(resp === UNREADABLE, 'tem que cair na response original');
                    passed++;
                    console.log('OK   corpo ilegível cai na response original');
                })
                .catch((e) => { failures++; console.log('FAIL corpo ilegível cai na response original -', e.message); })
                .then(resolve);
        });
    })();

    // XHR com responseType 'json': o browser já fez o parse, as regras são texto.
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
                        'XHR json não foi reescrito, veio ' + JSON.stringify(data));
                    assert(typeof data.uuid === 'string' && data.uuid.length > 0, 'falta o uuid');
                    passed++;
                    console.log('OK   XHR responseType=json é reescrito');
                })
                .catch((e) => { failures++; console.log('FAIL XHR responseType=json é reescrito -', e.message); })
                .then(resolve);
        });
    })();

    // Payload real de api.redgifs.com/v2/geolocation, capturado na pagina ao vivo:
    // {"blocked":false,"country":"BR","state":null}. Do Brasil `blocked` ja vem
    // false, entao o caso que importa e o true.
    await (function () {
        return new Promise((resolve) => {
            const originalFetch = async () => new Response(
                '{"blocked":true,"country":"XX","state":null}',
                { status: 200, headers: { 'content-type': 'application/json' } });
            const sandbox = makeSandbox('www.redgifs.com', originalFetch);
            loadScript(sandbox, rootSrc);
            sandbox.window
                .fetch('https://api.redgifs.com/v2/geolocation')
                .then((resp) => resp.json())
                .then((data) => {
                    assert(data.blocked === false, 'blocked tem que virar false, veio ' + JSON.stringify(data));
                    assert(data.country === 'XX', 'o resto do payload tem que ficar intacto');
                    passed++;
                    console.log('OK   redgifs desbloqueia o geolocation');
                })
                .catch((e) => { failures++; console.log('FAIL redgifs desbloqueia o geolocation -', e.message); })
                .then(resolve);
        });
    })();

    // O upstream 1.3.1 tornou o comportamento do bsky configuravel. Sem popup de
    // add-on, a opcao vem de localStorage. O default tem que continuar 'media'.
    await (function () {
        return new Promise((resolve) => {
            const payload = JSON.stringify({
                views: [{ policies: { labelValueDefinitions: [], labelValues: ['porn'] } }],
            });
            const originalFetch = async () => new Response(
                payload, { status: 200, headers: { 'content-type': 'application/json' } });
            const sandbox = makeSandbox('bsky.app', originalFetch);
            loadScript(sandbox, rootSrc);
            const url = 'https://public.api.bsky.app/xrpc/app.bsky.labeler.getServices';
            sandbox.window.fetch(url).then((r) => r.json()).then((d) => {
                assert(d.views[0].policies.labelValueDefinitions[0].blurs === 'media',
                    'o default tem que ser media, veio ' + JSON.stringify(d.views[0].policies.labelValueDefinitions[0]));
                sandbox.window.localStorage.setItem('avb_bsky_blurs', 'none');
                return sandbox.window.fetch(url);
            }).then((r) => r.json()).then((d) => {
                assert(d.views[0].policies.labelValueDefinitions[0].blurs === 'none',
                    'localStorage tem que sobrescrever, veio ' + JSON.stringify(d.views[0].policies.labelValueDefinitions[0]));
                passed++;
                console.log('OK   bsky lê blurs do localStorage, com default media');
            }).catch((e) => { failures++; console.log('FAIL bsky lê blurs do localStorage, com default media -', e.message); })
                .then(resolve);
        });
    })();

    console.log('---');
    console.log(`${passed} passed, ${failures} failed`);
    process.exit(failures ? 1 : 0);
}

asyncChecks();
