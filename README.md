# Kurio — Marketplace de NFTs

Implementação do desafio frontend **NFT Marketplace** em React + TypeScript, com dados simulados na camada de rede (MSW) e tempo real via Socket.IO.

- **Deploy:** `https://kurio-nft-marketplace.vercel.app` 
- **Arquitetura, contratos e decisões:** [`ARCHITECTURE.md`](./ARCHITECTURE.md)

## Stack

| Responsabilidade | Tecnologia |
|      ---         |    ---     |
|    Interface     |  React 19  | 
| Linguagem        | TypeScript (strict) |
| Build            | Vite 6 |
| Roteamento       | TanStack Router (rotas em código, search params validados) |
| Estado remoto    | TanStack Query v5 |
| Cliente HTTP     | Axios (instância única com interceptors) |
| Tempo real       | socket.io-client 4 |
| Estilo           | Tailwind CSS 4 + shadcn/ui (Radix) adaptado ao Figma |
| Formulários      | react-hook-form + zod (schemas compartilhados com os mocks) |
| Precisão decimal | big.js (ETH sempre como string decimal) |
| Mocking          | MSW 2 (REST + WebSocket com protocolo Socket.IO) |
| E2E e regressão visual | Playwright |
| Auditoria        | Lighthouse CI |

## Requisitos

- Node.js **20.19+** (ou 22 LTS) e npm 10+
- Chromium do Playwright para os testes: `npx playwright install chromium`

## Setup

```bash
npm install          # também gera public/mockServiceWorker.js (config "msw.workerDirectory")
cp .env.example .env # opcional: os scripts já definem VITE_ENABLE_MOCKS
npm run dev:mocks    # http://localhost:5173 com a API simulada
```

> Se `public/mockServiceWorker.js` não existir após o install, rode `npx msw init public --save`.

### Variáveis de ambiente

|      Variável        |              Padrão                  |         Descrição       |
|        ---           |                ---                   |            ---          |
| `VITE_ENABLE_MOCKS`  | `true` em `dev:mocks` e `build:demo` | Liga a camada MSW (REST + Socket.IO). |
| `VITE_API_URL`       |                `/api`                | Base das chamadas REST. |
| `VITE_SOCKET_URL`    |      `wss://realtime.kurio.mock`     | Endereço do Socket.IO (interceptado pelo MSW). |
| `VITE_MOCK_SCENARIO` |              `default`               | Cenário inicial (ver tabela abaixo). |

## Credenciais fictícias

|       Usuário     |      E-mail      |    Senha    |
|        ---        |       ---        |     ---     |
| Ana Colecionadora | `ana@kurio.dev`  | `Kurio@123` |
| Bruno Mint        | `bruno@kurio.dev`| `Kurio@123` |

As senhas são guardadas na API simulada apenas como `SHA-256(salt + ":" + senha)`.

Cupons: `KURIO10` (10%, válido), `LANCAMENTO` (0,05 ETH, válido), `VERAO2024` (expirado). Qualquer outro código é inválido.

## Comandos

|         Comando          | O que faz |
|           ---            |    ---    |
| `npm run dev:mocks`      | Desenvolvimento com mocks |
| `npm run dev`            | Desenvolvimento sem mocks (exige uma API real em `VITE_API_URL`) |
| `npm run build:demo`     | Build otimizado **com** mocks (o mesmo usado no deploy, nos testes e no Lighthouse)           |
| `npm run build`          | Build sem mocks |
| `npm run preview`        | Serve o build em `http://localhost:4173` |
| `npm run typecheck`      | Verificação de tipos (`tsc -b`) |
| `npm run lint`           | ESLint |
| `npm run test:e2e`       | Playwright (builda e sobe o preview sozinho) |
| `npm run test:e2e:update` | Gera/atualiza as baselines de regressão visual |
| `npm run test:e2e:report` | Abre o relatório HTML (`reports/playwright`) |
| `npm run lighthouse`     | Build demo + 3 execuções por página/perfil + mediana em `reports/lighthouse/summary.md` |

## Cenários da API simulada

Selecione de três formas:

1. **Painel "Cenários"** (botão flutuante no canto inferior esquerdo da demonstração).
2. **URL:** `?scenario=<id>` em qualquer página (fica salvo e some da barra de endereço).
3. **Console:** `window.__kurio.setScenario('<id>')` e recarregue.

**Reset completo:** botão "Resetar dados" no painel, ou `window.__kurio.reset()` no console e recarregue. Restaura o seed (catálogo, usuários, carrinhos, carteiras, pedidos e flags de cenário).

