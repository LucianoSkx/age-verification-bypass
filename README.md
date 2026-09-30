# Age Verification Bypass (userscript)

Port para userscript (Violentmonkey, Tampermonkey, Greasemonkey) do add-on do
Firefox [helloyanis/age-verification-bypass](https://github.com/helloyanis/age-verification-bypass),
com um engine de interceptação de `fetch`, XHR e SDKs carregados por `<script>`.

## Instalação

1. Instale o [Violentmonkey](https://violentmonkey.github.io/) (recomendado), o [Tampermonkey](https://www.tampermonkey.net/) ou o [Greasemonkey](https://www.greasespot.net/)
2. Clique em [instalar](https://raw.githubusercontent.com/LucianoSkx/age-verification-bypass/main/age-verification-bypass.user.js)
3. Confirme a instalação

> O navegador às vezes serve uma versão antiga do `.user.js` em cache. Faça um
> hard-reload antes de instalar e confira no painel do gerenciador se o código
> contém `__agebypass`. Se não contém, é cache.

## Serviços suportados

- **[AgeChecker.net](https://agechecker.net/demo)** — Bypass completo, a menos que o site faça uma double-check no servidor · **verificado**
- **[AgeGO](https://agego.com)** — Integração básica e avançada; modo servidor-a-servidor (pode falhar se o site fizer verificações adicionais) · não testado — só alcançável dentro de uma integração real do AgeGO
- **[AgeVerif.com](https://demo.ageverif.com/)** — Integração básica; os fluxos avançado e OAuth2 não são tratados · **verificado**
- **[AliExpress](https://aliexpress.com/)** — Itens "For adults" (remove blur, modal e overlays, incluindo produtos sugeridos) · **verificado** (regra de de-blur; não exercitada num listing adulto real)
- **[Bluesky](https://bsky.app)** — Posts sensíveis sem login (automod + posts autolabelados); mídia revelada ao clicar em "Show" · não testado
- **[Reddit](https://reddit.com)** — Comunidades NSFW (funciona melhor deslogado; considere o [redlib](https://redlib.catsarch.com/) para um frontend Reddit totalmente privado) · **parcialmente quebrado** — ver abaixo
- **[RedGIFs](https://www.redgifs.com/)** — Libera o bloqueio geográfico reescrevendo `api.redgifs.com/v2/geolocation` · não testado — o bloqueio é geogateado e não vem ativo do Brasil
- **[SpankBang](https://spankbang.com)** — Ver vídeos mesmo deslogado (remove blur/overlay e neutraliza o modal de verificação) · não testado
- **[Veriff](https://veriff.com)** — Funciona em poucos sites (não espere que funcione em todos) · não testado — só alcançável dentro de uma integração real do Veriff
- **[x.com / Twitter](https://x.com)** — **as regras não batem com a API atual** — ver abaixo. Originalmente mirava `TweetResultByRestId`, `TweetDetail`, `UserOriginalsTimeline` e `UserTweetsAndReplies`; exige estar logado (sincronizado com o upstream 1.3.1, ainda BETA lá)
- **[Cosxplay](https://cosxplay.com)** — Bloqueia o script de verificação de idade (`age.js`) · **verificado**
- **[AngeloGodsHack](https://angelogodshackxxx.com)** — Remove o modal de age gate · **verificado**
- **[rule34.xxx](https://rule34.xxx)** — Bloqueio geográfico — mostra uma dica de Tor Browser (sem bypass direto, igual ao upstream) · **verificado**
- **[xHamster](https://xhamster.com)** — Bloqueio geográfico — mostra uma dica de Tor Browser (sem bypass direto, igual ao upstream) · não testado — o gatilho é geogateado e não dispara de toda região

### Rótulos de status

- **verificado** — checado em um navegador real contra o serviço no ar.
- **parcialmente quebrado** — uma lacuna conhecida, descrita abaixo.
- *não testado* — coberto apenas pela suíte de testes. O caminho de código existe
  e é exercitado no CI, mas ninguém rodou contra o site real. Espere quebrar.

Um CI verde significa que o engine de interceptação é internamente consistente,
não que todo serviço listado funciona. Vários destes só são alcançáveis dentro
de uma integração real de terceiro.

### Opções

O add-on original tem um popup de configurações. Userscript não tem, então as
opções vêm de `localStorage`, no console:

```js
// Comportamento do Bluesky: 'media' (padrão) | 'none' | 'content'
localStorage.setItem('avb_bsky_blurs', 'none');
```

Só o Bluesky tem opção por enquanto — os outros serviços seguem o comportamento
fixo do upstream.

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

O que **não** está fechado: os quatro endpoints mirados (`TweetResultByRestId`,
`TweetDetail`, `UserOriginalsTimeline`, `UserTweetsAndReplies`) também não
apareceram — mas só foi observado tráfego da home. Uma página de perfil e uma
visualização de post único nunca foram visitadas com instrumentação ativa, então
essas quatro regras não têm evidência a favor nem prova de que estão mortas. Elas
ficam no lugar de propósito; apagá-las descartaria código possivelmente
funcional com base numa ausência que não consigo explicar.

Consertar o caminho da timeline exige escrever uma reescrita para
`flow/timeline.json`, o que precisa da forma real da resposta. Essa forma não pôde
ser capturada: a resposta retorna `status 200` com corpo de tamanho zero em
`readyState 4`, lido pelo descriptor nativo de `responseText`, porque o app consome
o body antes do script da página observar. Chutar nomes de campo repetiria
exatamente a classe de erro que este arquivo existe para documentar.

## Como funciona

Três métodos principais:

### Reescreve a resposta do servidor
Intercepta requisições que criariam o popup de verificação de idade e substitui por
código que envia automaticamente o callback de "verificação aprovada" para o site.
Exemplo: Bluesky.

### Trava os globals do SDK
Alguns SDKs são carregados por uma tag `<script src>` puro, que nem `fetch` nem
XHR enxergam. O script define accessors nos globals de config que esses SDKs
atribuem a si mesmos (`AgeCheckerConfig`, `AgeCheckerAPI`, `AGEGO`, `Veriff`,
`veriffSDK`, `ageverif`), então no instante em que a página entrega seus callbacks
o veredito "aceito" é devolvido na hora.

### Esconde e remove elementos do DOM
Remove popups, blurs e overlays adicionados quando uma página é marcada como
NSFW. Exemplo: AliExpress, Reddit.

**Nenhum dado é coletado.** Não há rastreamento de quais sites você visita.

## Requisitos

O script usa `@grant none` para rodar no próprio contexto JavaScript da página.
Isso é obrigatório — num userscript com sandbox, patchear `window.fetch` não tem
efeito sobre a página, e o script inteiro não faz nada em silêncio.

O custo: um elemento `<style>` comum está sujeito ao `style-src` do CSP do site, e
sujeito a remoção por páginas que apagam styles injetados (ver Reddit). O
`GM_addStyle` não sofria nenhum dos dois.

## Solução de problemas

Se nada acontece num serviço suportado, verifique se o script chegou mesmo na
página:

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
