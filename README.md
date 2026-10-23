# Age Verification Bypass (userscript)

Remove popups e gates de verificação de idade nos serviços listados abaixo — sem
coletar dados.

Port do add-on de Firefox [helloyanis/age-verification-bypass](https://github.com/helloyanis/age-verification-bypass)
com um engine próprio de interceptação de `fetch`, XHR e SDKs carregados por
`<script>`.

## Instalação

1. **Gerenciador** — instale o [Violentmonkey](https://violentmonkey.github.io/)
   (recomendado), o [Tampermonkey](https://www.tampermonkey.net/) ou o
   [Greasemonkey](https://www.greasespot.net/).
2. **Script** — clique em [instalar](https://raw.githubusercontent.com/LucianoSkx/age-verification-bypass/main/age-verification-bypass.user.js).
3. **Confirmação** — aceite o prompt de instalação do gerenciador.

> **Cache.** O navegador às vezes serve uma versão antiga do `.user.js`. Faça um
> hard-reload antes de instalar e confira no painel se o código contém
> `__agebypass`; se não contém, é cache.

## Serviços suportados

| Serviço | O que faz | Status |
| --- | --- | --- |
| [AgeChecker.net](https://agechecker.net/demo) | Bypass completo, a menos que o site faça double-check no servidor | **verificado** |
| [AgeGO](https://agego.com) | Integração básica e avançada; modo servidor-a-servidor pode falhar se o site fizer verificações adicionais. Só em `verifycdn.`/`myapi.agego.com`; embed em terceiro não é coberto | *não testado* |
| [AgeVerif.com](https://demo.ageverif.com/) | Integração básica; fluxos avançado e OAuth2 não são tratados | **verificado** |
| [AliExpress](https://aliexpress.com/) | Itens "For adults": remove blur, modal e overlays, incluindo produtos sugeridos. A regra de de-blur não foi exercitada num listing adulto real | **verificado** |
| [AngeloGodsHack](https://angelogodshackxxx.com) | Remove o modal de age gate | **verificado** |
| [Bluesky](https://bsky.app) | Posts sensíveis sem login (automod + posts autolabelados); mídia revelada ao clicar em "Show" | *não testado* |
| [Cosxplay](https://cosxplay.com) | Bloqueia o script de verificação de idade (`age.js`) | **verificado** |
| [MeWe](https://mewe.com) | Reescreve `/api/v2/me/info` para `verificationStatus: "not_needed"` | *não testado* |
| [Reddit](https://reddit.com) | Comunidades NSFW; funciona melhor deslogado (considere o [redlib](https://redlib.catsarch.com/) para um frontend privado) — ver limitações | **parcial** |
| [RedGIFs](https://www.redgifs.com/) | Libera o bloqueio geográfico reescrevendo `api.redgifs.com/v2/geolocation`; o bloqueio não vem ativo do Brasil | *não testado* |
| [rule34.xxx](https://rule34.xxx) | Bloqueio geográfico; mostra uma dica de Tor Browser (sem bypass direto) | **verificado** |
| [SpankBang](https://spankbang.com) | Ver vídeos mesmo deslogado: remove blur/overlay e neutraliza o modal | *não testado* |
| [Veriff](https://veriff.com) | Funciona em poucos sites. Só em `veriff.com`/`veriff.me`; embed em terceiro não é coberto | *não testado* |
| [x.com / Twitter](https://x.com) | Posts sensíveis, inclusive citados e fixados; exige estar logado (recurso ainda em BETA no upstream). As regras podem não bater com a API atual — ver limitações | **parcial** |
| [xHamster](https://xhamster.com) | Bloqueio geográfico; mostra uma dica de Tor Browser (sem bypass direto); o gatilho não dispara de toda região | *não testado* |

### Rótulos de status

- **verificado** — testado num navegador real, contra o serviço no ar.
- **parcial** — funciona em parte; a lacuna está nas limitações abaixo.
- *não testado* — coberto só pela suíte de testes. O caminho de código existe e
  roda no CI, mas ninguém testou contra o site real. Espere quebrar.

CI verde significa que o engine de interceptação é internamente consistente, não
que todo serviço listado funciona. Vários só são alcançáveis dentro de uma
integração real de terceiro.

## Opções

O add-on original tem um popup de configurações. Userscript não tem, então as
opções vêm de `localStorage`, no console:

```js
// Comportamento do Bluesky: 'media' (padrão) | 'none' | 'content'
localStorage.setItem('avb_bsky_blurs', 'none');
```

Só o Bluesky tem opção por enquanto — os outros serviços seguem o comportamento
fixo do upstream.

## Como funciona

O script só atua nos hosts da lista de serviços suportados. Fora deles não
instala nada: as regras casam por URL de request, mas o engine de `fetch`/XHR
não é instalado em página sem suporte — wrapper global nesses casos é só
superfície de interferência.

### Reescreve a resposta do servidor

Intercepta a resposta que decide o gate e devolve um payload já aprovado —
`{"status":"accepted"}` no AgeChecker, `verificationStatus: "not_needed"` no
MeWe — ou desativa os blurs na config do labeler do Bluesky.

### Trava os globals do SDK

Alguns SDKs são carregados por uma tag `<script src>` pura, que nem `fetch` nem
XHR enxergam. O script define accessors nos globals de config que esses SDKs
atribuem a si mesmos (`AgeCheckerConfig`, `AgeCheckerAPI`, `AGEGO`, `Veriff`,
`veriffSDK`, `ageverif`), então no instante em que a página entrega seus
callbacks o veredito "aceito" é devolvido na hora.

### Esconde e remove elementos do DOM

Remove popups, blurs e overlays adicionados quando uma página é marcada como
NSFW. Exemplos: AliExpress, Reddit.

**Nenhum dado é coletado.** Não há rastreamento de quais sites você visita.

## Limitações conhecidas

### Reddit: styles injetados não sobrevivem

O Reddit apaga elementos `<style>` que ele não criou. Um `<style>` injetado por
este script some em segundos.

Não é um problema de CSP: a política do Reddit é
`style-src 'self' 'unsafe-inline' www.redditstatic.com ...`, que permite styles
injetados. A remoção é ativa.

Isso quebra a regra `.rpl-scroll-lock { overflow: auto !important; }`, que é como
o scroll travado é vencido. Como a 1.7.9 usava `GM_addStyle`, que o gerenciador
aplica fora do DOM da página, isso é uma regressão.

Re-adicionar o style em loop não é solução: trava a aba. O script para de
responder a execução por completo, e até um script de limpeza estoura timeout.
Não tente.

### Reddit: conta logada cai no gate Persona

Com a conta logada, o Reddit redireciona o site inteiro para `/age/provide` —
inclusive `old.reddit.com`, `/r/all.json` e `/api/me.json`. A página embute o
Persona (`inquiry.withpersona.com`), e a conclusão é validada no servidor:
chamar a URL de `verification-completed` sem um inquiry concluído devolve
`Internal Server Error: failed to determine Persona environment`.

Não há bypass client-side para esse gate. Para conteúdo NSFW, use uma sessão
deslogada ou janela privada — o script cobre os popups desse estado. O upstream
documenta o mesmo limite na wiki do Reddit (issue #16: "A bypass is highly
unlikely").

### x.com: as regras miram uma API que o app não usa mais

As regras casam por substring de URL, então o transporte (fetch ou XHR) não
importa — o nome do endpoint importa. Observado numa sessão logada no x.com, com
o script instalado e seus hooks confirmados vivos (`fetchOurs`, `xhrOurs`):

```
XHR  https://x.com/i/api/1.1/flow/timeline.json          <- a timeline do home
XHR  https://x.com/i/api/1.1/friends/following/list.json
XHR  https://x.com/i/api/graphql/viewer_context.json
XHR  https://x.com/i/api/graphql/q4Npr1.../ViewerBadgeCounts
XHR  https://x.com/i/api/fleets/v1/avatar_content
```

Nenhum tráfego de API passa por `fetch`. A timeline do home é servida por
`/i/api/1.1/flow/timeline.json`, que nenhuma regra cobre, então nada é
desblurado ali. Essa parte está fechada.

O que **não** está fechado: os oito endpoints mirados (`TweetResultByRestId`,
`TweetDetail`, `SearchTimeline`, `HomeTimeline`, `HomeLatestTimeline`,
`Bookmarks`, `UserOriginalsTimeline`, `UserTweetsAndReplies`) também não
apareceram — mas só foi observado tráfego da home. Páginas de perfil, busca e
post único nunca foram visitadas com instrumentação ativa, então essas regras
não têm evidência a favor nem prova de que estão mortas. Elas ficam no lugar de
propósito; apagá-las descartaria código possivelmente funcional com base numa
ausência que não consigo explicar.

Consertar o caminho da timeline exige escrever uma reescrita para
`flow/timeline.json`, o que precisa da forma real da resposta. Essa forma não pôde
ser capturada: a resposta retorna `status 200` com corpo de tamanho zero em
`readyState 4`, lido pelo descriptor nativo de `responseText`, porque o app consome
o body antes do script da página observar. Chutar nomes de campo repetiria
exatamente a classe de erro que este arquivo existe para documentar.

### ageverification.org: o upstream cancela um `<script src>`

O upstream 1.3.5 cobre ageverification.org cancelando a requisição de
`/inject/script.min.js` no `webRequest`. O código de embed é literalmente
`<script src="https://www.ageverification.org/inject/script.min.js">`, e
requisição de `<script src>` não passa por `fetch`/XHR. Userscript não tem
`webRequest`, então não há equivalente com `@grant none`. A regra não foi
portada para não repetir o caso do `checker.js` do AgeVerif (código que nunca
dispara).

## Requisitos

O script usa `@grant none` para rodar no próprio contexto JavaScript da página.
Isso é obrigatório — num userscript com sandbox, patchear `window.fetch` não tem
efeito sobre a página, e o script inteiro não faz nada em silêncio.

O custo: um elemento `<style>` comum está sujeito ao `style-src` do CSP do site, e
sujeito a remoção por páginas que apagam styles injetados (ver Reddit). O
`GM_addStyle` não sofria nenhum dos dois.

## Solução de problemas

Se nada acontece num serviço suportado, verifique se o script chegou mesmo na
página. Num site fora da lista de suportados, o script não faz nada por
design — o gate de host devolve a execução antes de instalar qualquer coisa:

1. Abra o site e o console do navegador.
2. Rode `typeof AgeCheckerAPI` numa página do AgeChecker.net.
3. `undefined` significa que o script não chegou no mundo da página. Normalmente o
   gerenciador recusou a injeção em MAIN_WORLD por causa do CSP do site. Tente
   outro gerenciador, ou reporte com o site e a saída do console.

## Atualizações

O script checa por atualizações automaticamente via `@updateURL`/`@downloadURL`
apontando para este repositório.

## Créditos

- Original: [helloyanis](https://github.com/helloyanis) — [add-on do Firefox](https://github.com/helloyanis/age-verification-bypass)
- Engine de interceptação: [xtalia](https://github.com/xtalia/age-verification-bypass) / Hermes Agent
- Port e correções: [LucianoSkx](https://github.com/LucianoSkx)

## Licença

[MIT](LICENSE)

Se você copiar o engine de interceptação para outro projeto, a linha do xtalia
precisa acompanhar.