|    Cenário     | Efeito |
|      ---       |   ---  |
| `default`      | Tudo funciona, latência 120–380 ms (semente fixa) |
| `fast`         | Sem latência (usado pelos testes) |
| `slow`         | Todas as respostas levam 2,5 s (skeletons) |
| `variable`     | Latência 50 ms–2 s (semente fixa) |
| `out-of-order` | Consultas do catálogo alternam 1,5 s / 100 ms (resposta antiga chega depois) |
| `offline`      | Erro de rede em toda chamada e socket recusado |
| `server-error` | `GET /api/nfts` responde 500 |
| `flaky`        | 1ª consulta do catálogo/detalhe responde 503; o retry automático recupera |
| `empty`        | Catálogo vazio |
| `favorites-fail`   | Favoritar/desfavoritar responde 500 (rollback otimista) |
| `payment-rejected` | Pedidos são recusados pela "rede" após ~2,5 s |
| `order-timeout`    | A 1ª resposta de criação de pedido demora 15 s (cliente desiste em 8 s); o retry com a mesma chave recupera o mesmo pedido |
| `price-change-at-checkout` | Na 1ª confirmação o preço sobe e a API responde 409 `QUOTE_OUTDATED` |
| `sold-out-at-checkout` | Na 1ª confirmação a edição esgota (409 `OUT_OF_STOCK`) |
| `wallet-rejected`      | A conexão de carteira é recusada |
| `short-session`        | Sessões expiram 60 s após o login |
 
## Como reproduzir os fluxos de falha

|              Fluxo              |                        Passos                           |
|               ---               |                          ---                            |
| Preço muda com item no carrinho | Adicione um NFT ao carrinho → painel → **Alterar preço**. O aviso aparece e o resumo é recalculado pela API. |
| Checkout com cotação desatualizada | No pagamento, conecte a carteira e abra a revisão → painel → **Alterar preço**. O botão "Confirmar e pagar" é bloqueado até você **Aceitar novos valores**. |
| Preço/esgotamento na confirmação | Cenário `price-change-at-checkout` ou `sold-out-at-checkout` → confirme a compra. |
| Pagamento recusado | Cenário `payment-rejected` → compre. O pedido termina "recusado" e os itens continuam no carrinho. |
| Timeout + idempotência | Cenário `order-timeout` → confirme e aguarde ~9 s. Abra `window.__kurio.snapshot().orders`: existe um único pedido. |
| Clique repetido | Clique várias vezes em "Confirmar e pagar": só um pedido é criado. |
| Queda de conexão com pedido pendente | Confirme uma compra → na tela "Aguardando confirmação" use **Derrubar socket**. Ao reconectar, o estado é reconciliado via REST. Recarregar a página também recupera o mesmo pedido. |
| Eventos duplicados/antigos | Painel → **Alterar preço**, depois **Duplicar evento** e **Evento antigo**: nada regride nem é aplicado duas vezes. |
| Sessão expirada | Logado, use **Expirar sessão** (ou cenário `short-session`) e navegue/aja: você volta ao login com aviso e retorna ao mesmo ponto; o rascunho do checkout é preservado. |
| Falha de favoritos | Cenário `favorites-fail` → favorite um NFT: marca e desmarca (rollback) com aviso. |
| Acesso não autorizado | Logado como Ana, abra `/orders/ord_bruno_0001` → 403. |
| Erro e recuperação | Cenário `server-error` → "Tentar novamente" após voltar ao `default`. |
| Conflito de cadastro | Cadastre com `ana@kurio.dev` → erro no campo. |

## Testes (Playwright)

```bash
npx playwright install chromium
npm run test:e2e:update -- visual.spec.ts   # 1ª vez: gera as baselines visuais
npm run test:e2e                            # suíte completa (desktop 1440 + mobile 390)
npm run test:e2e:report
```

- Cada teste parte de um contexto novo (storage vazio) → seed da API simulada.
- REST passa pelos handlers MSW; eventos passam pelo `socket.io-client`. Os testes só alteram o **servidor simulado** via `window.__kurio`.
- Relatório HTML em `reports/playwright`; traces, vídeo e screenshot ficam guardados nas falhas (`test-results/`).
- Baselines em `tests/__screenshots__/` (versionadas). Gere-as no mesmo SO usado na avaliação/CI, porque a renderização de fontes muda entre sistemas.

## Lighthouse

```bash
npm run lighthouse
```

Audita `/` e `/nft/emerald-ape-042` nos perfis mobile e desktop, 3 execuções cada, com o build otimizado de demonstração. Relatórios HTML/JSON ficam em `reports/lighthouse/{mobile,desktop}` e a mediana (categorias + LCP, CLS, TBT + ambiente e versões) em `reports/lighthouse/summary.md`. A configuração está em `lighthouse/`.

## Deploy (Vercel)

1. Suba o repositório no GitHub.
2. Na Vercel: **Add New → Project → Import** o repositório. O `vercel.json` já define `npm run build:demo`, a saída `dist` e o rewrite SPA (acesso direto e refresh em qualquer rota).
3. Depois do deploy, confira `https://<projeto>.vercel.app/nft/emerald-ape-042` (acesso direto) e o painel "Cenários".

## Estrutura

```
src/
  api/          contratos tipados, schemas zod, cliente Axios e endpoints
  app/          bootstrap, router, query client, efeitos de sessão
  auth/         sessão (token) e id do carrinho de visitante
  queries/      hooks TanStack Query + chaves
  realtime/     socket.io-client, guarda de eventos, aplicação no cache
  components/   ui (shadcn adaptado), layout, nft
  features/     catalog, nft, cart, checkout, orders, auth, account, misc, dev
mocks/          API simulada: db, fixtures, cenários, handlers REST, servidor Socket.IO
tests/          Playwright (E2E + visual)
lighthouse/     configuração da auditoria
```
