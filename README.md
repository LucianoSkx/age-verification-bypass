# Age Verification Bypass (Userscript)

Port do add-on Firefox [helloyanis/age-verification-bypass](https://github.com/helloyanis/age-verification-bypass) para userscript (Violentmonkey, Tampermonkey, Greasemonkey).

## Como instalar

1. Instale [Violentmonkey](https://violentmonkey.github.io/) (recomendado), [Tampermonkey](https://www.tampermonkey.net/) ou [Greasemonkey](https://www.greasespot.net/)
2. Clique em [instalar](https://raw.githubusercontent.com/LucianoSkx/age-verification-bypass/main/age-verification-bypass.user.js)
3. Confirme a instalação

## Serviços suportados

- **[AgeChecker.net](https://agechecker.net/demo)** — Bypass completo (exceto se o site faz double-check no servidor)
- **[AgeGO](https://agego.com)** — Integração básica + avançada; modo server-to-server (pode falhar se o site faz checks adicionais)
- **[AgeVerif.com](https://demo.ageverif.com/)** — Integração básica e avançada (não funciona no fluxo oAuth2)
- **[AliExpress](https://aliexpress.com/)** — Itens "For adults" (remove blur/modal)
- **[Bluesky](https://bsky.app)** — Posts sensíveis sem login; mídia revelada ao clicar em "Show"
- **[Reddit](https://reddit.com)** — Comunidades NSFW (funciona melhor deslogado; recomenda-se [redlib](https://redlib.catsarch.com/))
- **[Veriff](https://veriff.com)** — Funciona apenas em alguns sites (não espere que funcione sempre)

## Como funciona

Dois métodos principais:

### Reescrita de resposta do servidor
Intercepta requisições que criariam o popup de verificação e substitui por código que envia automaticamente o callback de "verificação aprovada" ao site. Ex: Bluesky.

### Remoção de elementos DOM
Remove popups, blurs e overlays adicionados quando a página é marcada como NSFW. Ex: AliExpress, Reddit.

**Nenhum dado é coletado**. Não há rastreamento de quais sites você visita.

## Atualizações

O script verifica atualizações automaticamente via `@updateURL`/`@downloadURL` apontando para este repositório.

## Créditos

- Original: [helloyanis](https://github.com/helloyanis) — [Firefox add-on](https://github.com/helloyanis/age-verification-bypass)
- Port: [LucianoSkx](https://github.com/LucianoSkx)

## Licença

MIT